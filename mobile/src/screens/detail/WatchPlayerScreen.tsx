import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Video, { type OnLoadData, type OnProgressData, type VideoRef } from 'react-native-video';
import Orientation from 'react-native-orientation-locker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';
import { fetchPlayback, liveHeartbeat, recordView } from '../../api/khuree';
import { getProgress, saveProgress, saveRecent } from '../../services/storage';
import type { ContentItem } from '../../types/content';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import { createUuid, formatTime } from '../../utils/content';

type Playback = Awaited<ReturnType<typeof fetchPlayback>>;

export function WatchPlayerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { slug } = useRoute<RouteProp<RootStackParamList, 'Watch'>>().params;
  const videoRef = useRef<VideoRef>(null);
  const sessionId = useRef(createUuid());
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const [data, setData] = useState<Playback | null>(null);
  const [error, setError] = useState('');
  const [paused, setPaused] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [resumeAt, setResumeAt] = useState<number | undefined>();

  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    void (async () => {
      try {
        const playback = await fetchPlayback(slug);
        if (!active) return;
        setData(playback);
        const saved = await getProgress(playback.item.id);
        if (saved && saved.position > 5 && saved.position < saved.duration - 10) setResumeAt(saved.position);
        void saveRecent({
          id: playback.item.id,
          slug: playback.item.slug,
          title: playback.item.title,
          posterUrl: playback.item.posterUrl,
          year: playback.item.year,
          age: playback.item.age,
          kind: playback.item.kind,
          seriesTitle: playback.item.seriesTitle,
          seasonNumber: playback.item.seasonNumber,
          episodeNumber: playback.item.episodeNumber,
          audioLabel: playback.item.audioLabel,
        });
        void recordView(playback.item.id);
      } catch (cause) {
        if (!active) return;
        const payload = axios.isAxiosError(cause) ? (cause.response?.data as { error?: string; subscribe?: boolean; deviceSetup?: boolean; adultRequired?: boolean }) : undefined;
        if (payload?.subscribe) {
          navigation.replace('Subscription');
          return;
        }
        if (payload?.adultRequired) {
          setError('18+ контент. Профайл хэсэгт parental PIN-ээ оруулна уу.');
          return;
        }
        if (payload?.deviceSetup) {
          setError('Энэ төхөөрөмж бүртгэгдээгүй байна. Профайл руу орж төхөөрөмжөө шалгана уу.');
          return;
        }
        setError(payload?.error ?? 'Видео ачаалж чадсангүй.');
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, navigation]);

  useEffect(() => {
    if (landscape) Orientation.lockToLandscape();
    else Orientation.lockToPortrait();
    return () => Orientation.lockToPortrait();
  }, [landscape]);

  useEffect(() => {
    if (!data?.item.id || paused) return;
    const body = { movieId: data.item.id, sessionId: sessionId.current };
    void liveHeartbeat('post', body);
    const timer = setInterval(() => void liveHeartbeat('post', body), 15_000);
    return () => {
      clearInterval(timer);
      void liveHeartbeat('delete', body);
    };
  }, [data?.item.id, paused]);

  function onLoad(meta: OnLoadData) {
    setDuration(meta.duration);
    setBuffering(false);
    if (resumeAt) videoRef.current?.seek(resumeAt);
  }

  function onProgress(meta: OnProgressData) {
    setCurrent(meta.currentTime);
    if (data && meta.currentTime > 3 && meta.seekableDuration > 0) {
      void saveProgress({
        movieId: data.item.id,
        slug: data.item.slug,
        position: meta.currentTime,
        duration: meta.seekableDuration,
        updatedAt: Date.now(),
      });
    }
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>← Буцах</Text></Pressable>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.red} />
        <Text style={styles.loading}>Тоглуулахад бэлэн болгож байна…</Text>
      </View>
    );
  }

  const progress = duration ? current / duration : 0;

  return (
    <View style={styles.root}>
      <View style={[styles.player, landscape && styles.playerFull]}>
        {data.videoUrl ? (
          <Video
            ref={videoRef}
            source={{ uri: data.videoUrl }}
            style={StyleSheet.absoluteFill}
            paused={paused}
            resizeMode="contain"
            ignoreSilentSwitch="ignore"
            onLoad={onLoad}
            onProgress={onProgress}
            onBuffer={({ isBuffering }) => setBuffering(isBuffering)}
            onEnd={() => {
              if (data.nextEpisode) navigation.replace('Watch', { slug: data.nextEpisode.slug });
            }}
            poster={data.item.posterUrl}
            posterResizeMode="cover"
            controls={false}
            fullscreenAutorotate
          />
        ) : (
          <View style={styles.center}>
            <Text style={styles.error}>Энэ бүтээлд видео файл холбогдоогүй байна.</Text>
          </View>
        )}
        {buffering ? <ActivityIndicator color="#fff" style={styles.spinner} /> : null}
        <Pressable style={styles.topBar} onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Буцах</Text>
          <View>
            <Text style={styles.nowTitle}>{data.item.title}</Text>
            <Text style={styles.nowMeta}>
              {data.item.kind === 'series'
                ? `${data.item.seasonNumber ?? 1}-р бүлэг · ${data.item.episodeNumber ?? 1}-р анги`
                : 'Бүрэн хэмжээний кино'}
            </Text>
          </View>
        </Pressable>
        <Pressable style={styles.playHit} onPress={() => setPaused(value => !value)}>
          <Text style={styles.playIcon}>{paused ? '▶' : '❚❚'}</Text>
        </Pressable>
        <View style={styles.seekRow}>
          <Text style={styles.time}>{formatTime(current)}</Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.min(100, progress * 100)}%` }]} />
          </View>
          <Text style={styles.time}>{formatTime(duration)}</Text>
          <Pressable onPress={() => (landscape ? Orientation.lockToPortrait() : Orientation.lockToLandscape())}>
            <Text style={styles.full}>{landscape ? '⤢' : '⛶'}</Text>
          </Pressable>
        </View>
      </View>
      {!landscape ? (
        <ScrollView contentContainerStyle={styles.episodes}>
          {data.nextEpisode ? (
            <Pressable style={styles.next} onPress={() => navigation.replace('Watch', { slug: data.nextEpisode!.slug })}>
              <Text style={styles.nextLabel}>ДАРААГИЙН АНГИ</Text>
              <Text style={styles.nextTitle}>{data.nextEpisode.title}</Text>
            </Pressable>
          ) : null}
          {data.episodes.length ? (
            <>
              <Text style={styles.section}>ЦУВРАЛЫН АНГИУД</Text>
              {data.episodes.map(episode => (
                <EpisodeRow
                  key={episode.id}
                  episode={episode}
                  current={episode.id === data.item.id}
                  onPress={() => navigation.replace('Watch', { slug: episode.slug })}
                />
              ))}
            </>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

function EpisodeRow({
  episode,
  current,
  onPress,
}: {
  episode: ContentItem;
  current: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.ep, current && styles.epOn]}>
      <Text style={styles.epNum}>{episode.episodeNumber ?? '—'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.epMeta}>
          {episode.seasonNumber ?? 1}-р бүлэг · {episode.episodeNumber ?? 1}-р анги
        </Text>
        <Text style={styles.epTitle}>{episode.title}</Text>
      </View>
      <Text style={styles.playSmall}>{current ? 'ҮЗЭЖ БАЙНА' : '▶'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 },
  loading: { color: colors.dim, marginTop: 12, fontFamily: 'Rubik-Regular', fontSize: 14, lineHeight: 20 },
  error: { color: colors.errorText, textAlign: 'center', marginBottom: 16, fontFamily: 'Rubik-Regular', fontSize: 12, lineHeight: 16 },
  player: { height: 240, backgroundColor: '#000' },
  playerFull: { flex: 1, height: undefined },
  spinner: { position: 'absolute', top: '50%', alignSelf: 'center' },
  topBar: { position: 'absolute', top: 44, left: 12, right: 12, flexDirection: 'row', gap: 12, alignItems: 'center' },
  back: { color: '#fff', fontFamily: 'Rubik-Medium', fontSize: 14, lineHeight: 20 },
  nowTitle: { color: '#fff', fontFamily: 'Rubik-Bold', fontSize: 16, lineHeight: 24 },
  nowMeta: { color: colors.muted, fontSize: 12, lineHeight: 16, fontFamily: 'Rubik-Regular' },
  playHit: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  playIcon: { color: '#fff', fontSize: 34, fontFamily: 'Rubik-Bold', textShadowColor: '#000', textShadowRadius: 8 },
  seekRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  time: { color: '#fff', fontSize: 12, lineHeight: 16, fontFamily: 'Rubik-Regular', width: 40 },
  bar: { flex: 1, height: 4, backgroundColor: '#444', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: colors.red },
  full: { color: '#fff', fontSize: 18, lineHeight: 28, fontFamily: 'Rubik-Medium' },
  episodes: { padding: 16, paddingBottom: 40 },
  next: { backgroundColor: '#161616', borderRadius: 8, padding: 16, marginBottom: 16 },
  nextLabel: { color: colors.red, fontFamily: 'Rubik-Bold', fontSize: 12, lineHeight: 16 },
  nextTitle: { color: '#fff', fontFamily: 'Rubik-Bold', marginTop: 4, fontSize: 16, lineHeight: 24 },
  section: { color: colors.red, fontFamily: 'Rubik-Bold', marginBottom: 8, fontSize: 12, lineHeight: 16 },
  ep: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  epOn: { backgroundColor: colors.darkPrimary, borderRadius: 8, paddingHorizontal: 8 },
  epNum: { color: '#fff', fontFamily: 'Rubik-Bold', width: 28, fontSize: 14, lineHeight: 20 },
  epMeta: { color: colors.dim, fontSize: 12, lineHeight: 16, fontFamily: 'Rubik-Regular' },
  epTitle: { color: '#fff', fontFamily: 'Rubik-Medium', fontSize: 14, lineHeight: 20 },
  playSmall: { color: colors.red, fontFamily: 'Rubik-Bold', fontSize: 12, lineHeight: 16 },
});
