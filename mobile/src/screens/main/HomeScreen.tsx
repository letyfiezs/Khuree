import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ContinueWatching } from '../../components/ContinueWatching';
import { HeroBanner } from '../../components/HeroBanner';
import { LivePoster } from '../../components/LiveCard';
import { MovieRail } from '../../components/MovieRail';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { partitionCatalog, useCatalog, useLiveNow } from '../../hooks/useCatalog';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import type { ContentItem } from '../../types/content';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const catalog = useCatalog();
  const liveNow = useLiveNow();
  const parts = partitionCatalog(catalog.data?.items ?? [], catalog.data?.popularIds ?? []);

  function openItem(item: { kind?: string; seriesId?: string; slug: string }) {
    if (item.kind === 'series' && item.seriesId) navigation.navigate('SeriesDetail', { id: item.seriesId });
    else navigation.navigate('MovieDetail', { slug: item.slug });
  }

  function playItem(item: ContentItem) {
    if (item.kind === 'series' && item.seriesId) navigation.navigate('SeriesDetail', { id: item.seriesId });
    else navigation.navigate('Watch', { slug: item.slug });
  }

  return (
    <View style={styles.root}>
      <ScreenHeader onSearch={() => navigation.navigate('Search')} />
      <ScrollView
        refreshControl={<RefreshControl tintColor="#fff" refreshing={catalog.isRefetching} onRefresh={() => void catalog.refetch()} />}
        contentContainerStyle={styles.scroll}
      >
        {catalog.isLoading ? (
          <ActivityIndicator color={colors.red} style={styles.loader} />
        ) : parts.featured ? (
          <HeroBanner item={parts.featured} onPlay={() => playItem(parts.featured!)} onDetails={() => openItem(parts.featured!)} />
        ) : (
          <View style={styles.emptyHero}>
            <Text style={styles.kicker}>ХҮРЭЭ</Text>
            <Text style={styles.emptyTitle}>ТАНЫ КАТАЛОГ</Text>
          </View>
        )}
        <ContinueWatching onPressItem={item => navigation.navigate('Watch', { slug: item.slug })} />
        {liveNow.data?.length ? (
          <View style={styles.block}>
            <SectionHeader kicker="LIVE · ЯГ ОДОО" title="Одоо хамгийн их үзэж буй Top 5" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {liveNow.data.map((item, index) => (
                <LivePoster
                  key={item.id}
                  title={item.title}
                  posterUrl={item.posterUrl}
                  rank={index + 1}
                  viewers={item.viewerCount}
                  onPress={() => openItem(item)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}
        <MovieRail kicker="ОДОО ҮЗЭХ" title="Шинээр нэмэгдсэн" items={parts.latest} onPressItem={openItem} onSeeAll={() => navigation.navigate('Movies')} />
        <MovieRail kicker="БҮРЭН ХЭМЖЭЭНИЙ" title="Кино" items={parts.movies} onPressItem={openItem} onSeeAll={() => navigation.navigate('Movies')} />
        <MovieRail kicker="БОСООГООР ҮЗЭХ" title="Босоо драма" items={parts.vertical} onPressItem={openItem} />
        <MovieRail kicker="АНГИ БҮР ШИНЭ ТҮҮХ" title="Олон ангит" items={parts.series} onPressItem={openItem} onSeeAll={() => navigation.navigate('Series')} />
        <MovieRail kicker="ҮЗЭГЧДИЙН СОНГОЛТ" title="Их үзэлттэй" items={parts.popular} onPressItem={openItem} onSeeAll={() => navigation.navigate('Movies')} />
        <MovieRail kicker="НАСАНД ХҮРЭГЧДЭД" title="+18" items={parts.adult} blurPosters onPressItem={openItem} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  scroll: { paddingBottom: 40 },
  loader: { marginTop: 160 },
  emptyHero: { paddingTop: 140, paddingHorizontal: 18, paddingBottom: 40 },
  kicker: { color: colors.red, fontFamily: 'Rubik-Bold' },
  emptyTitle: { color: '#fff', fontSize: 24, lineHeight: 32, fontFamily: 'Rubik-Bold', marginTop: 8 },
  block: { marginBottom: 28 },
  rail: { paddingHorizontal: 18 },
});
