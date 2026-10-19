import { useCallback, useEffect, useState } from 'react';
import type { ContentItem, RecentWatchItem } from '../types/content';
import { clearRecent, loadRecent } from '../services/storage';
import { MovieRail } from './MovieRail';

export function ContinueWatching({
  onPressItem,
}: {
  onPressItem: (item: Pick<ContentItem, 'id' | 'slug' | 'kind' | 'seriesId' | 'title'>) => void;
}) {
  const [items, setItems] = useState<RecentWatchItem[]>([]);
  const reload = useCallback(() => {
    void loadRecent().then(setItems);
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  if (!items.length) return null;
  return (
    <>
      <MovieRail
        kicker="ҮРГЭЛЖЛҮҮЛЭН ҮЗЭХ"
        title="Сүүлд үзсэн"
        items={items.map(item => ({
          id: item.id,
          slug: item.slug,
          title: item.seriesTitle || item.title,
          synopsis: '',
          year: item.year ?? 0,
          duration: '',
          age: item.age ?? '',
          rating: 0,
          genre: [],
          kind: item.kind ?? 'movie',
          status: 'published',
          accent: '#7f1018',
          posterUrl: item.posterUrl,
          seriesId: undefined,
          seasonNumber: item.seasonNumber,
          episodeNumber: item.episodeNumber,
          audioLabel: item.audioLabel,
        }))}
        onPressItem={item => onPressItem(item)}
        actionLabel="Жагсаалт цэвэрлэх"
        onSeeAll={() => {
          void clearRecent().then(() => setItems([]));
        }}
      />
    </>
  );
}

