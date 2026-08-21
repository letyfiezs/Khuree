# Хүрээ Streaming Platform

Production-oriented Mongolian streaming starter built with Next.js 16, TypeScript, Tailwind CSS 4, Shaka Player, and a Sites/Vercel-compatible architecture.

## Included

- Premium responsive black/red customer UI
- Homepage, dynamic movie detail, and watch routes
- Series-ready typed content model
- Shaka Player shell for DASH/HLS and Widevine integration
- Protected admin dashboard and Movies CRUD foundation
- Supabase adapter seam and environment contract
- Fictional demo content only

## Local development

Copy `.env.example` to `.env.local`, run `npm install`, then `npm run dev`. The local Sites runtime supplies a demo signed-in user for `/admin`.

## Streaming security

No browser player can make playback mathematically impossible to download. Use encrypted DASH/HLS, short-lived signed manifest and segment URLs, server-side authorization, forensic watermarking, and DRM license delivery (Widevine, FairPlay, PlayReady). Never ship permanent MP4 URLs or signing secrets to the client.

## Production integration

Replace `lib/content.ts` with server-only Supabase queries and connect `@supabase/ssr` at `lib/supabase.ts`. Keep service-role keys server-side, validate admin roles on every mutation, and use private object storage with signed upload/playback URLs.

Run `npm run build` for a production build. The project is OpenAI Sites ready through `.openai/hosting.json` and Vercel ready after choosing and configuring production authentication.
