import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CachedImage } from '../../components/CachedImage';
import { useSeries } from '../../hooks/useCatalog';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';

export function SeriesDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { id } = useRoute<RouteProp<RootStackParamList, 'SeriesDetail'>>().params;
  const query = useSeries(id);
  const insets = useSafeAreaInsets();
  const data = query.data;

  if (query.isLoading || !data) {
    return (
      <View style={styles.root}>
        <ActivityIndicator color={colors.red} style={{ marginTop: 120 }} />
      </View>
    );
  }

  const { show, seasons, episodes } = data;
  const first = episodes[0];
  const art = show.backdropUrl || show.posterUrl;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={styles.hero}>
          {art ? <CachedImage uri={art} style={styles.art} /> : null}
          <View style={styles.scrim} />
          <Pressable style={[styles.back, { top: insets.top + 8 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Буцах</Text>
          </Pressable>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>ОЛОН АНГИТ</Text>
            <Text style={styles.title}>{show.title}</Text>
            <Text style={styles.copy}>{show.synopsis}</Text>
            <Text style={styles.meta}>
              {show.age} · {episodes.length} анги · HD
            </Text>
            {first ? <PrimaryButton label="▶  Эхнээс нь үзэх" onPress={() => navigation.navigate('Watch', { slug: first.slug })} /> : null}
          </View>
        </View>
        <View style={styles.body}>
          <Text style={styles.kicker}>БҮЛЭГ БА АНГИУД</Text>
          {seasons.map(season => {
            const seasonEpisodes = episodes.filter(episode => episode.seasonId === season.id);
            return (
              <View key={season.id} style={styles.season}>
                <Text style={styles.seasonTitle}>{season.title}</Text>
                {seasonEpisodes.map(episode => (
                  <Pressable
                    key={episode.id}
                    style={styles.episode}
                    onPress={() => navigation.navigate('Watch', { slug: episode.slug })}
                  >
                    {episode.posterUrl ? (
                      <CachedImage uri={episode.posterUrl} style={styles.thumb} />
                    ) : (
                      <View style={styles.num}>
                        <Text style={styles.numText}>{episode.episodeNumber ?? '—'}</Text>
                      </View>
                    )}
                    <View style={styles.epCopy}>
                      <Text style={styles.epTitle}>{episode.title}</Text>
                      <Text numberOfLines={2} style={styles.epSyn}>
                        {episode.synopsis}
                      </Text>
                    </View>
                    <Text style={styles.play}>▶ Үзэх</Text>
                  </Pressable>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  hero: { minHeight: 380, justifyContent: 'flex-end' },
  art: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,5,5,0.55)' },
  back: { position: 'absolute', left: 16, backgroundColor: '#0009', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  backText: { color: '#fff', fontFamily: 'Rubik-Medium' },
  heroCopy: { padding: 18 },
  kicker: { color: colors.red, fontFamily: 'Rubik-Bold', letterSpacing: 1.4 },
  title: { color: '#fff', fontSize: 24, lineHeight: 32, fontFamily: 'Rubik-Bold', marginTop: 8 },
  copy: { color: colors.muted, marginTop: 8, lineHeight: 20, fontFamily: 'Rubik-Regular', fontSize: 14 },
  meta: { color: colors.muted, marginVertical: 12, fontFamily: 'Rubik-Regular', fontSize: 14, lineHeight: 20 },
  body: { padding: 18 },
  season: { marginTop: 18 },
  seasonTitle: { color: '#fff', fontSize: 18, fontFamily: 'Rubik-Bold', marginBottom: 10 },
  episode: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  thumb: { width: 72, height: 48, borderRadius: 8, backgroundColor: '#222' },
  num: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#191919', alignItems: 'center', justifyContent: 'center' },
  numText: { color: '#fff', fontFamily: 'Rubik-Bold' },
  epCopy: { flex: 1 },
  epTitle: { color: '#fff', fontFamily: 'Rubik-Medium' },
  epSyn: { color: colors.dim, marginTop: 4, fontSize: 12, lineHeight: 16, fontFamily: 'Rubik-Regular' },
  play: { color: colors.red, fontFamily: 'Rubik-Bold' },
});
