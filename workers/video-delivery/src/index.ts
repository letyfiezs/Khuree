interface Env {
  VIDEOS: R2Bucket;
  VIDEO_EDGE_SECRET: string;
}

const allowedOrigins = new Set(["https://huree.site", "https://www.huree.site"]);
const encoder = new TextEncoder();

function cors(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return allowedOrigins.has(origin) ? origin : "https://huree.site";
}

function base64Url(bytes: ArrayBuffer) {
  let value = "";
  for (const byte of new Uint8Array(bytes)) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function sameValue(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

function appendAuthorization(line: string, query: string) {
  if (!line || line.startsWith("#")) {
    return line.replace(/URI="([^"]+)"/, (_, uri: string) => `URI="${uri}${uri.includes("?") ? "&" : "?"}${query}"`);
  }
  return `${line}${line.includes("?") ? "&" : "?"}${query}`;
}

function contentType(path: string) {
  if (path.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (path.endsWith(".ts")) return "video/mp2t";
  if (path.endsWith(".m4s")) return "video/iso.segment";
  if (path.endsWith(".key") || path.endsWith(".bin")) return "application/octet-stream";
  return "application/octet-stream";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = cors(request);
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, PUT, DELETE",
      "Access-Control-Allow-Headers": "Range, Content-Type, X-Khuree-Internal-Secret",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (url.pathname === "/health") return Response.json({ ok: true });

    if (url.pathname.startsWith("/internal/hls/") && ["PUT", "HEAD", "DELETE"].includes(request.method)) {
      if (!sameValue(request.headers.get("x-khuree-internal-secret") ?? "", env.VIDEO_EDGE_SECRET)) return new Response("Unauthorized", { status: 401 });
      const objectKey = url.pathname.slice("/internal/".length);
      if (!/^hls\/[0-9a-f-]{36}\/[a-zA-Z0-9._-]+$/.test(objectKey)) return new Response("Bad request", { status: 400 });
      if (request.method === "HEAD") return new Response(null, { status: await env.VIDEOS.head(objectKey) ? 200 : 404 });
      if (request.method === "DELETE") { await env.VIDEOS.delete(objectKey); return new Response(null, { status: 204 }); }
      if (!request.body) return new Response("Bad request", { status: 400 });
      await env.VIDEOS.put(objectKey, request.body, { httpMetadata: { contentType: request.headers.get("content-type") ?? contentType(objectKey) } });
      return Response.json({ ok: true });
    }

    const match = url.pathname.match(/^\/stream\/([0-9a-f-]{36})\/([a-zA-Z0-9._-]+)$/i);
    if (!match || !["GET", "HEAD"].includes(request.method)) return new Response("Not found", { status: 404 });
    const [, assetId, filename] = match;
    const userId = url.searchParams.get("u") ?? "";
    const expires = Number(url.searchParams.get("e"));
    const signature = url.searchParams.get("s") ?? "";
    const now = Math.floor(Date.now() / 1000);
    if (!userId || !Number.isSafeInteger(expires) || expires < now || expires > now + 12 * 60 * 60) return new Response("Expired", { status: 403, headers: corsHeaders });
    const expected = await sign(env.VIDEO_EDGE_SECRET, `${userId}:${assetId}:${expires}`);
    if (!sameValue(signature, expected)) return new Response("Forbidden", { status: 403, headers: corsHeaders });

    const object = await env.VIDEOS.get(`hls/${assetId}/${filename}`, { range: request.headers });
    if (!object) return new Response("Not found", { status: 404, headers: corsHeaders });
    const headers = new Headers(corsHeaders);
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", contentType(filename));
    headers.set("Accept-Ranges", "bytes");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", filename.endsWith(".m3u8") || filename === "key.bin" ? "private, no-store" : "private, max-age=3600");
    if (request.method === "HEAD") return new Response(null, { headers });
    if (filename.endsWith(".m3u8")) {
      const query = new URLSearchParams({ u: userId, e: String(expires), s: signature }).toString();
      const playlist = (await object.text()).split("\n").map((line) => appendAuthorization(line, query)).join("\n");
      return new Response(playlist, { headers });
    }
    return new Response(object.body, { status: request.headers.has("range") ? 206 : 200, headers });
  },
} satisfies ExportedHandler<Env>;
