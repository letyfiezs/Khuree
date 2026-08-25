"use client";
import { useRef, useState } from "react";
import type { ContentItem } from "@/lib/content";
import type { SubtitleTrack } from "@/lib/storage/types";
type UploadState = "idle" | "uploading" | "processing" | "done" | "error";
type EditableTrack = SubtitleTrack & { content: string };
export function AdminMovies({
  initial,
  mode = "movie",
  categories,
  fixedSeries,
  forcedAgeRating,
}: {
  initial: ContentItem[];
  mode?: "movie" | "series";
  categories: string[];
  fixedSeries?: {
    id: string;
    title: string;
    seasonId: string;
    seasonNumber: number;
  };
  forcedAgeRating?: string;
}) {
  const suggestedEpisodeNumber = Math.max(0, ...initial.map((item) => item.episodeNumber ?? 0)) + 1;
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [ageRating, setAgeRating] = useState(forcedAgeRating ?? "13+");
  const [targetQuality, setTargetQuality] = useState("original");
  const [seriesTitle, setSeriesTitle] = useState(fixedSeries?.title ?? "");
  const [seasonNumber, setSeasonNumber] = useState(
    fixedSeries?.seasonNumber ?? 1,
  );
  const [episodeNumber, setEpisodeNumber] = useState(suggestedEpisodeNumber);
  const [video, setVideo] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [posterMovie, setPosterMovie] = useState<ContentItem | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterSaving, setPosterSaving] = useState(false);
  const [backdropFile, setBackdropFile] = useState<File | null>(null);
  const [backdropSaving, setBackdropSaving] = useState(false);
  const [backdropX, setBackdropX] = useState(50);
  const [backdropY, setBackdropY] = useState(50);
  const [backdropZoom, setBackdropZoom] = useState(100);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [editMovie, setEditMovie] = useState<ContentItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSynopsis, setEditSynopsis] = useState("");
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editAgeRating, setEditAgeRating] = useState("13+");
  const [editSaving, setEditSaving] = useState(false);
  const [editSeriesTitle, setEditSeriesTitle] = useState("");
  const [editSeasonNumber, setEditSeasonNumber] = useState(1);
  const [editEpisodeNumber, setEditEpisodeNumber] = useState(1);
  const [subtitleMovie, setSubtitleMovie] = useState<ContentItem | null>(null);
  const [tracks, setTracks] = useState<EditableTrack[]>([]);
  const [trackId, setTrackId] = useState<string>();
  const [subtitleLabel, setSubtitleLabel] = useState("Монгол");
  const [subtitleLanguage, setSubtitleLanguage] = useState("mn");
  const [subtitleFilename, setSubtitleFilename] = useState("subtitle.vtt");
  const [subtitleContent, setSubtitleContent] = useState("");
  const [subtitleSaving, setSubtitleSaving] = useState(false);
  const subtitleInput = useRef<HTMLInputElement>(null);
  const subtitleRequest = useRef<AbortController | null>(null);
  const reset = () => {
    setTitle("");
    setSynopsis("");
    setSelectedCategories([]);
    setAgeRating(forcedAgeRating ?? "13+");
    setTargetQuality("original");
    setSeriesTitle(fixedSeries?.title ?? "");
    setSeasonNumber(fixedSeries?.seasonNumber ?? 1);
    setEpisodeNumber(suggestedEpisodeNumber);
    setVideo(null);
    setProgress(0);
    setUploadState("idle");
    setError("");
  };
  const close = () => {
    if (uploadState === "uploading") return;
    setOpen(false);
    reset();
  };
  const toggleCategory = (category: string) =>
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  async function uploadMovie(event: React.FormEvent) {
    event.preventDefault();
    if (
      !title.trim() ||
      !synopsis.trim() ||
      selectedCategories.length === 0 ||
      (mode === "series" && !seriesTitle.trim()) ||
      !video
    ) {
      setError("Нэр, тайлбар, ангилал болон видео файлаа бүрэн оруулна уу.");
      return;
    }
    setError("");
    setUploadState("uploading");
    setProgress(0);
    try {
      const initResponse = await fetch("/api/admin/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "init",
          filename: video.name,
          mimeType: video.type || (video.name.toLowerCase().endsWith(".ts") ? "video/mp2t" : video.name.toLowerCase().endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp4"),
          fileSize: video.size,
        }),
      });
      if (!initResponse.ok) throw new Error("Upload эхлүүлэх боломжгүй байна.");
      const { key, uploadId, chunkSize } = (await initResponse.json()) as {
        key: string;
        uploadId: string;
        chunkSize: number;
      };
      const parts: { partNumber: number; etag: string }[] = [];
      for (
        let offset = 0, partNumber = 1;
        offset < video.size;
        offset += chunkSize, partNumber++
      ) {
        const chunk = video.slice(
          offset,
          Math.min(offset + chunkSize, video.size),
        );
        const signed = await fetch("/api/admin/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "sign-part", key, uploadId, partNumber }) });
        if (!signed.ok) {
          const signedError = await signed.json().catch(() => ({})) as { error?: string };
          throw new Error(signedError.error ?? `${partNumber}-р хэсгийн эрх авч чадсангүй.`);
        }
        const { uploadUrl } = await signed.json() as { uploadUrl: string };
        const etag = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl);
          xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round(((offset + e.loaded) / video.size) * 100)); };
          xhr.onerror = () => reject(new Error(`${partNumber}-р хэсгийг upload хийж чадсангүй.`));
          xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.getResponseHeader("ETag") ?? "") : reject(new Error(`${partNumber}-р хэсэг: HTTP ${xhr.status}`));
          xhr.send(chunk);
        });
        if (!etag) throw new Error("R2 ETag буцаасангүй. Bucket CORS ExposeHeaders-ийг шалгана уу.");
        parts.push({ partNumber, etag });
      }
      setUploadState("processing");
      const completeResponse = await fetch("/api/admin/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          key,
          uploadId,
          parts,
          movie: {
            title: title.trim(),
            synopsis: synopsis.trim(),
            categories: selectedCategories,
            filename: video.name,
            bytes: video.size,
            contentType: video.type,
            ageRating,
            targetQuality,
            kind: mode,
            seriesTitle: mode === "series" ? seriesTitle.trim() : undefined,
            seasonNumber: mode === "series" ? seasonNumber : undefined,
            episodeNumber: mode === "series" ? episodeNumber : undefined,
            seriesId: fixedSeries?.id,
            seasonId: fixedSeries?.seasonId,
          },
        }),
      });
      if (!completeResponse.ok) {
        const completeError = await completeResponse.json().catch(() => ({})) as { error?: string };
        throw new Error(completeError.error ?? "Киноны бүртгэлийг хадгалж чадсангүй.");
      }
      const result = (await completeResponse.json()) as {
        id: string;
        slug: string;
        status: "published";
        videoKey: string;
      };
      setItems((current) => [
        {
          id: result.id,
          slug: result.slug,
          title: title.trim(),
          synopsis: synopsis.trim(),
          year: new Date().getFullYear(),
          duration: "Шууд үзэх",
          age: ageRating,
          rating: 0,
          genre: selectedCategories,
          kind: mode,
          status: result.status,
          accent: "#581018",
          videoKey: result.videoKey,
          subtitles: [],
        },
        ...current,
      ]);
      setUploadState("done");
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 900);
    } catch (uploadError) {
      setUploadState("error");
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Upload хийхэд алдаа гарлаа.",
      );
    }
  }
  async function openSubtitles(movie: ContentItem) {
    subtitleRequest.current?.abort();
    const controller = new AbortController();
    subtitleRequest.current = controller;
    setTracks([]);
    resetTrack();
    setSubtitleMovie(movie);
    setError("");
    try {
      const response = await fetch(`/api/admin/movies/${movie.id}/subtitles`, { signal: controller.signal, cache: "no-store" });
      const data = (await response.json()) as { tracks?: EditableTrack[]; error?: string };
      if (controller.signal.aborted || subtitleRequest.current !== controller) return;
      if (!response.ok) throw new Error(data.error ?? "Subtitle мэдээлэл авч чадсангүй.");
      setTracks(data.tracks ?? []);
    } catch (loadError) {
      if (controller.signal.aborted) return;
      setTracks([]);
      setError(loadError instanceof Error ? loadError.message : "Subtitle мэдээлэл авч чадсангүй.");
    }
  }
  async function createEpisodeWithoutVideo() {
    if (
      mode !== "series" ||
      !fixedSeries ||
      !title.trim() ||
      !synopsis.trim() ||
      !selectedCategories.length
    ) {
      setError("Ангийн нэр, тайлбар болон ангиллыг бүрэн оруулна уу.");
      return;
    }
    const response = await fetch("/api/admin/episodes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        synopsis: synopsis.trim(),
        categories: selectedCategories,
        ageRating,
        seriesTitle: fixedSeries.title,
        seriesId: fixedSeries.id,
        seasonId: fixedSeries.seasonId,
        seasonNumber: fixedSeries.seasonNumber,
        episodeNumber,
      }),
    });
    const data = (await response.json()) as {
      id?: string;
      slug?: string;
      error?: string;
    };
    if (!response.ok || !data.id || !data.slug) {
      setError(data.error ?? "Анги үүсгэж чадсангүй.");
      return;
    }
    setItems((current) => [
      {
        id: data.id!,
        slug: data.slug!,
        title: title.trim(),
        synopsis: synopsis.trim(),
        year: new Date().getFullYear(),
        duration: "Видео хүлээж байна",
        age: ageRating,
        rating: 0,
        genre: selectedCategories,
        kind: "series",
        status: "published",
        accent: "#581018",
        subtitles: [],
        seriesTitle: fixedSeries.title,
        seasonNumber: fixedSeries.seasonNumber,
        episodeNumber,
      },
      ...current,
    ]);
    setOpen(false);
    reset();
  }
  const resetTrack = () => {
    setTrackId(undefined);
    setSubtitleLabel("Монгол");
    setSubtitleLanguage("mn");
    setSubtitleFilename("subtitle.vtt");
    setSubtitleContent("");
    if (subtitleInput.current) subtitleInput.current.value = "";
  };
  const closeSubtitles = () => {
    subtitleRequest.current?.abort();
    subtitleRequest.current = null;
    setSubtitleMovie(null);
    setTracks([]);
    resetTrack();
    setError("");
  };
  async function saveSubtitle(event: React.FormEvent) {
    event.preventDefault();
    if (!subtitleMovie) return;
    setSubtitleSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/movies/${subtitleMovie.id}/subtitles`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            trackId,
            label: subtitleLabel,
            language: subtitleLanguage,
            filename: subtitleFilename,
            content: subtitleContent,
          }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        track: SubtitleTrack;
        subtitles: SubtitleTrack[];
      };
      if (!response.ok)
        throw new Error(data.error ?? "Subtitle хадгалж чадсангүй.");
      const nextTracks = (data.subtitles as SubtitleTrack[]).map((track) =>
        track.id === data.track.id
          ? { ...track, content: subtitleContent }
          : (tracks.find((item) => item.id === track.id) ?? {
              ...track,
              content: "",
            }),
      );
      setTracks(nextTracks);
      setItems((current) =>
        current.map((item) =>
          item.id === subtitleMovie.id
            ? { ...item, subtitles: data.subtitles }
            : item,
        ),
      );
      resetTrack();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Subtitle хадгалж чадсангүй.",
      );
    } finally {
      setSubtitleSaving(false);
    }
  }
  async function removeTrack(id: string) {
    if (!subtitleMovie) return;
    const response = await fetch(
      `/api/admin/movies/${subtitleMovie.id}/subtitles?trackId=${id}`,
      { method: "DELETE" },
    );
    if (response.ok) {
      const data = (await response.json()) as { subtitles: SubtitleTrack[] };
      setTracks((current) => current.filter((track) => track.id !== id));
      setItems((current) =>
        current.map((item) =>
          item.id === subtitleMovie.id
            ? { ...item, subtitles: data.subtitles }
            : item,
        ),
      );
      if (trackId === id) resetTrack();
    }
  }
  async function savePoster(event: React.FormEvent) {
    event.preventDefault();
    if (!posterMovie || !posterFile) return;
    setPosterSaving(true);
    setError("");
    try {
      const form = new FormData();
      form.append("poster", posterFile);
      const response = await fetch(
        `/api/admin/movies/${posterMovie.id}/poster`,
        { method: "POST", body: form },
      );
      const data = (await response.json()) as {
        posterUrl?: string;
        error?: string;
      };
      if (!response.ok || !data.posterUrl)
        throw new Error(data.error ?? "Thumbnail хадгалж чадсангүй.");
      setItems((current) =>
        current.map((item) =>
          item.id === posterMovie.id
            ? { ...item, posterUrl: data.posterUrl }
            : item,
        ),
      );
      setPosterMovie(null);
      setPosterFile(null);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Thumbnail хадгалж чадсангүй.",
      );
    } finally {
      setPosterSaving(false);
    }
  }
  async function saveBackdrop() {
    if (!posterMovie || !backdropFile) return;
    setBackdropSaving(true); setError("");
    try {
      const form = new FormData(); form.append("backdrop", backdropFile);
      const response = await fetch(`/api/admin/movies/${posterMovie.id}/backdrop`, { method: "POST", body: form });
      const data = await response.json() as { backdropUrl?: string; error?: string };
      if (!response.ok || !data.backdropUrl) throw new Error(data.error ?? "Hero зураг хадгалж чадсангүй.");
      setItems((current) => current.map((item) => item.id === posterMovie.id ? { ...item, backdropUrl: data.backdropUrl } : item));
      setPosterMovie((current) => current ? { ...current, backdropUrl: data.backdropUrl } : current); setBackdropFile(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Hero зураг хадгалж чадсангүй."); }
    finally { setBackdropSaving(false); }
  }
  async function saveBackdropLayout() {
    if (!posterMovie) return;
    setLayoutSaving(true); setError("");
    try {
      const response = await fetch(`/api/admin/movies/${posterMovie.id}/backdrop-layout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: backdropX, y: backdropY, zoom: backdropZoom }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Зургийн байрлал хадгалж чадсангүй.");
      const layout = { backdropPositionX: backdropX, backdropPositionY: backdropY, backdropZoom };
      setItems((current) => current.map((item) => item.id === posterMovie.id ? { ...item, ...layout } : item));
      setPosterMovie((current) => current ? { ...current, ...layout } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Зургийн байрлал хадгалж чадсангүй."); }
    finally { setLayoutSaving(false); }
  }
  async function setFeatured(movie: ContentItem) {
    setError("");
    const response = await fetch(`/api/admin/movies/${movie.id}/feature`, { method: "POST" });
    const data = await response.json() as { error?: string };
    if (!response.ok) { setError(data.error ?? "Нүүрэнд онцолж чадсангүй."); return; }
    setItems((current) => current.map((item) => ({ ...item, featured: item.id === movie.id })));
  }
  function openEditor(movie: ContentItem) {
    setEditMovie(movie);
    setEditTitle(movie.title);
    setEditSynopsis(movie.synopsis);
    setEditCategories(movie.genre);
    setEditAgeRating(movie.age);
    setEditSeriesTitle(movie.seriesTitle ?? "");
    setEditSeasonNumber(movie.seasonNumber ?? 1);
    setEditEpisodeNumber(movie.episodeNumber ?? 1);
    setError("");
  }
  async function saveMovie(event: React.FormEvent) {
    event.preventDefault();
    if (!editMovie) return;
    if (
      !editTitle.trim() ||
      !editSynopsis.trim() ||
      editCategories.length === 0
    ) {
      setError("Нэр, тайлбар болон ангиллыг бүрэн оруулна уу.");
      return;
    }
    setEditSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/movies/${editMovie.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          synopsis: editSynopsis.trim(),
          categories: editCategories,
          ageRating: editAgeRating,
          seriesTitle:
            editMovie.kind === "series" ? editSeriesTitle.trim() : undefined,
          seasonNumber:
            editMovie.kind === "series" ? editSeasonNumber : undefined,
          episodeNumber:
            editMovie.kind === "series" ? editEpisodeNumber : undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Киног засаж чадсангүй.");
      setItems((current) =>
        current.map((item) =>
          item.id === editMovie.id
            ? {
                ...item,
                title: editTitle.trim(),
                synopsis: editSynopsis.trim(),
                genre: editCategories,
                age: editAgeRating,
                seriesTitle: editSeriesTitle.trim() || undefined,
                seasonNumber: editSeasonNumber,
                episodeNumber: editEpisodeNumber,
              }
            : item,
        ),
      );
      setEditMovie(null);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Киног засаж чадсангүй.",
      );
    } finally {
      setEditSaving(false);
    }
  }
  async function deleteMovie(movie: ContentItem) {
    if (
      !window.confirm(
        `“${movie.title}” киног видео, зураг, subtitle-тай нь бүрэн устгах уу?`,
      )
    )
      return;
    setError("");
    const response = await fetch(`/api/admin/movies/${movie.id}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Киног устгаж чадсангүй.");
      return;
    }
    setItems((current) => current.filter((item) => item.id !== movie.id));
  }
  return (
    <>
      <div className="admin-toolbar">
        <div>
          <h1>{mode === "series" ? "Олон ангит" : "Кино"}</h1>
          <p>{items.length} бүтээл · каталогийн удирдлага</p>
        </div>
        <button className="primary-button" onClick={() => setOpen(true)}>
          ＋ {mode === "series" ? "Анги" : "Кино"} upload хийх
        </button>
      </div>
      <div className="admin-table">
        <div className="table-head">
          <span>БҮТЭЭЛ</span>
          <span>ТӨРӨЛ</span>
          <span>ТӨЛӨВ</span>
          <span>ОН</span>
          <span />
        </div>
        {items.map((item) => (
          <div className="table-row" key={item.id}>
            <div className="title-cell">
              <i className={item.posterUrl ? "has-thumbnail" : ""} style={{ background: item.posterUrl ? `url(${item.posterUrl}) center/cover no-repeat` : item.accent }} />
              <span>
                <b>{item.title}</b>
                <small>
                  {item.videoKey
                    ? `${item.kind === "series" && item.seriesTitle ? `${item.seriesTitle} · S${item.seasonNumber} E${item.episodeNumber} · ` : ""}Видео · ${item.subtitles?.length ?? 0} subtitle`
                    : item.slug}
                </small>
              </span>
            </div>
            <span>{item.kind === "movie" ? "Кино" : "Цуврал"}</span>
            <span className={`status ${item.status}`}>
              {item.status === "published"
                ? "Нийтэлсэн"
                : item.status === "processing"
                  ? "Боловсруулж байна"
                  : "Ноорог"}
            </span>
            <span>{item.year}</span>
            <div className="row-actions">
              <button
                className="row-action"
                onClick={() => {
                  setPosterMovie(item);
                  setPosterFile(null);
                  setBackdropFile(null);
                  setBackdropX(item.backdropPositionX ?? 50);
                  setBackdropY(item.backdropPositionY ?? 50);
                  setBackdropZoom(item.backdropZoom ?? 100);
                }}
              >
                Зураг
              </button>
              <button className={`row-action ${item.featured ? "featured" : ""}`} onClick={() => void setFeatured(item)}>
                {item.featured ? "★ Нүүрэнд" : "☆ Онцлох"}
              </button>
              <button
                className="row-action"
                onClick={() => void openSubtitles(item)}
              >
                CC
              </button>
              <button className="row-action" onClick={() => openEditor(item)}>
                Засах
              </button>
              <button
                className="row-action danger"
                onClick={() => void deleteMovie(item)}
              >
                Устгах
              </button>
            </div>
          </div>
        ))}
      </div>
      {open && (
        <div className="modal-backdrop">
          <form className="admin-modal upload-modal" onSubmit={uploadMovie}>
            <div className="modal-title">
              <div>
                <p className="section-kicker">ШИНЭ КОНТЕНТ</p>
                <h2>
                  {mode === "series"
                    ? "Шинэ анги upload хийх"
                    : "Кино upload хийх"}
                </h2>
              </div>
              <button type="button" onClick={close}>
                ×
              </button>
            </div>
            {mode === "series" && !fixedSeries && (
              <div className="upload-options-grid series-fields">
                <label>
                  Цувралын нэр <span>*</span>
                  <input
                    value={seriesTitle}
                    onChange={(event) => setSeriesTitle(event.target.value)}
                    placeholder="Жишээ: Хотын түүх"
                  />
                </label>
                <label>
                  Улирал
                  <input
                    type="number"
                    min="1"
                    value={seasonNumber}
                    onChange={(event) =>
                      setSeasonNumber(Number(event.target.value))
                    }
                  />
                </label>
                <label>
                  Анги
                  <input
                    type="number"
                    min="1"
                    value={episodeNumber}
                    onChange={(event) =>
                      setEpisodeNumber(Number(event.target.value))
                    }
                  />
                </label>
              </div>
            )}
            {mode === "series" && fixedSeries && (
              <div className="upload-options-grid fixed-episode-field">
                <label>
                  Ангийн дугаар <span>*</span>
                  <input type="number" min="1" value={episodeNumber} onChange={(event) => setEpisodeNumber(Number(event.target.value))} />
                </label>
              </div>
            )}
            <div className="upload-form-grid">
              <label>
                Киноны нэр <span>*</span>
                <input
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Жишээ: Алсын бараа"
                />
              </label>
              <label>
                Тайлбар <span>*</span>
                <textarea
                  value={synopsis}
                  onChange={(event) => setSynopsis(event.target.value)}
                  placeholder="Киноны товч агуулга..."
                />
              </label>
            </div>
            <div className="upload-options-grid">
              {!forcedAgeRating && (
                <label>
                  Насны ангилал
                  <select
                    value={ageRating}
                    onChange={(event) => setAgeRating(event.target.value)}
                  >
                    <option value="Бүх нас">Бүх нас</option>
                    <option value="6+">6+</option>
                    <option value="13+">13+</option>
                    <option value="16+">16+</option>
                    <option value="18+">18+</option>
                  </select>
                </label>
              )}
              <label>
                Upload дараах чанар
                <select
                  value={targetQuality}
                  onChange={(event) => setTargetQuality(event.target.value)}
                >
                  <option value="original">Эх чанараар хадгалах</option>
                  <option value="720">720p болгон багасгах</option>
                  <option value="480">480p болгон багасгах</option>
                </select>
                <small>Чанар бууруулах үед MP4/H.264 болгон шахна.</small>
              </label>
            </div>
            <fieldset>
              <legend>
                Ангилал <span>*</span>
              </legend>
              <div className="category-picker">
                {categories.map((category) => (
                  <button
                    type="button"
                    className={
                      selectedCategories.includes(category) ? "selected" : ""
                    }
                    onClick={() => toggleCategory(category)}
                    key={category}
                  >
                    {selectedCategories.includes(category) ? "✓ " : "+ "}
                    {category}
                  </button>
                ))}
              </div>
            </fieldset>
            <div
              className={`video-dropzone ${video ? "has-file" : ""}`}
              onClick={() => fileInput.current?.click()}
            >
              <input
                ref={fileInput}
                type="file"
                accept="video/mp4,video/mp2t,video/mpeg,application/x-mpegURL,application/vnd.apple.mpegurl,.mp4,.ts,.m3u8"
                onChange={(event) => setVideo(event.target.files?.[0] ?? null)}
              />
              <i>{video ? "✓" : "↑"}</i>
              <div>
                <b>{video ? video.name : "Видео файлаа энд сонгоно уу"}</b>
                <span>
                  {video
                    ? `${(video.size / 1024 / 1024).toFixed(1)} MB · Солих бол дарна уу`
                    : "MP4, TS, M3U8"}
                </span>
              </div>
            </div>
            {uploadState !== "idle" && (
              <div className={`upload-progress ${uploadState}`}>
                <div>
                  <b>
                    {uploadState === "uploading"
                      ? `Upload хийж байна — ${progress}%`
                      : uploadState === "processing"
                        ? targetQuality === "original"
                          ? "Бүртгэл үүсгэж байна…"
                          : `${targetQuality}p болгон шахаж байна… Энэ хэсэг хугацаа авна.`
                        : uploadState === "done"
                          ? "Амжилттай хадгаллаа"
                          : "Upload амжилтгүй"}
                  </b>
                </div>
                <div className="progress-track">
                  <i style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            {error && <p className="form-error">⚠ {error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={close}>
                Болих
              </button>
              {mode === "series" && fixedSeries && (
                <button
                  type="button"
                  onClick={() => void createEpisodeWithoutVideo()}
                >
                  Зөвхөн анги үүсгэх
                </button>
              )}
              <button
                className="primary-button"
                disabled={
                  uploadState === "uploading" || uploadState === "processing"
                }
              >
                Upload хийгээд хадгалах
              </button>
            </div>
          </form>
        </div>
      )}
      {subtitleMovie && (
        <div className="modal-backdrop">
          <div className="admin-modal subtitle-modal">
            <div className="modal-title">
              <div>
                <p className="section-kicker">SUBTITLE УДИРДЛАГА</p>
                <h2>{subtitleMovie.title}</h2>
              </div>
              <button
                onClick={closeSubtitles}
              >
                ×
              </button>
            </div>
            <div className="subtitle-layout">
              <aside>
                <b>Нэмсэн subtitle</b>
                {tracks.length === 0 && <p>Одоогоор subtitle байхгүй.</p>}
                {tracks.map((track) => (
                  <div
                    className={track.id === trackId ? "active" : ""}
                    key={track.id}
                  >
                    <button
                      onClick={() => {
                        setTrackId(track.id);
                        setSubtitleLabel(track.label);
                        setSubtitleLanguage(track.language);
                        setSubtitleFilename(track.originalFilename);
                        setSubtitleContent(track.content);
                      }}
                    >
                      <strong>{track.label}</strong>
                      <small>
                        {track.language.toUpperCase()} ·{" "}
                        {track.originalFilename}
                      </small>
                    </button>
                    <button
                      className="delete-track"
                      onClick={() => void removeTrack(track.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </aside>
              <form onSubmit={saveSubtitle}>
                <div className="subtitle-fields">
                  <label>
                    Харагдах нэр
                    <input
                      value={subtitleLabel}
                      onChange={(event) => setSubtitleLabel(event.target.value)}
                    />
                  </label>
                  <label>
                    Хэлний код
                    <input
                      value={subtitleLanguage}
                      onChange={(event) =>
                        setSubtitleLanguage(event.target.value)
                      }
                      placeholder="mn"
                    />
                  </label>
                </div>
                <label className="subtitle-file">
                  SRT эсвэл VTT файл
                  <input
                    ref={subtitleInput}
                    type="file"
                    accept=".srt,.vtt,text/vtt"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        setSubtitleFilename(file.name);
                        setSubtitleContent(await file.text());
                      }
                    }}
                  />
                </label>
                <label>
                  Subtitle агуулга
                  <textarea
                    className="subtitle-editor"
                    value={subtitleContent}
                    onChange={(event) => setSubtitleContent(event.target.value)}
                    placeholder={
                      "WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nСайн байна уу."
                    }
                  />
                </label>
                {error && <p className="form-error">⚠ {error}</p>}
                <div className="modal-actions">
                  <button type="button" onClick={resetTrack}>
                    Шинэ
                  </button>
                  <button className="primary-button" disabled={subtitleSaving}>
                    {subtitleSaving
                      ? "Хадгалж байна…"
                      : trackId
                        ? "Засварыг хадгалах"
                        : "Subtitle нэмэх"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {posterMovie && (
        <div className="modal-backdrop">
          <form className="admin-modal poster-modal" onSubmit={savePoster}>
            <div className="modal-title">
              <div>
                <p className="section-kicker">THUMBNAIL / POSTER</p>
                <h2>{posterMovie.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPosterMovie(null);
                  setPosterFile(null);
                  setBackdropFile(null);
                  setError("");
                }}
              >
                ×
              </button>
            </div>
            <div className="poster-editor">
              <div
                className="poster-preview"
                style={{
                  backgroundImage: posterFile
                    ? `url(${URL.createObjectURL(posterFile)})`
                    : posterMovie.posterUrl
                      ? `url(${posterMovie.posterUrl})`
                      : undefined,
                }}
              >
                {!posterFile && !posterMovie.posterUrl && (
                  <span>2:3 POSTER</span>
                )}
              </div>
              <label>
                Thumbnail зураг
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setPosterFile(event.target.files?.[0] ?? null)
                  }
                />
                <small>JPG, PNG, WEBP · 2:3 харьцаа · 8MB хүртэл</small>
              </label>
            </div>
            <div className="backdrop-editor">
              <div className="backdrop-preview">
                {(backdropFile || posterMovie.backdropUrl) && <div className="backdrop-preview-image" style={{ backgroundImage: `url(${backdropFile ? URL.createObjectURL(backdropFile) : posterMovie.backdropUrl})`, backgroundPosition: `${backdropX}% ${backdropY}%`, transform: `scale(${backdropZoom / 100})`, transformOrigin: `${backdropX}% ${backdropY}%` }} />}
                {!backdropFile && !posterMovie.backdropUrl && <span>16:9 HERO BACKDROP</span>}
              </div>
              <label>Нүүрний өргөн зураг<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setBackdropFile(event.target.files?.[0] ?? null)} /><small>16:9 · 1920×1080 санал болгоно · 12MB хүртэл</small></label>
              <button type="button" className="row-action" disabled={!backdropFile || backdropSaving} onClick={() => void saveBackdrop()}>{backdropSaving ? "Хадгалж байна…" : "Hero зураг хадгалах"}</button>
              <div className="backdrop-layout">
                <label>Хэвтээ байрлал <b>{backdropX}%</b><input type="range" min="0" max="100" value={backdropX} onChange={(event) => setBackdropX(Number(event.target.value))} /></label>
                <label>Босоо байрлал <b>{backdropY}%</b><input type="range" min="0" max="100" value={backdropY} onChange={(event) => setBackdropY(Number(event.target.value))} /></label>
                <label>Crop / Zoom <b>{backdropZoom}%</b><input type="range" min="100" max="200" value={backdropZoom} onChange={(event) => setBackdropZoom(Number(event.target.value))} /></label>
                <button type="button" className="row-action backdrop-layout-save" disabled={layoutSaving || !posterMovie.backdropUrl} onClick={() => void saveBackdropLayout()}>{layoutSaving ? "Хадгалж байна…" : "Байрлалыг хадгалах"}</button>
              </div>
            </div>
            {error && <p className="form-error">⚠ {error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={() => setPosterMovie(null)}>
                Болих
              </button>
              <button
                className="primary-button"
                disabled={!posterFile || posterSaving}
              >
                {posterSaving ? "Хадгалж байна…" : "Thumbnail хадгалах"}
              </button>
            </div>
          </form>
        </div>
      )}
      {editMovie && (
        <div className="modal-backdrop">
          <form className="admin-modal edit-movie-modal" onSubmit={saveMovie}>
            <div className="modal-title">
              <div>
                <p className="section-kicker">КИНО ЗАСАХ</p>
                <h2>{editMovie.title}</h2>
              </div>
              <button type="button" onClick={() => setEditMovie(null)}>
                ×
              </button>
            </div>
            <label>
              Киноны нэр
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
              />
            </label>
            <label>
              Тайлбар
              <textarea
                value={editSynopsis}
                onChange={(event) => setEditSynopsis(event.target.value)}
              />
            </label>
            <label>
              Насны ангилал
              <select
                value={editAgeRating}
                onChange={(event) => setEditAgeRating(event.target.value)}
              >
                <option value="Бүх нас">Бүх нас</option>
                <option value="6+">6+</option>
                <option value="12+">12+</option>
                <option value="13+">13+</option>
                <option value="16+">16+</option>
                <option value="18+">18+</option>
              </select>
            </label>
            {editMovie.kind === "series" && (
              <div className="upload-options-grid series-fields">
                <label>
                  Цувралын нэр
                  <input
                    value={editSeriesTitle}
                    onChange={(event) => setEditSeriesTitle(event.target.value)}
                  />
                </label>
                <label>
                  Улирал
                  <input
                    type="number"
                    min="1"
                    value={editSeasonNumber}
                    onChange={(event) =>
                      setEditSeasonNumber(Number(event.target.value))
                    }
                  />
                </label>
                <label>
                  Анги
                  <input
                    type="number"
                    min="1"
                    value={editEpisodeNumber}
                    onChange={(event) =>
                      setEditEpisodeNumber(Number(event.target.value))
                    }
                  />
                </label>
              </div>
            )}
            <fieldset>
              <legend>Ангилал</legend>
              <div className="category-picker">
                {categories.map((category) => (
                  <button
                    type="button"
                    className={
                      editCategories.includes(category) ? "selected" : ""
                    }
                    onClick={() =>
                      setEditCategories((current) =>
                        current.includes(category)
                          ? current.filter((item) => item !== category)
                          : [...current, category],
                      )
                    }
                    key={category}
                  >
                    {editCategories.includes(category) ? "✓ " : "+ "}
                    {category}
                  </button>
                ))}
              </div>
            </fieldset>
            {error && <p className="form-error">⚠ {error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={() => setEditMovie(null)}>
                Болих
              </button>
              <button className="primary-button" disabled={editSaving}>
                {editSaving ? "Хадгалж байна…" : "Өөрчлөлт хадгалах"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
