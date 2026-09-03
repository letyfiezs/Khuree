import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Хүрээ — Монгол кино",
    short_name: "Хүрээ",
    description: "Монгол кино, олон ангит контентыг нэг дороос үзэх платформ.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#070707",
    theme_color: "#070707",
    orientation: "any",
    prefer_related_applications: false,
    icons: [
      { src: "/pwa/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { src: "/pwa/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
      { src: "/pwa/icon-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
