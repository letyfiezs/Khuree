import Link from "next/link";
import type { ContentItem } from "@/lib/content";
export function CatalogGrid({ items }: { items: ContentItem[] }) {
  return (
    <div className="catalog-grid">
      {items.map((item) => (
        <Link href={item.kind === "series" && item.seriesId ? `/series/${item.seriesId}` : `/movie/${encodeURIComponent(item.slug)}`} className="film-card" key={item.id}>
          <div
            className={`poster ${item.posterUrl ? "has-poster" : ""}`}
            style={{
              background: item.posterUrl
                ? `linear-gradient(0deg,#000b,transparent 52%),url(${item.posterUrl}) center/cover`
                : `radial-gradient(circle at 55% 25%,${item.accent}cc,transparent 40%),linear-gradient(155deg,${item.accent},#050505)`,
            }}
          >
            <span className="poster-mark">ХҮРЭЭ</span>
            {!item.posterUrl && (
              <span className="poster-title">{item.title}</span>
            )}
            <span className="film-tag">
              {item.kind === "series"
                ? "ЦУВРАЛ"
                : item.videoKey
                  ? "ШИНЭ"
                  : "HD"}
            </span>
            <span className="play-chip">▶</span>
          </div>
          <h3>{item.title}</h3>
          <p>
            {item.kind === "series" ? `${item.episodes ?? 0} анги` : `${item.year} • ${item.duration}`} • {item.genre.slice(0, 2).join(", ")}
          </p>
        </Link>
      ))}
    </div>
  );
}
