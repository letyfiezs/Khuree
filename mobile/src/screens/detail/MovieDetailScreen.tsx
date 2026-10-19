import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CachedImage } from '../../components/CachedImage';
import { useMovie } from '../../hooks/useCatalog';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';

export function MovieDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { slug } = useRoute<RouteProp<RootStackParamList, 'MovieDetail'>>().params;
  const query = useMovie(slug);
  const insets = useSafeAreaInsets();
  const item = query.data;

  if (query.isLoading || !item) {
    return (
      <View style={styles.root}>
        <ActivityIndicator color={colors.red} style={{ marginTop: 120 }} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.hero}>
          {item.posterUrl ? (
            <CachedImage uri={item.backdropUrl || item.posterUrl} style={styles.art} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: item.accent }]} />
          )}
          <View style={styles.scrim} />
          <Pressable style={[styles.back, { top: insets.top + 8 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Буцах</Text>
          </Pressable>
        </View>
        <View style={styles.body}>
          <Text style={styles.kicker}>{item.hasVideo ? 'ШИНЭЭР НЭМЭГДСЭН' : 'ОНЦЛОХ БҮТЭЭЛ'}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.meta}>
            <Text style={styles.metaText}>{item.rating ? `★ ${item.rating}` : 'ШИНЭ'}</Text>
            <Text style={styles.metaText}>{item.year}</Text>
            <Text style={styles.age}>{item.age}</Text>
            <Text style={styles.metaText}>{item.duration}</Text>
            <Text style={styles.hd}>HD</Text>
          </View>
          <Text style={styles.copy}>{item.synopsis}</Text>
          <View style={styles.genres}>
            {item.genre.map(genre => (
              <Text key={genre} style={styles.genre}>
                {genre}
              </Text>
            ))}
          </View>
          <View style={styles.gap} />
          <PrimaryButton label="▶  Одоо үзэх" onPress={() => navigation.navigate('Watch', { slug: item.slug })} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  hero: { height: 420 },
  art: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,8,8,0.35)' },
  back: { position: 'absolute', left: 16, backgroundColor: '#0009', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  backText: { color: '#fff', fontFamily: 'Rubik-Medium' },
  body: { padding: 18, marginTop: -40 },
  kicker: { color: colors.red, fontFamily: 'Rubik-Bold' },
  title: { color: '#fff', fontSize: 24, lineHeight: 32, fontFamily: 'Rubik-Bold', marginTop: 8 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10, alignItems: 'center' },
  metaText: { color: colors.muted, fontFamily: 'Rubik-Regular', fontSize: 14, lineHeight: 20 },
  age: { color: '#fff', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, fontFamily: 'Rubik-Regular', fontSize: 12, lineHeight: 16 },
  hd: { color: '#fff', fontFamily: 'Rubik-Bold' },
  copy: { color: colors.muted, marginTop: 16, lineHeight: 24, fontFamily: 'Rubik-Regular', fontSize: 16 },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  genre: { color: '#fff', backgroundColor: '#191919', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontFamily: 'Rubik-Regular', fontSize: 12, lineHeight: 16 },
  gap: { height: 18 },
});
