export type SubtitleTrack = {
  id: string;
  label: string;
  language: string;
  key: string;
  originalFilename: string;
};
export type NewMovieRecord = {
  title: string;
  synopsis: string;
  categories: string[];
  videoKey: string;
  originalFilename: string;
  contentType: string;
  bytes: number;
  createdBy: string;
  subtitles?: SubtitleTrack[];
  ageRating?: string;
  kind?: "movie" | "series";
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  seriesId?: string;
  seasonId?: string;
};
export type StoredMovieRecord = NewMovieRecord & {
  id: string;
  slug: string;
  status: "processing" | "draft" | "published";
  createdAt: string;
  posterKey?: string;
  ageRating: string;
  kind: "movie" | "series";
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  seriesId?: string;
  seasonId?: string;
};
export interface MovieStorage {
  createMovie(input: NewMovieRecord): StoredMovieRecord;
  listMovies(): StoredMovieRecord[];
  getMovie(id: string): StoredMovieRecord | undefined;
  updateSubtitles(
    id: string,
    subtitles: SubtitleTrack[],
  ): StoredMovieRecord | undefined;
  updatePoster(id: string, posterKey: string): StoredMovieRecord | undefined;
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
  ): StoredMovieRecord | undefined;
  deleteMovie(id: string): StoredMovieRecord | undefined;
  updateVideo(
    id: string,
    input: {
      videoKey: string;
      originalFilename: string;
      contentType: string;
      bytes: number;
    },
  ): StoredMovieRecord | undefined;
}
