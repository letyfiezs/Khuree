import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  MovieStorage,
  NewMovieRecord,
  StoredMovieRecord,
  SubtitleTrack,
} from "./types";

const projectRoot = process.cwd();
export const storageRoot = path.resolve(
  projectRoot,
  process.env.LOCAL_STORAGE_DIR ?? "storage",
);
export const videosRoot = path.join(storageRoot, "videos");
export const uploadsRoot = path.join(storageRoot, ".uploads");
export const subtitlesRoot = path.join(storageRoot, "subtitles");
export const postersRoot = path.join(storageRoot, "posters");
const databasePath = path.join(storageRoot, "khuree.db");

function openDatabase() {
  mkdirSync(videosRoot, { recursive: true });
  mkdirSync(uploadsRoot, { recursive: true });
  mkdirSync(subtitlesRoot, { recursive: true });
  mkdirSync(postersRoot, { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec(
    `CREATE TABLE IF NOT EXISTS movies (id TEXT PRIMARY KEY,slug TEXT NOT NULL UNIQUE,title TEXT NOT NULL,synopsis TEXT NOT NULL,categories TEXT NOT NULL,video_key TEXT NOT NULL,original_filename TEXT NOT NULL,content_type TEXT,bytes INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'published',created_by TEXT NOT NULL,created_at TEXT NOT NULL,subtitles TEXT NOT NULL DEFAULT '[]',poster_key TEXT,age_rating TEXT NOT NULL DEFAULT '13+',kind TEXT NOT NULL DEFAULT 'movie',series_title TEXT,season_number INTEGER,episode_number INTEGER,series_id TEXT,season_id TEXT)`,
  );
  const columns = database.prepare("PRAGMA table_info(movies)").all() as {
    name: string;
  }[];
  if (!columns.some((column) => column.name === "subtitles"))
    database.exec(
      `ALTER TABLE movies ADD COLUMN subtitles TEXT NOT NULL DEFAULT '[]'`,
    );
  if (!columns.some((column) => column.name === "poster_key"))
    database.exec(`ALTER TABLE movies ADD COLUMN poster_key TEXT`);
  if (!columns.some((column) => column.name === "age_rating"))
    database.exec(
      `ALTER TABLE movies ADD COLUMN age_rating TEXT NOT NULL DEFAULT '13+'`,
    );
  if (!columns.some((column) => column.name === "kind"))
    database.exec(
      `ALTER TABLE movies ADD COLUMN kind TEXT NOT NULL DEFAULT 'movie'`,
    );
  if (!columns.some((column) => column.name === "series_title"))
    database.exec(`ALTER TABLE movies ADD COLUMN series_title TEXT`);
  if (!columns.some((column) => column.name === "season_number"))
    database.exec(`ALTER TABLE movies ADD COLUMN season_number INTEGER`);
  if (!columns.some((column) => column.name === "episode_number"))
    database.exec(`ALTER TABLE movies ADD COLUMN episode_number INTEGER`);
  if (!columns.some((column) => column.name === "series_id"))
    database.exec(`ALTER TABLE movies ADD COLUMN series_id TEXT`);
  if (!columns.some((column) => column.name === "season_id"))
    database.exec(`ALTER TABLE movies ADD COLUMN season_id TEXT`);
  database.exec(
    `CREATE INDEX IF NOT EXISTS idx_movies_status_created_at ON movies(status,created_at DESC)`,
  );
  database.exec(
    `UPDATE movies SET status='published' WHERE status='processing'`,
  );
  database.exec("PRAGMA optimize");
  return database;
}

function mapRow(row: Record<string, unknown>): StoredMovieRecord {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    synopsis: String(row.synopsis),
    categories: JSON.parse(String(row.categories)) as string[],
    videoKey: String(row.video_key),
    originalFilename: String(row.original_filename),
    contentType: String(row.content_type ?? ""),
    bytes: Number(row.bytes),
    status: String(row.status) as StoredMovieRecord["status"],
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    subtitles: JSON.parse(String(row.subtitles ?? "[]")) as SubtitleTrack[],
    posterKey: row.poster_key ? String(row.poster_key) : undefined,
    ageRating: String(row.age_rating ?? "13+"),
    kind: row.kind === "series" ? "series" : "movie",
    seriesTitle: row.series_title ? String(row.series_title) : undefined,
    seasonNumber: row.season_number ? Number(row.season_number) : undefined,
    episodeNumber: row.episode_number ? Number(row.episode_number) : undefined,
    seriesId: row.series_id ? String(row.series_id) : undefined,
    seasonId: row.season_id ? String(row.season_id) : undefined,
  };
}

export const localMovieStorage: MovieStorage = {
  createMovie(input: NewMovieRecord) {
    const database = openDatabase();
    try {
      const id = crypto.randomUUID();
      const slug = `movie-${id.slice(0, 8)}`;
      const createdAt = new Date().toISOString();
      database
        .prepare(
          `INSERT INTO movies (id,slug,title,synopsis,categories,video_key,original_filename,content_type,bytes,status,created_by,created_at,subtitles,age_rating,kind,series_title,season_number,episode_number,series_id,season_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          id,
          slug,
          input.title,
          input.synopsis,
          JSON.stringify(input.categories),
          input.videoKey,
          input.originalFilename,
          input.contentType,
          input.bytes,
          "published",
          input.createdBy,
          createdAt,
          JSON.stringify(input.subtitles ?? []),
          input.ageRating ?? "13+",
          input.kind ?? "movie",
          input.seriesTitle ?? null,
          input.seasonNumber ?? null,
          input.episodeNumber ?? null,
          input.seriesId ?? null,
          input.seasonId ?? null,
        );
      return {
        ...input,
        subtitles: input.subtitles ?? [],
        id,
        slug,
        status: "published",
        createdAt,
        ageRating: input.ageRating ?? "13+",
        kind: input.kind ?? "movie",
      };
    } finally {
      database.close();
    }
  },
  listMovies() {
    const database = openDatabase();
    try {
      const rows = database
        .prepare(`SELECT * FROM movies ORDER BY created_at DESC`)
        .all() as Record<string, unknown>[];
      return rows.map(mapRow);
    } finally {
      database.close();
    }
  },
  getMovie(id: string) {
    const database = openDatabase();
    try {
      const row = database
        .prepare(`SELECT * FROM movies WHERE id=?`)
        .get(id) as Record<string, unknown> | undefined;
      return row ? mapRow(row) : undefined;
    } finally {
      database.close();
    }
  },
  updateSubtitles(id: string, subtitles: SubtitleTrack[]) {
    const database = openDatabase();
    try {
      database
        .prepare(`UPDATE movies SET subtitles=? WHERE id=?`)
        .run(JSON.stringify(subtitles), id);
      const row = database
        .prepare(`SELECT * FROM movies WHERE id=?`)
        .get(id) as Record<string, unknown> | undefined;
      return row ? mapRow(row) : undefined;
    } finally {
      database.close();
    }
  },
  updatePoster(id: string, posterKey: string) {
    const database = openDatabase();
    try {
      database
        .prepare(`UPDATE movies SET poster_key=? WHERE id=?`)
        .run(posterKey, id);
      const row = database
        .prepare(`SELECT * FROM movies WHERE id=?`)
        .get(id) as Record<string, unknown> | undefined;
      return row ? mapRow(row) : undefined;
    } finally {
      database.close();
    }
  },
  updateMovie(
    id: string,
    input: {
      title: string;
      synopsis: string;
      categories: string[];
      ageRating: string;
      seriesTitle?: string;
      seasonNumber?: number;
      episodeNumber?: number;
    },
  ) {
    const database = openDatabase();
    try {
      database
        .prepare(
          `UPDATE movies SET title=?,synopsis=?,categories=?,age_rating=?,series_title=?,season_number=?,episode_number=? WHERE id=?`,
        )
        .run(
          input.title,
          input.synopsis,
          JSON.stringify(input.categories),
          input.ageRating,
          input.seriesTitle ?? null,
          input.seasonNumber ?? null,
          input.episodeNumber ?? null,
          id,
        );
      const row = database
        .prepare(`SELECT * FROM movies WHERE id=?`)
        .get(id) as Record<string, unknown> | undefined;
      return row ? mapRow(row) : undefined;
    } finally {
      database.close();
    }
  },
  deleteMovie(id: string) {
    const database = openDatabase();
    try {
      const row = database
        .prepare(`SELECT * FROM movies WHERE id=?`)
        .get(id) as Record<string, unknown> | undefined;
      if (!row) return undefined;
      database.prepare(`DELETE FROM movies WHERE id=?`).run(id);
      return mapRow(row);
    } finally {
      database.close();
    }
  },
  updateVideo(id, input) {
    const database = openDatabase();
    try {
      database
        .prepare(
          `UPDATE movies SET video_key=?,original_filename=?,content_type=?,bytes=?,status='published' WHERE id=?`,
        )
        .run(
          input.videoKey,
          input.originalFilename,
          input.contentType,
          input.bytes,
          id,
        );
      const row = database
        .prepare(`SELECT * FROM movies WHERE id=?`)
        .get(id) as Record<string, unknown> | undefined;
      return row ? mapRow(row) : undefined;
    } finally {
      database.close();
    }
  },
};
