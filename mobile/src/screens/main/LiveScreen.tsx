import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LiveCard } from '../../components/LiveCard';
import { TextField } from '../../components/ui/TextField';
import { ScreenHeader } from '../../components/ScreenHeader';
import { liveChannels } from '../../data/liveChannels';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, fonts } from '../../theme';
import { matchesSearch } from '../../utils/content';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Live'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function LiveScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [activeId, setActiveId] = useState(liveChannels[0]?.id);
  const [query, setQuery] = useState('');
  const active = liveChannels.find(channel => channel.id === activeId) ?? liveChannels[0];
  const visible = useMemo(
    () =>
      query.trim()
        ? liveChannels.filter(channel => matchesSearch(query, channel.name, channel.category))
        : liveChannels,
    [query],
  );

  return (
    <View style={styles.root}>
      <ScreenHeader onSearch={() => navigation.navigate('Search')} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 72, paddingBottom: 40 }}>
        <View style={styles.heading}>
          <Text style={styles.kicker}>ШУУД ЭФИР</Text>
          <Text style={styles.title}>{active?.name}</Text>
          <Text style={styles.live}>● LIVE</Text>
        </View>
        {active ? (
          <View style={styles.player}>
            <Video
              source={{ uri: active.streamUrl, type: 'm3u8' }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
              controls
              paused={false}
              ignoreSilentSwitch="ignore"
              posterResizeMode="cover"
            />
          </View>
        ) : null}
        <Text style={styles.note}>HLS эфирийг эх CDN-ээс шууд тоглуулж байна.</Text>
        <View style={styles.listHead}>
          <Text style={styles.listTitle}>Монгол сувгууд</Text>
          <Text style={styles.count}>{liveChannels.length} суваг</Text>
        </View>
        <TextField value={query} onChangeText={setQuery} placeholder="Суваг хайх..." style={styles.search} />
        <View style={styles.list}>
          {visible.map(channel => (
            <LiveCard
              key={channel.id}
              channel={channel}
              active={channel.id === active?.id}
              onPress={() => setActiveId(channel.id)}
            />
          ))}
          {!visible.length ? <Text style={styles.note}>Суваг олдсонгүй</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  heading: { paddingHorizontal: 16, marginBottom: 12 },
  kicker: { color: colors.red, fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.4 },
  title: { color: '#fff', fontSize: 24, lineHeight: 32, fontFamily: fonts.bold, marginTop: 4 },
  live: { color: colors.red, fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, marginTop: 8 },
  player: { height: 220, backgroundColor: '#000', marginHorizontal: 16, borderRadius: 8, overflow: 'hidden' },
  note: { color: colors.dim, paddingHorizontal: 16, marginTop: 8, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 24 },
  listTitle: { color: '#fff', fontFamily: fonts.medium, fontSize: 18, lineHeight: 28 },
  count: { color: colors.dim, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  search: { marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  list: { paddingHorizontal: 16 },
});
