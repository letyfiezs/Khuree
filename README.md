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

Run `npm install`, then `npm run dev`. Uploaded source videos are written to `storage/videos/`; movie, user, verification, and session records live in `storage/khuree.db`. Both survive restarts and are ignored by Git.

1. Open `http://localhost:3000/signup`.
2. Register with the email configured as `ADMIN_EMAIL` to create the first admin account; every other email receives the regular user role.
3. Verify the email. With SMTP configured the link arrives in the inbox. Without SMTP, the local test link is written to `storage/mail-preview/latest-verification.txt`.
4. Sign in and open `/admin/movies` to upload. Completed local uploads are immediately marked `published` and appear under `/movies`.

For Gmail SMTP, set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS` (an App Password), and `MAIL_FROM` in `.env.local`. Never commit these credentials.

## Streaming security

No browser player can make playback mathematically impossible to download. Use encrypted DASH/HLS, short-lived signed manifest and segment URLs, server-side authorization, forensic watermarking, and DRM license delivery (Widevine, FairPlay, PlayReady). Never ship permanent MP4 URLs or signing secrets to the client.

## Production integration

Demo catalog data lives in `lib/content.ts`. The storage boundary lives in `lib/storage/`: `local.ts` is active during PC testing, while `supabase-adapter.ts` preserves the interface for a later Supabase Database + Storage implementation. Uploads use 8 MB chunks so large source files do not sit in browser memory. Local files are published immediately; a future production adapter can insert a transcoding step for encrypted HLS/DASH.

Run `npm run build` for the local/Node production build. `npm run build:sites` remains available for the hosted Workers variant after switching the storage adapter back to D1/R2 or Supabase HTTP APIs.
