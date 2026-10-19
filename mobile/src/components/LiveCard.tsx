import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LiveChannel } from '../types/content';
import { colors, radii } from '../theme';
import { CachedImage } from './CachedImage';

export function LiveCard({
  channel,
  active,
  onPress,
}: {
  channel: LiveChannel;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.row, active && styles.active]}>
      <View style={[styles.mark, { backgroundColor: channel.accent }]}>
        <Text style={styles.markText}>{channel.name.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.name}>{channel.name}</Text>
        <Text style={styles.category}>{channel.category}</Text>
      </View>
      <Text style={styles.live}>LIVE</Text>
    </Pressable>
  );
}

export function LivePoster({
  title,
  posterUrl,
  rank,
  viewers,
  onPress,
}: {
  title: string;
  posterUrl?: string | null;
  rank: number;
  viewers: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.poster}>
        {posterUrl ? <CachedImage uri={posterUrl} style={styles.fill} /> : (
          <Text style={styles.fallback}>{title}</Text>
        )}
        <Text style={styles.rank}>#{rank}</Text>
        <Text style={styles.viewers}>{viewers} хүн үзэж байна</Text>
      </View>
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: '#111',
    marginBottom: 8,
  },
  active: { borderWidth: 1, borderColor: colors.red, backgroundColor: colors.darkPrimary },
  mark: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  markText: { color: '#fff', fontFamily: 'Rubik-Bold', fontSize: 12 },
  copy: { flex: 1 },
  name: { color: '#fff', fontFamily: 'Rubik-Medium', fontSize: 14, lineHeight: 20 },
  category: { color: colors.dim, fontSize: 12, lineHeight: 16, fontFamily: 'Rubik-Regular', marginTop: 4 },
  live: { color: colors.red, fontFamily: 'Rubik-Bold', fontSize: 12, lineHeight: 16 },
  card: { width: 132, marginRight: 12 },
  poster: {
    height: 198,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.accent,
    justifyContent: 'center',
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  fallback: { color: '#fff', textAlign: 'center', fontFamily: 'Rubik-Bold', padding: 8 },
  rank: { position: 'absolute', top: 8, left: 8, color: '#fff', fontFamily: 'Rubik-Medium', fontSize: 18, lineHeight: 28 },
  viewers: { position: 'absolute', bottom: 8, left: 8, right: 8, color: '#fff', fontSize: 12, lineHeight: 16, fontFamily: 'Rubik-Medium' },
  title: { color: '#fff', marginTop: 8, fontFamily: 'Rubik-Medium', fontSize: 14, lineHeight: 20 },
});
