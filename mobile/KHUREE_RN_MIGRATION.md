# Khuree React Native migration

Source of truth: the existing Next.js app at `/Users/xeroerka/Khuree` (App Router lives in `app/`). This document is derived from that code only. Admin surfaces are listed for completeness and are **not** implemented in the mobile app.

## Architecture snapshot

| Layer | Implementation |
| --- | --- |
| Frontend | Next.js 16 App Router, server components for catalog/detail/watch |
| Auth | Supabase Auth via `@supabase/ssr` cookies (`createSupabaseServerClient`) |
| PIN auth | Server HMAC maps phone/email + 4-digit PIN → synthetic email + password (`lib/auth/pin-auth.ts`) |
| Catalog | Supabase tables `movies`, `series` / `series_shows`, `seasons` / `series_seasons`, `genres`, `subtitles` |
| Video | Cloudflare R2 private objects; watch page issues a short-lived signed GET URL (`signedR2PlaybackUrl`, 4h TTL) |
| Payments | QPay Merchant V2 server-side only (`lib/qpay.ts`, `lib/payments.ts`) |
| Entitlements | Supabase Auth `app_metadata.plan_entitlements` + `can_watch` (`lib/user-entitlements.ts`) |

Customer catalog pages (`/`, `/movies`, `/movie/[slug]`, `/series/[id]`, `/watch/[slug]`) are **SSR HTML**, not JSON. Mobile therefore uses thin JSON adapters under `/api/mobile/*` that call the same `lib/` functions. No new business logic, no QPay secrets, no R2 keys.

---

## Existing API list

### Customer auth
sda
| Method | Path | Body / query | Response | Notes |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/pin/login` | `{ kind: "phone"\|"email", identifier, pin, returnTo? }` | `{ ok, returnTo }` | Primary login. Phone identifier is `+976XXXXXXXX`. Sets Supabase SSR cookies. |
| POST | `/api/auth/pin/signup` | `{ kind, identifier, pin, name, returnTo? }` | `{ ok, returnTo }` | Creates user with `can_watch: false`. Auto-signs in. |
| POST | `/api/auth/login` | `{ email, password, returnTo? }` | `{ ok, returnTo, user }` | Email/password (legacy; UI uses PIN). |
| POST | `/api/auth/signup` | `{ name, email, password }` | `{ ok, delivered }` | Email signup + verification mail. |
| POST | `/api/auth/logout` | — | `{ ok }` | `supabase.auth.signOut()`. |
| GET | `/api/auth/verify` | — | 302 `/login` | Email verify landing. |
| POST | `/api/auth/phone/send` | `{ phone, name? }` | `{ ok }` | SMS OTP (`+976` 8 digits). |
| POST | `/api/auth/phone/verify` | `{ phone, code, returnTo? }` | `{ ok, returnTo }` | SMS 6-digit code. |
| POST | `/api/auth/recovery/request` | phone: `{ kind:"phone", identifier, recoveryEmail }` or `{ email }` | `{ ok, message }` | Always 200 to avoid account enumeration. |
| POST | `/api/auth/recovery/verify` | `{ kind?, email?, token }` | `{ ok, credentialKind }` | 6-digit code. Phone flow uses challenge cookies. |
| POST | `/api/auth/recovery/update` | `{ password }` | `{ ok }` | PIN = 4 digits; password ≥ 8. Then sign-out. |

### Account / devices / adult

| Method | Path | Notes |
| --- | --- | --- |
| PATCH | `/api/account` | Update display name, adult flag, parental PIN. Requires current PIN/password. |
| POST | `/api/account/password` | Change PIN or password. |
| GET/POST/DELETE | `/api/account/devices` | 3-device limit unless `unlimited_devices`. Sets httpOnly `khuree-device-id`. |
| POST | `/api/account/unlock-adult` | `{ pin }` — unlocks 18+ for 1 hour (`adult_unlocked_until`). |
| POST | `/api/account/presence` | Heartbeat into `user_metadata.presence_last_seen_at`. |
| POST | `/api/account/recovery-email/request` | Link Gmail for phone-PIN recovery. |
| POST | `/api/account/recovery-email/verify` | `{ code }` 6 digits. |

### Playback / media

| Method | Path | Notes |
| --- | --- | --- |
| GET/HEAD | `/api/video/[...key]` | Range stream from R2. Requires session + HMAC `token`/`expires` + registered device + entitlement. Blocks cross-site `sec-fetch-site`. **Watch page does not use this**; it uses signed R2 URLs. |
| GET | `/api/media/[key]` | Local-disk fallback for PC testing. |
| GET | `/api/posters/[key]` | Local poster files. Production posters are public R2 URLs on `movies.poster_url`. |
| GET | `/api/subtitles/[key]` | Authenticated VTT from R2. `key` is subtitle UUID. |

### QPay

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/qpay/invoice` | Auth required. `{ plan }` → creates order + QPay invoice. Returns `payment` with `qrImage`, `shortUrl`, `urls`. Secrets stay on server. |
| GET | `/api/qpay/status` | `order_id`, optional `verify=1`. If paid, calls `setUserPlanEntitlement`. |
| GET/POST | `/api/qpay/callback` | QPay server callback. Re-checks QPay API, marks paid, grants plan. **Never called from the app.** |

