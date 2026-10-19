import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { ContentItem } from '../types/content';
import { colors } from '../theme';
import { MovieCard } from './MovieCard';
import { SectionHeader } from './SectionHeader';

type Props = {
  kicker: string;
  title: string;
  items: ContentItem[];
  onPressItem: (item: ContentItem) => void;
  onSeeAll?: () => void;
  actionLabel?: string;
  blurPosters?: boolean;
};

export function MovieRail({ kicker, title, items, onPressItem, onSeeAll, actionLabel, blurPosters }: Props) {
  if (!items.length) {
    return (
      <View style={styles.block}>
        <SectionHeader kicker={kicker} title={title} actionLabel={actionLabel} onAction={onSeeAll} />
        <Text style={styles.empty}>Энэ хэсэгт контент нэмэгдээгүй байна.</Text>
      </View>
    );
  }
  return (
    <View style={styles.block}>
      <SectionHeader kicker={kicker} title={title} actionLabel={actionLabel} onAction={onSeeAll} />
      <FlatList
        horizontal
        data={items.slice(0, 12)}
        keyExtractor={item => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        renderItem={({ item }) => (
          <MovieCard item={item} onPress={() => onPressItem(item)} blurred={blurPosters} width={132} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 28 },
  rail: { paddingHorizontal: 18 },
  empty: { color: colors.dim, paddingHorizontal: 16, fontFamily: 'Rubik-Regular', fontSize: 14, lineHeight: 20 },
});
