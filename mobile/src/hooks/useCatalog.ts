import { useQuery } from '@tanstack/react-query';
import { fetchCatalog, fetchLiveNow, fetchMovie, fetchSeries } from '../api/khuree';
import type { ContentItem } from '../types/content';
import { isVerticalDrama } from '../utils/content';

export function useCatalog() {
  return useQuery({ queryKey: ['catalog'], queryFn: fetchCatalog, staleTime: 30_000 });
}

export function useLiveNow() {
  return useQuery({ queryKey: ['live-now'], queryFn: fetchLiveNow, refetchInterval: 10_000 });
}

export function useMovie(slug: string) {
  return useQuery({ queryKey: ['movie', slug], queryFn: () => fetchMovie(slug), enabled: Boolean(slug) });
}

export function useSeries(id: string) {
  return useQuery({ queryKey: ['series', id], queryFn: () => fetchSeries(id), enabled: Boolean(id) });
}

export function partitionCatalog(items: ContentItem[], popularIds: string[]) {
  const safe = items.filter(item => item.age !== '18+');
  const popular = [...safe].sort((a, b) => {
    const ai = popularIds.indexOf(a.id);
    const bi = popularIds.indexOf(b.id);
    return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
  });
  return {
    featured: safe.find(item => item.featured) ?? safe[0],
    movies: safe.filter(item => item.kind === 'movie' && !isVerticalDrama(item)),
    series: safe.filter(item => item.kind === 'series'),
    vertical: safe.filter(isVerticalDrama),
    adult: items.filter(item => item.age === '18+'),
    latest: safe,
    popular,
  };
}
