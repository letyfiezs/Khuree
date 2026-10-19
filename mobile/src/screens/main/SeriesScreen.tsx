import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MovieCard } from '../../components/MovieCard';
import { ScreenHeader } from '../../components/ScreenHeader';
import { partitionCatalog, useCatalog } from '../../hooks/useCatalog';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Series'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function SeriesScreen() {
  const navigation = useNavigation<Nav>();
  const catalog = useCatalog();
  const insets = useSafeAreaInsets();
  const items = partitionCatalog(catalog.data?.items ?? [], catalog.data?.popularIds ?? []).series;
  return (
    <View style={styles.root}>
      <ScreenHeader onSearch={() => navigation.navigate('Search')} />
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ paddingTop: insets.top + 72, paddingHorizontal: 18, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={styles.banner}>
            <Text style={styles.kicker}>АНГИ БҮР ШИНЭ ТҮҮХ</Text>
            <Text style={styles.title}>Олон ангит</Text>
            <Text style={styles.copy}>Дараагийн ангийг нь хүлээлгэх хамгийн сонирхолтой цувралууд.</Text>
            <Text style={styles.count}>Бүх цуврал · {items.length} бүтээл</Text>
          </View>
        }
        ListEmptyComponent={catalog.isLoading ? <ActivityIndicator color={colors.red} /> : <Text style={styles.copy}>Цуврал нэмэгдээгүй байна.</Text>}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <MovieCard
              item={item}
              onPress={() => navigation.navigate('SeriesDetail', { id: item.seriesId || item.id })}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  banner: { marginBottom: 18 },
  kicker: { color: colors.red, fontFamily: 'Rubik-Bold', letterSpacing: 1.4 },
  title: { color: '#fff', fontSize: 24, lineHeight: 32, fontFamily: 'Rubik-Bold', marginTop: 8 },
  copy: { color: colors.muted, marginTop: 8, lineHeight: 20, fontFamily: 'Rubik-Regular', fontSize: 14 },
  count: { color: colors.dim, marginTop: 12, marginBottom: 8, fontFamily: 'Rubik-Regular', fontSize: 12, lineHeight: 16 },
  row: { justifyContent: 'space-between' },
  cell: { width: '48%', marginBottom: 16 },
});
