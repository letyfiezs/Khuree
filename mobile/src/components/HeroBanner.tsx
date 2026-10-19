import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { ContentItem } from '../types/content';
import { colors, fonts } from '../theme';
import { Button } from './ui/Button';
import { CachedImage } from './CachedImage';

type Props = {
  item: ContentItem;
  onPlay: () => void;
  onDetails: () => void;
};

export function HeroBanner({ item, onPlay, onDetails }: Props) {
  const { height } = useWindowDimensions();
  const art = item.backdropUrl || item.posterUrl;
  return (
    <View style={[styles.hero, { height: Math.min(560, height * 0.62) }]}>
      {art ? (
        <CachedImage uri={art} style={styles.art} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: item.accent || colors.accent }]} />
      )}
      <View style={styles.scrim} />
      <View style={styles.content}>
        <Text style={styles.kicker}>●  ШИНЭЭР НЭМЭГДСЭН</Text>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{item.year}</Text>
          <Text style={styles.age}>{item.age}</Text>
          <Text style={styles.hd}>HD</Text>
        </View>
        <Text numberOfLines={3} style={styles.copy}>
          {item.synopsis}
        </Text>
        <View style={styles.actions}>
          <Button label="▶  Үзэх" onPress={onPlay} />
          <Button variant="outline" label="ⓘ  Дэлгэрэнгүй" onPress={onDetails} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', justifyContent: 'flex-end' },
  art: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,8,8,0.45)',
  },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  kicker: { color: colors.red, fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.4, marginBottom: 8 },
  title: { color: '#fff', fontSize: 24, lineHeight: 32, fontFamily: fonts.bold },
  meta: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  metaText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  age: {
    color: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  hd: { color: '#fff', fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
  copy: { color: colors.muted, marginTop: 12, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
});
