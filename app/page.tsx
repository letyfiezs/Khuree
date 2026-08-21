import Link from 'next/link';

const films = [
  { title: 'ХӨХ ТЭНГЭРИЙН ДОР', meta: '2026 • 2ц 14м', tone: 'from-slate-700 to-slate-950', tag: 'ШИНЭ' },
  { title: 'ХОТЫН СҮҮДЭР', meta: '2025 • 1ц 48м', tone: 'from-red-950 to-zinc-950', tag: '4K' },
  { title: 'ЗЭРЛЭГ САЛХИ', meta: '2026 • 8 анги', tone: 'from-amber-900 to-stone-950', tag: 'ЦУВРАЛ' },
  { title: 'ЦАГААН ШӨНӨ', meta: '2024 • 1ц 56м', tone: 'from-indigo-950 to-zinc-950', tag: '18+' },
  { title: 'СҮҮЛЧИЙН ӨРТӨӨ', meta: '2025 • 2ц 03м', tone: 'from-emerald-950 to-black', tag: 'HD' },
];

function Header() {
  return <header className="site-header"><Link href="/" className="brand"><span>Х</span>ХҮРЭЭ</Link><nav><Link href="/">Нүүр</Link><Link href="#movies">Кино</Link><Link href="#series">Олон ангит</Link><Link href="/admin">Админ</Link></nav><div className="header-actions"><button aria-label="Хайх" className="icon-button">⌕</button><Link href="/admin" className="login-button">Нэвтрэх</Link></div></header>;
}

export default function Home() {
  return <main><Header /><section className="hero"><div className="hero-glow"/><div className="hero-content"><p className="eyebrow"><span/> ХҮРЭЭ ОРИГИНАЛ</p><h1>ХҮЙТЭН<br/><em>МӨР</em></h1><div className="hero-meta"><b>IMDb 8.7</b><span>2026</span><span>16+</span><span>2ц 08м</span><span className="quality">4K</span></div><p className="hero-copy">Цасан шуурганд тасарсан уулын сууринд нэгэн мөрдөгч өнгөрсөнтэйгөө нүүр тулна. Үнэнийг нуусан мөр бүр түүнийг гэрт нь улам ойртуулна.</p><div className="hero-actions"><Link href="/watch/huiten-mur" className="primary-button">▶ &nbsp;Үзэх</Link><Link href="/movie/huiten-mur" className="secondary-button">ⓘ &nbsp;Дэлгэрэнгүй</Link></div></div><div className="hero-index"><b>01</b><span>/ 05</span><i/></div></section><section className="catalog" id="movies"><div className="section-heading"><div><p className="section-kicker">ОДОО ҮЗЭХ</p><h2>Онцлох бүтээлүүд</h2></div><div className="rail-arrows"><button>←</button><button>→</button></div></div><div className="film-rail">{films.map((film, index)=><Link href={index === 0 ? '/movie/huiten-mur' : '#'} className="film-card" key={film.title}><div className={`poster bg-gradient-to-br ${film.tone}`}><span className="poster-mark">ХҮРЭЭ</span><span className="poster-title">{film.title}</span><span className="film-tag">{film.tag}</span><span className="play-chip">▶</span></div><h3>{film.title}</h3><p>{film.meta}</p></Link>)}</div></section></main>;
}
