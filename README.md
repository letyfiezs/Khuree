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

## QPay төлбөр

`/subscribe` хуудас QPay Merchant V2-оор VIP нэхэмжлэх үүсгэнэ. Төлбөрийг зөвхөн QPay callback ирсний дараа QPay API-аар дахин шалгаж, төлсөн дүн тохирсон үед хэрэглэгчийн VIP хугацааг сунгана. Нэхэмжлэх болон эрхийн хугацаа `storage/khuree.db`-д хадгалагдана.

1. QPay Merchant байгууллагын эрхээс `username`, `password`, `invoice code` авна.
2. `.env.example`-ийг дагаж `QPAY_*` утгуудыг `.env.local`-д оруулна.
3. Sandbox туршилтад `QPAY_BASE_URL=https://merchant-sandbox.qpay.mn` ашиглана.
4. `QPAY_CALLBACK_URL` нь QPay серверээс нэвтрэх боломжтой HTTPS URL байх ёстой. `localhost` callback-ийг production болон алсын sandbox сервер дуудаж чадахгүй.
5. Production-д QPay-аас зөвшөөрөл авсны дараа base URL-ийг `https://merchant.qpay.mn` болгон солино.

QPay нууц утгууд зөвхөн сервер талд ашиглагддаг бөгөөд browser руу дамжихгүй. Одоо байгаа контент автоматаар түгжигдээгүй; `subscriptions` хүснэгтийн идэвхтэй эрхийг контентын entitlement дүрэмтэй дараагийн шатанд холбоно.

## Streaming security

No browser player can make playback mathematically impossible to download. Use encrypted DASH/HLS, short-lived signed manifest and segment URLs, server-side authorization, forensic watermarking, and DRM license delivery (Widevine, FairPlay, PlayReady). Never ship permanent MP4 URLs or signing secrets to the client.

The player is multi-DRM ready through `NEXT_PUBLIC_WIDEVINE_LICENSE_URL`, `NEXT_PUBLIC_PLAYREADY_LICENSE_URL`, and `NEXT_PUBLIC_FAIRPLAY_LICENSE_URL`. These must point to an authenticated license proxy that applies entitlement, concurrency, expiry, and device rules. Clear MP4 uploads are not DRM protected: package source media as CENC/CBCS encrypted DASH/HLS with Shaka Packager or a managed encoding/DRM provider before publishing. A `controlsList="nodownload"` attribute or hidden URL is only a UI deterrent and must not be presented as DRM.

## Production integration

Demo catalog data lives in `lib/content.ts`. The storage boundary lives in `lib/storage/`: `local.ts` is active during PC testing, while `supabase-adapter.ts` preserves the interface for a later Supabase Database + Storage implementation. Uploads use 8 MB chunks so large source files do not sit in browser memory. Local files are published immediately; a future production adapter can insert a transcoding step for encrypted HLS/DASH.

Run `npm run build` for the local/Node production build. `npm run build:sites` remains available for the hosted Workers variant after switching the storage adapter back to D1/R2 or Supabase HTTP APIs.
