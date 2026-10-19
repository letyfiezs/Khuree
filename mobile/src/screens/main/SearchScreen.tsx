import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CachedImage } from '../../components/CachedImage';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { useCatalog } from '../../hooks/useCatalog';
import type { RootStackParamList } from '../../navigation/types';
import { colors, fonts } from '../../theme';
import { matchesSearch, normalizeSearchText } from '../../utils/content';

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const catalog = useCatalog();
  const [query, setQuery] = useState('');
  const items = catalog.data?.items ?? [];
  const results = useMemo(() => {
    if (!query.trim()) return items.slice(0, 12);
    const normalizedQuery = normalizeSearchText(query);
    const score = (title: string) => {
      const normalizedTitle = normalizeSearchText(title);
      if (normalizedTitle === normalizedQuery) return 4;
      if (normalizedTitle.startsWith(normalizedQuery)) return 3;
      if (normalizedTitle.includes(normalizedQuery)) return 2;
      return 1;
    };
    return items
      .filter(item => matchesSearch(query, item.title, item.synopsis, item.genre.join(' ')))
      .sort((a, b) => score(b.title) - score(a.title))
      .slice(0, 24);
  }, [items, query]);

  return (
    <View style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
        <TextField
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Кино, цувралын нэрээр хайх..."
          style={styles.input}
        />
        <Button variant="ghost" label="Хаах" onPress={() => navigation.goBack()} />
      </View>
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Илэрц олдсонгүй.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              item.kind === 'series' && item.seriesId
                ? navigation.replace('SeriesDetail', { id: item.seriesId })
                : navigation.replace('MovieDetail', { slug: item.slug })
            }
          >
            {item.posterUrl ? (
              <CachedImage uri={item.posterUrl} style={styles.poster} />
            ) : (
              <View style={[styles.poster, { backgroundColor: item.accent }]} />
            )}
            <View style={styles.copy}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>
                {item.kind === 'series' ? 'Олон ангит' : 'Кино'} · {item.year}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  input: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  poster: { width: 54, height: 80, borderRadius: 8, backgroundColor: '#222' },
  copy: { flex: 1, justifyContent: 'center' },
  title: { color: '#fff', fontFamily: fonts.bold, fontSize: 16, lineHeight: 24 },
  meta: { color: colors.dim, marginTop: 4, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  empty: { color: colors.dim, textAlign: 'center', marginTop: 40, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
});
