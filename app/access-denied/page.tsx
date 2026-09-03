import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function AccessDeniedPage() {
  return <main><SiteHeader /><section className="catalog-page"><div className="catalog-banner movie-banner"><p className="section-kicker">ҮЗЭХ ЭРХ</p><h1>Кино үзэх эрх хаалттай байна</h1><p>Таны бүртгэлийн үзэх эрхийг админ хаасан байна. Админтай холбогдож эрхээ нээлгэнэ үү.</p><Link className="primary-button" href="/">Нүүр хуудас руу</Link></div></section></main>;
}
