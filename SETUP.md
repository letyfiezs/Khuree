# Хүрээ — Supabase, Cloudflare R2, Vercel тохиргоо

Энэ төсөлд киноны мэдээлэл ба хэрэглэгчид Supabase-д, том видео файлууд Cloudflare R2-д хадгалагдана. Админы browser видеог Vercel-ээр дамжуулахгүйгээр R2 рүү multipart хэлбэрээр шууд илгээнэ.

## 1. Supabase

1. [Supabase Dashboard](https://supabase.com/dashboard)-д шинэ project үүсгэнэ.
2. **Project Settings → API** хэсгээс Project URL, publishable/anon key, service role key-г авна. Service role key-г browser эсвэл GitHub-д хэзээ ч бүү оруул.
3. **SQL Editor → New query** нээгээд `supabase/migrations/202608230001_production_schema.sql` файлын бүх SQL-ийг ажиллуулна.
4. **Authentication → URL Configuration**-д Site URL-аа `http://localhost:3000` (дараа нь production domain), Redirect URLs-д local болон Vercel URL-аа нэмнэ.
5. Сайтын `/signup` хуудсаар анхны хэрэглэгчээ үүсгэж email-ээ баталгаажуулна.
6. Тухайн хэрэглэгчийн UUID-г **Authentication → Users**-ээс хуулж SQL Editor-т зөвхөн нэг удаа доорхыг ажиллуулна:

```sql
update public.profiles set role = 'admin' where id = 'USER_UUID_HERE';
```

Энгийн хэрэглэгч RLS-ийг тойрч өөрийгөө admin болгож чадахгүй. Дараагийн role өөрчлөлтийг зөвхөн Supabase SQL Editor эсвэл итгэмжлэгдсэн server ажиллагаагаар хийнэ.

## 2. Cloudflare R2

1. Cloudflare Dashboard → **R2 Object Storage → Create bucket**.
2. **Manage R2 API Tokens → Create API token**; сонгосон bucket-д Object Read & Write эрх өгнө. Access Key ID болон Secret Access Key-г нэг удаа хадгална.
3. Account ID-г R2 overview/API хэсгээс авна.
4. Bucket → **Settings → CORS policy** хэсэгт `r2-cors.json` файлын JSON-ийг хуулна. Ашиглахгүй custom domain мөрийг устгаж, Vercel placeholder-ийг бодит domain-оор солино. `ETag` expose хийх нь multipart upload дуусгахад зайлшгүй.
5. **Public Development URL**-г enable хийх эсвэл production-д custom domain холбоно. Гарсан үндсэн URL нь `R2_PUBLIC_URL`; төгсгөлд `/` тавихгүй.

## 3. Local туршилт

Project root-д `.env.local` үүсгээд `.env.example`-ээс утгуудыг хуулж бодит credentials бөглөнө:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=khuree-movies
R2_PUBLIC_URL=https://pub-....r2.dev
CLOUDFLARE_API_TOKEN=... # Account Analytics Read эрхтэй token; admin Class A/B metrics-д ашиглана
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Дараа нь:

```bash
npm install
npm run dev
```

Admin-аар нэвтэрч **Админ → Кино → Контент нэмэх**-ээс MP4 сонгоно. Network tab дээр видео bytes нь `r2.cloudflarestorage.com` руу PUT болж байгааг шалгаж болно. Амжилттай хадгалсны дараа `movies.video_key` нь object key байх ёстой; presigned URL байх ёсгүй.

## 4. Vercel

1. Project-оо GitHub repository руу push хийнэ (`.env.local` ignore хийгдсэн).
2. Vercel → **Add New → Project**-оор repository-г import хийнэ. Framework нь Next.js гэж автоматаар танигдана.
3. **Settings → Environment Variables**-д дээрх 8 хувьсагчийг нэмнэ. `NEXT_PUBLIC_SITE_URL`-г production URL болгоно. Service role болон R2 secret-д Sensitive сонголт хэрэглэнэ.
4. Deploy хийнэ.
5. R2 CORS-ийн `YOUR-PROJECT.vercel.app`-г бодит Vercel domain-оор солино. Custom domain ашиглавал мөн нэмнэ.
6. Supabase Authentication URL Configuration-д Vercel/custom domain нэмнэ.
7. Admin login, олон GB видеоны upload/progress, каталогт харагдах байдал, seek/fullscreen playback, edit/delete-г шалгана.

## Ажиллагааны тэмдэглэл

- 32 MiB multipart хэсэг ашигладаг; бодит progress browser-оос хэмжигдэнэ.
- R2 upload дууссан ч database insert бүтэлгүйтвэл server object-ийг устгана. Дуусаагүй upload-ууд `orphan_uploads` хүснэгтэд бүртгэгдэнэ; удаан орхигдсон мөрүүдийг scheduled cleanup-аар цэвэрлэж болно.
- Playback одоогоор public MP4/HLS object URL ашиглана. `video_key` тусдаа хадгалагддаг тул дараа нь signed playback, subscription gate, эсвэл HLS master manifest руу metadata migration-гүй шилжинэ.
- Bucket public байхад URL мэдсэн хүн видеог үзэж чадна. Premium/hotlink protection хийхээс өмнө private bucket + server-issued signed playback URL хэрэгжүүлнэ.
