import type { MovieStorage } from './types';

// Future production adapter seam. Implement this interface with Supabase
// Database + Storage without changing the admin UI or upload form.
export const supabaseMovieStorage:MovieStorage={
 createMovie(){throw new Error('Supabase storage is not configured yet.')},
 listMovies(){return[]},
};