### Analytics / live now / chat

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/analytics/view` | `{ movieId }` unique play event. |
| GET | `/api/analytics/live` | Top 5 currently watching (public JSON). |
| POST/DELETE | `/api/analytics/live` | Presence heartbeat `{ movieId, sessionId, bitrateKbps? }`. |
| GET/POST | `/api/messages` | User ↔ admin feedback chat. |

### Mobile JSON adapters (added for native; wrap existing `lib/`)

These do not invent catalog, auth, or payment rules. They expose the same data the SSR pages already compute.

| Method | Path | Mirrors |
| --- | --- | --- |
| GET | `/api/mobile/session` | `getCurrentUser()` |
| GET | `/api/mobile/catalog` | Home `getBrowseCatalog()` + `popularMovieIds()` + categories |
| GET | `/api/mobile/movie/[slug]` | `/movie/[slug]` |
| GET | `/api/mobile/series/[id]` | `/series/[id]` via `getPublicSeries` |
| GET | `/api/mobile/playback/[slug]` | `/watch/[slug]` — entitlement/device/adult checks, then `signedR2PlaybackUrl` |
| GET | `/api/mobile/plans` | `/subscribe` plan list + prices |

Catalog/playback JSON **omits `videoKey`**. The player only receives a short-lived signed URL from `/api/mobile/playback/[slug]`.

### Admin (not used by mobile)

`/api/admin/login`, `/api/admin/movies/*`, `/api/admin/series/*`, `/api/admin/episodes`, `/api/admin/categories`, `/api/admin/live`, `/api/admin/uploads`, `/api/admin/stats`, `/api/admin/system`, `/api/admin/users/*`, `/api/admin/messages`, `/api/admin/users/presence`.

---

## Authentication flow

Primary customer UI (`components/auth-form.tsx`) is **phone or email + 4-digit PIN**, not email/password.

```
Register
  POST /api/auth/pin/signup
    identifier phone → normalize +976XXXXXXXX
    email = HMAC(identifier)@phone.khuree.local   (lib/auth/pin-auth.ts)
    password = HMAC("pin:identifier:PIN")
    admin.createUser({ email_confirm: true, app_metadata.can_watch: false })
    signInWithPassword → SSR cookies

Login
  POST /api/auth/pin/login
    same email/password derivation
    signInWithPassword → SSR cookies

Session
  cookies via @supabase/ssr (createSupabaseServerClient)
  getCurrentUser() reads auth user + profiles row + app_metadata entitlements

Forgot password
  phone: request code to linked recovery Gmail → verify 6-digit → set 4-digit PIN
  email: supabase.auth.resetPasswordForEmail / verifyOtp type=recovery → new password

Logout
  POST /api/auth/logout → signOut + clear admin cookie

Device gate (layout DeviceGate)
  GET /api/account/devices → if not registered, POST { deviceId, name, fingerprint? }
  cookie khuree-device-id; limit 3 unless unlimited_devices
  Watch/playback blocked until registered
```

Mobile stores the full cookie jar in Keychain (not only a display name) so auto-login and expired-session handling match the web cookie session. PIN HMAC secrets never leave the server.

---

## Movie model

Mapped in `lib/movies.ts` (`MovieRow` → `ContentItem` in `lib/content.ts`).

Postgres (`supabase/migrations/202608230001_production_schema.sql`):

- `id` uuid
- `title`, `slug` unique, `description`
- `poster_url`, `backdrop_url`
- `video_key` (R2 object key, **never sent to mobile catalog**)
- `original_filename`, `content_type`, `bytes`
- `release_year`, `duration`, `rating`, `age_rating` (default `13+`)
- `status` `draft | processing | published`
- `featured` boolean
- `kind` `movie | series`
- `series_id`, `season_id`, `season_number`, `episode_number` (episode rows also live in `movies`)
- `backdrop_position_x/y`, `backdrop_zoom`
- genres via `movie_genres` → `genres.name`
- subtitles via `subtitles` (`id`, `label`, `language`, `object_key`)

Public `ContentItem` fields used by UI: `id`, `slug`, `title`, `synopsis`, `year`, `duration`, `age`, `rating`, `genre[]`, `kind`, `status`, `accent` (`#7f1018`), `audioLabel` (`Субтай` | `Хэлтэй`), `posterUrl`, `backdropUrl`, `featured`, `hasVideo` (mobile), `seriesId`, `seasonId`, `seasonNumber`, `episodeNumber`.

Published-only listing: `listPublicMovies()`. Vertical dramas are movies whose genre includes `Босоо драма` (`lib/vertical-drama.ts`).

---

## Series model

Two parallel representations are kept in sync (`lib/series-admin.ts`):

1. Canonical: `series` + `seasons` (FKs from `movies`)
2. Admin/public cards: `series_shows` + `series_seasons` (`202608230005_series.sql`)

`SeriesShow`: `id`, `title`, `synopsis`, `categories[]`, `ageRating`, `createdAt`, `posterUrl`.

`SeriesSeason`: `id`, `seriesId`, `number`, `title`.

Public card (`lib/public-series.ts` `seriesCard`): a `ContentItem` with `kind: "series"`, `slug = show.id`, `episodes` count, art from latest episode / show poster. `getPublicSeries(id)` returns `{ show, seasons, episodes }` where episodes are published `movies` rows with `kind === "series"` and matching `seriesId`.

---

## Episode model

An episode **is a `movies` row** with:

- `kind: "series"`
- `series_id`, `season_id`
- `season_number`, `episode_number`
- its own `slug`, `video_key`, poster, subtitles

Watch URL is `/watch/{episode.slug}` (same player as movies). Next episode is the next sorted `(seasonNumber, episodeNumber)` in that series.

---

## Live streaming flow

- Route `/live` requires login (`requireUser`).
- Channel list is **client-side** in `components/live-tv.tsx` (same stations as `lib/live-channels.ts`).
- URLs are public HLS:
  - SkyGO: `https://cdn4.skygo.mn/live/disk1/{id}/HLSv3-FTA/{id}.m3u8` (some `cdn1` + `HLS-FTA`)
  - MNB: `https://live.mnb.mn/hls/{id}.stream.m3u8`
- Player: `PlayerShell` with `live` + `autoPlay` + Shaka/native HLS.
- Separate “яг одоо үзэж буй” rail: `GET /api/analytics/live` (VOD presence, not TV).

Mobile copies the same public HLS station list. No WebView.

---

## Video playback flow

Web `/watch/[slug]` (`app/watch/[slug]/page.tsx`):

1. `requireUser` → `requireDeviceAccess`
2. `getCatalogItem(slug)`
3. `requireWatchAccess` by section: `adult` if `age === "18+"`, else `vertical` if genre `Босоо драма`, else `series` / `movie`
4. 18+ → `requireAdultAccess` (parental PIN session)
5. `videoUrl = signedR2PlaybackUrl(item.videoKey)` (4 hours, `ResponseContentDisposition: inline`)
6. `PlayerShell` loads Shaka (DASH/HLS) or mpegts.js / native video
7. Recently watched written to `localStorage["khuree-recently-watched"]` (no server progress table)
8. `POST /api/analytics/view` once; `POST /api/analytics/live` heartbeat while playing

Mobile: `GET /api/mobile/playback/[slug]` performs steps 1–5 and returns `{ videoUrl, item, subtitles, episodes, nextEpisode }`. `react-native-video` plays the signed URL (MP4 or HLS). Resume/progress is local AsyncStorage, matching the web’s client-only recently-watched pattern. Private R2 keys and signing secrets stay on the server.

---

## QPay flow

```
Mobile/Web  POST /api/qpay/invoice { plan }
  → createPayment(userId, amount, plan)           lib/payments.ts
  → QPay createSimpleInvoice (server credentials) lib/qpay.ts
  → completeInvoiceCreation (stores invoiceId; QR is response-only)
  ← { payment: { id, amount, status:"pending", qrImage, shortUrl, urls[] } }

User pays in bank app (QR / deep link / shortUrl)

QPay  GET|POST /api/qpay/callback?order_id=
  → checkPayment against QPay API
  → markPaymentPaid
  → setUserPlanEntitlement(userId, plan, { days, source:"qpay" })

Client poll  GET /api/qpay/status?order_id=&verify=1
  → if paid, same entitlement grant (idempotent)
```

Plans (`lib/payments.ts`): `movie`, `series`, `vertical`, `adult` (5900₮), `vip` (12900₮) — overridable by `QPAY_*_PRICE`. Duration `QPAY_PLAN_DAYS` (1–30, default 30).

QPay env (`QPAY_BASE_URL`, `QPAY_USERNAME`, `QPAY_PASSWORD`, `QPAY_INVOICE_CODE`, `QPAY_CALLBACK_URL`, `QPAY_ORDER_SECRET`) is **server-only**. Mobile never embeds merchant secrets.

---

## User entitlement flow

`getCurrentUser()` (`lib/auth/local-auth.ts`):

- `entitlement` in `app_metadata`: `{ enabled, expiresAt, source }` — legacy VIP-style flag
- `plan_entitlements[plan]`: `{ enabled, expiresAt, source: "manual"|"qpay" }` for `movie|series|vertical|adult|vip`
- `can_watch` unless `app_metadata.can_watch === false`, and (legacy entitlement active **or** any plan unexpired)
- `watchPermissions[section]` = permission flag AND (`vip` plan OR that section’s plan OR legacy entitlement)
- 18+ extra: `profiles.adult_enabled` + `adult_unlocked_until` (PIN unlock, 1 hour)
- Admins bypass watch + device checks

New PIN signup sets `can_watch: false` until a QPay (or admin manual) grant. `requireWatchAccess` redirects web to `/subscribe`; mobile playback returns `{ subscribe: true }` 403.

---

## Web route → mobile screen mapping

| Web route | Auth | Mobile screen | Notes |
| --- | --- | --- | --- |
| `/login` | public | `Login` | PIN phone/email |
| `/signup` | public | `Register` | PIN signup |
| login “Нууц үгээ мартсан?” | public | `ForgotPassword` | recovery request/verify/update |
| `/` | public catalog | `Home` tab | Hero + rails + continue watching + live top 5 |
| `/movies` | requireUser | `Movies` tab | Full-length movies, exclude 18+ and vertical |
| `/series` | requireUser | `Series` tab | Series cards |
| `/live` | requireUser | `Live` tab | HLS stations |
| `/account` | requireUser | `Profile` tab | Account, devices, logout |
| Search dialog (header) | — | `Search` (header, not a tab) | Same normalize/match as `lib/search-normalize.ts` |
| `/movie/[slug]` | requireUser | `MovieDetail` | Play → Watch |
| `/series/[id]` | requireUser | `SeriesDetail` | Seasons + episodes |
| `/watch/[slug]` | user + device + entitlement | `WatchPlayer` | Signed URL, resume, episodes |
| `/subscribe` | public view | `Subscription` | QPay invoice + poll |
| `/vertical` | requireUser | Home rail + Movies filter | Not a tab; content is `genre includes Босоо драма` |
| `/adult` | adult unlock | Home +18 rail | PIN via profile / unlock API |
| `/category/[name]` | requireUser | Search / Movies genre chips | Optional; catalog already includes genres |
| `/verify-email` | — | n/a | PIN signup is pre-confirmed |
| `/admin/*` | admin | **not built** | |

---

## Mobile client conventions

- Session: Keychain cookie jar → `Cookie` header on Axios
- Device id: AsyncStorage + `POST /api/account/devices`
- Continue watching / resume position: AsyncStorage (`khuree-recently-watched`, `khuree-playback-progress`) — web also keeps these client-side
- Images: `@d11/react-native-fast-image` (maintained FastImage)
- Video: `react-native-video` (HLS + MP4)
- API host: iOS simulator `http://localhost:3000`, Android emulator `http://10.0.2.2:3000` (override in `src/config.ts`)
