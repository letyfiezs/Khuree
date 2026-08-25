export const moviesSchema=`CREATE TABLE IF NOT EXISTS movies (
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
  synopsis TEXT NOT NULL, categories TEXT NOT NULL, video_key TEXT NOT NULL,
  original_filename TEXT NOT NULL, content_type TEXT, bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing', created_by TEXT NOT NULL, created_at TEXT NOT NULL,
  subtitles TEXT NOT NULL DEFAULT '[]'
)`;
