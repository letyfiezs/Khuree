"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { matchesSearch } from "@/lib/search-normalize";
type SearchItem = {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  genre: string[];
  kind: "movie" | "series";
  year: number;
};
export function SearchDialog({ items }: { items: SearchItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const results = useMemo(() => {
    if (!query.trim()) return items.slice(0, 6);
    return items
      .filter((item) =>
        matchesSearch(query, item.title, item.synopsis, item.genre.join(" ")),
      )
      .slice(0, 12);
  }, [items, query]);
  return (
    <>
      <button
        aria-label="Хайх"
        className="icon-button search-trigger"
        onClick={() => setOpen(true)}
      >
        ⌕
      </button>
      {open && (
        <div
          className="search-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className="search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Контент хайх"
          >
            <div className="search-input-wrap">
              <span>⌕</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Кирилл эсвэл латинаар хайх..."
              />
              <button onClick={() => setOpen(false)} aria-label="Хаах">
                ESC
              </button>
            </div>
            <div className="search-meta">
              <span>
                {query ? `“${query}” хайлтын үр дүн` : "Санал болгох бүтээлүүд"}
              </span>
              <b>{results.length} олдлоо</b>
            </div>
            <div className="search-results">
              {results.map((item) => (
                <Link
                  href={`/movie/${encodeURIComponent(item.slug)}`}
                  key={item.id}
                  onClick={() => setOpen(false)}
                >
                  <i>{item.kind === "series" ? "S" : "▶"}</i>
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {item.year} · {item.genre.slice(0, 2).join(", ")}
                    </small>
                  </span>
                  <em>{item.kind === "series" ? "ОЛОН АНГИТ" : "КИНО"}</em>
                </Link>
              ))}
              {results.length === 0 && (
                <div className="search-empty">
                  <b>Илэрц олдсонгүй</b>
                  <span>Өөр нэр эсвэл ангиллаар хайж үзнэ үү.</span>
                </div>
              )}
            </div>
            <footer>
              <span>↵ Сонгох</span>
              <span>ESC Хаах</span>
              <span>Ctrl K Хайлт</span>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
