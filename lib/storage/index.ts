import { localMovieStorage } from './local';
import { supabaseMovieStorage } from './supabase-adapter';
export const movieStorage=process.env.STORAGE_DRIVER==='supabase'?supabaseMovieStorage:localMovieStorage;
export type { NewMovieRecord,StoredMovieRecord,MovieStorage } from './types';
