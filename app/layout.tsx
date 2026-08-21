import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import './extended.css';

const geist = Geist({ variable: '--font-geist', subsets: ['latin', 'cyrillic'] });
export const metadata: Metadata = { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'), title: {default:'Хүрээ — Монгол кино стриминг',template:'%s · Хүрээ'}, description: 'Монгол бүтээлүүдийг нэг дороос үзэх premium стриминг платформ.',openGraph:{title:'Хүрээ — Монгол кино стриминг',description:'Монгол түүх. Шинэ мэдрэмж.',type:'website'},twitter:{card:'summary_large_image',title:'Хүрээ — Монгол кино стриминг',description:'Монгол түүх. Шинэ мэдрэмж.'} };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="mn"><body className={geist.variable}>{children}</body></html>; }
