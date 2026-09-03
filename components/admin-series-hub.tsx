"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { SeriesShow } from "@/lib/series-admin";
export function AdminSeriesHub({
  initial,
  categories,
}: {
  initial: SeriesShow[];
  categories: string[];
}) {
  const [shows, setShows] = useState(initial);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [age, setAge] = useState("13+");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<SeriesShow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSynopsis, setEditSynopsis] = useState("");
  const [editAge, setEditAge] = useState("13+");
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editPoster, setEditPoster] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const visibleShows = useMemo(() => { const search = query.trim().toLocaleLowerCase("mn"); return search ? shows.filter((show) => [show.title, show.synopsis, ...show.categories].some((value) => value.toLocaleLowerCase("mn").includes(search))) : shows; }, [query, shows]);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/series", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        synopsis,
        categories: selected,
        ageRating: age,
      }),
    });
    const data = (await response.json()) as {
      show?: SeriesShow;
      error?: string;
    };
    if (!response.ok || !data.show)
      return setError(data.error ?? "Алдаа гарлаа.");
    setShows((current) => [data.show!, ...current]);
    setOpen(false);
    setTitle("");
    setSynopsis("");
    setSelected([]);
  }
  function openEditor(show: SeriesShow) {
    setEditing(show); setEditTitle(show.title); setEditSynopsis(show.synopsis);
    setEditAge(show.ageRating); setEditCategories(show.categories); setEditPoster(null); setError("");
  }
  async function saveEdit(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return; setSaving(true); setError("");
    try {
      const response = await fetch(`/api/admin/series/${editing.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: editTitle, synopsis: editSynopsis, categories: editCategories, ageRating: editAge }) });
      const result = await response.json() as { show?: SeriesShow; error?: string };
      if (!response.ok || !result.show) throw new Error(result.error ?? "Цувралыг засаж чадсангүй.");
      let updated = result.show;
      if (editPoster) {
        const form = new FormData(); form.append("poster", editPoster);
        const posterResponse = await fetch(`/api/admin/series/${editing.id}/poster`, { method: "POST", body: form });
        const posterResult = await posterResponse.json() as { posterUrl?: string; error?: string };
        if (!posterResponse.ok || !posterResult.posterUrl) throw new Error(posterResult.error ?? "Thumbnail хадгалж чадсангүй.");
        updated = { ...updated, posterUrl: posterResult.posterUrl };
      }
      setShows((current) => current.map((show) => show.id === updated.id ? updated : show)); setEditing(null);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Алдаа гарлаа."); }
    finally { setSaving(false); }
  }
  return (
    <>
      <div className="admin-toolbar content-admin-toolbar series-admin-toolbar">
        <div>
          <p className="section-kicker">ЦУВРАЛЫН УДИРДЛАГА</p>
          <h1>Олон ангит</h1>
          <p>Цуврал → бүлэг → анги гэсэн дарааллаар контентоо удирдана</p>
        </div>
        <button className="primary-button" onClick={() => setOpen(true)}>
          <i>＋</i> Шинэ цуврал
        </button>
      </div>
      <div className="content-overview series-overview"><article><span>НИЙТ ЦУВРАЛ</span><b>{shows.length}</b><small>Бүртгэлтэй бүтээл</small></article><article><span>НАСАНД ХҮРЭГЧДИЙН</span><b>{shows.filter((show) => show.ageRating === "18+").length}</b><small>18+ ангилалтай</small></article><article><span>АНГИЛАЛ</span><b>{new Set(shows.flatMap((show) => show.categories)).size}</b><small>Ашигласан төрөл</small></article></div>
      <div className="content-controls series-controls"><label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Цувралын нэр, ангиллаар хайх" /></label><small>{visibleShows.length} цуврал</small></div>
      <div className="series-hub-grid">
        {visibleShows.map((show) => (
          <article className="series-admin-card" key={show.id}>
          <Link className="series-card-link" href={`/admin/series/${show.id}`}>
            <i className={show.posterUrl ? "has-poster" : ""} style={show.posterUrl ? { backgroundImage: `url(${show.posterUrl})` } : undefined}>{!show.posterUrl && "▤"}</i>
            <div>
              <b>{show.title}</b>
              <small>
                {show.ageRating} · {show.categories.join(", ")}
              </small>
              <p>{show.synopsis}</p>
            </div>
            <span>Бүлгүүд →</span>
          </Link>
          <button type="button" className="row-action series-edit-button" onClick={() => openEditor(show)}>Засах / Thumbnail</button>
          </article>
        ))}
        {!visibleShows.length && <div className="series-empty-state"><i>▤</i><b>{shows.length ? "Цуврал олдсонгүй" : "Анхны цувралаа үүсгэнэ үү"}</b><span>{shows.length ? "Хайлтын үгээ өөрчилж үзнэ үү." : "Цуврал үүсгээд бүлэг болон анги нэмэх боломжтой."}</span>{!shows.length && <button className="primary-button" onClick={() => setOpen(true)}>＋ Цуврал үүсгэх</button>}</div>}
      </div>
      {open && (
        <div className="modal-backdrop">
          <form className="admin-modal" onSubmit={create}>
            <div className="modal-title">
              <div>
                <p className="section-kicker">ШИНЭ ЦУВРАЛ</p>
                <h2>Олон ангит бүтээл үүсгэх</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            <label>
              Цувралын нэр
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </label>
            <label>
              Тайлбар
              <textarea
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
              />
            </label>
            <label>
              Насны ангилал
              <select value={age} onChange={(e) => setAge(e.target.value)}>
                <option>Бүх нас</option>
                <option>6+</option>
                <option>13+</option>
                <option>16+</option>
                <option>18+</option>
              </select>
            </label>
            <fieldset>
              <legend>Ангилал</legend>
              <div className="category-picker">
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category}
                    className={selected.includes(category) ? "selected" : ""}
                    onClick={() =>
                      setSelected((current) =>
                        current.includes(category)
                          ? current.filter((x) => x !== category)
                          : [...current, category],
                      )
                    }
                  >
                    {selected.includes(category) ? "✓ " : "+ "}
                    {category}
                  </button>
                ))}
              </div>
            </fieldset>
            {error && <p className="form-error">⚠ {error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={() => setOpen(false)}>
                Болих
              </button>
              <button className="primary-button">Цуврал үүсгэх</button>
            </div>
          </form>
        </div>
      )}
      {editing && (
        <div className="modal-backdrop">
          <form className="admin-modal edit-series-modal" onSubmit={saveEdit}>
            <div className="modal-title"><div><p className="section-kicker">ЦУВРАЛ ЗАСАХ</p><h2>{editing.title}</h2></div><button type="button" onClick={() => setEditing(null)}>×</button></div>
            <div className="series-edit-poster" style={{ backgroundImage: editPoster ? `url(${URL.createObjectURL(editPoster)})` : editing.posterUrl ? `url(${editing.posterUrl})` : undefined }}><span>{!editPoster && !editing.posterUrl ? "2:3 THUMBNAIL" : ""}</span></div>
            <label>Thumbnail зураг<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setEditPoster(event.target.files?.[0] ?? null)} /><small>JPG, PNG, WEBP · 8MB хүртэл</small></label>
            <label>Цувралын нэр<input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /></label>
            <label>Тайлбар<textarea value={editSynopsis} onChange={(event) => setEditSynopsis(event.target.value)} /></label>
            <label>Насны ангилал<select value={editAge} onChange={(event) => setEditAge(event.target.value)}><option>Бүх нас</option><option>6+</option><option>13+</option><option>16+</option><option>18+</option></select></label>
            <fieldset><legend>Ангилал</legend><div className="category-picker">{categories.map((category) => <button type="button" key={category} className={editCategories.includes(category) ? "selected" : ""} onClick={() => setEditCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category])}>{editCategories.includes(category) ? "✓ " : "+ "}{category}</button>)}</div></fieldset>
            {error && <p className="form-error">⚠ {error}</p>}
            <div className="modal-actions"><button type="button" onClick={() => setEditing(null)}>Болих</button><button className="primary-button" disabled={saving}>{saving ? "Хадгалж байна…" : "Өөрчлөлт хадгалах"}</button></div>
          </form>
        </div>
      )}
    </>
  );
}
