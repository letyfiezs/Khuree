# Хүрээ Streaming Platform

Production-oriented Mongolian streaming starter built with Next.js 16, TypeScript, Tailwind CSS 4, Shaka Player, and a Sites/Vercel-compatible architecture.

## Included

- Premium responsive black/red customer UI
- Homepage, dynamic movie detail, and watch routes
- Series-ready typed content model
- Shaka Player shell for DASH/HLS and Widevine integration
- Protected admin dashboard with authenticated multipart movie uploads
- D1 metadata and private R2 video storage bindings
- Fictional demo content only

## Local development

Run `npm install`, then `npm run dev`. The included `.env.local` enables a development-only local admin. Uploaded source videos are written to `storage/videos/` and movie metadata to `storage/khuree.db`; both survive restarts and are ignored by Git. Open `http://localhost:3000/admin/movies` to upload. Use `npm run dev:sites` only when testing the hosted Cloudflare bindings.

## Streaming security

No browser player can make playback mathematically impossible to download. Use encrypted DASH/HLS, short-lived signed manifest and segment URLs, server-side authorization, forensic watermarking, and DRM license delivery (Widevine, FairPlay, PlayReady). Never ship permanent MP4 URLs or signing secrets to the client.

## Production integration

Demo catalog data lives in `lib/content.ts`. The storage boundary lives in `lib/storage/`: `local.ts` is active during PC testing, while `supabase-adapter.ts` preserves the interface for a later Supabase Database + Storage implementation. Uploads use 8 MB chunks so large source files do not sit in browser memory. A future transcoding worker should consume `processing` records and produce encrypted HLS/DASH before publishing.

Run `npm run build` for the local/Node production build. `npm run build:sites` remains available for the hosted Workers variant after switching the storage adapter back to D1/R2 or Supabase HTTP APIs.
