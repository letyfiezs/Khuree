export type NewMovieRecord = { title:string; synopsis:string; categories:string[]; videoKey:string; originalFilename:string; contentType:string; bytes:number; createdBy:string };
export type StoredMovieRecord = NewMovieRecord & { id:string; slug:string; status:'processing'|'draft'|'published'; createdAt:string };
export interface MovieStorage { createMovie(input:NewMovieRecord):StoredMovieRecord; listMovies():StoredMovieRecord[] }
