import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ContentItem } from '../types/content';
import { colors, radii } from '../theme';
import { AgeBadge } from './AgeBadge';
import { CachedImage } from './CachedImage';
import { PremiumBadge } from './PremiumBadge';

type Props = {
  item: ContentItem;
  onPress: () => void;
  width?: number;
  blurred?: boolean;
};

export function MovieCard({ item, onPress, width, blurred }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.card, width ? { width } : styles.stretch]}>
      <View style={[styles.poster, { backgroundColor: item.accent || colors.accent }]}>
        {item.posterUrl ? <CachedImage uri={item.posterUrl} style={styles.image} blurred={blurred} /> : (
          <Text style={styles.fallback}>{item.title}</Text>
        )}
        {item.audioLabel ? (
          <Text style={styles.audio}>{item.audioLabel === 'Хэлтэй' ? 'ХЭЛ' : 'SUB'}</Text>
        ) : null}
        <PremiumBadge kind={item.kind} age={item.age} />
        <View style={styles.play}>
          <Text style={styles.playText}>▶</Text>
        </View>
      </View>
      <Text numberOfLines={1} style={styles.title}>
        {item.title}
      </Text>
      <Text numberOfLines={1} style={styles.meta}>
        {item.kind === 'series' ? `${item.episodes ?? 0} анги` : `${item.year} · ${item.genre.slice(0, 2).join(', ')}`}
      </Text>
      <AgeBadge age={item.age} />
    </Pressable>
  );
}

export function SeriesCard(props: Props) {
  return <MovieCard {...props} />;
}

const styles = StyleSheet.create({
  card: { marginRight: 12 },
  stretch: { marginRight: 0, width: '100%' },
  poster: {
    height: 198,
    borderRadius: radii.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  fallback: { color: '#fff', fontFamily: 'Rubik-Bold', padding: 8, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  audio: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#000c',
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Rubik-Bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  play: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playText: { color: '#fff', fontSize: 12, lineHeight: 16, fontFamily: 'Rubik-Bold' },
  title: { color: '#fff', fontFamily: 'Rubik-Medium', marginTop: 8, fontSize: 14, lineHeight: 20 },
  meta: { color: colors.dim, fontSize: 12, lineHeight: 16, fontFamily: 'Rubik-Regular', marginTop: 4 },
});
