import FastImage from '@d11/react-native-fast-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export function CachedImage({
  uri,
  style,
  blurred,
}: {
  uri: string;
  style?: StyleProp<ViewStyle>;
  blurred?: boolean;
}) {
  return (
    <View style={[styles.box, style]}>
      <FastImage
        source={{ uri, priority: FastImage.priority.normal }}
        style={[styles.image as never, blurred ? styles.blurred : undefined]}
        resizeMode={FastImage.resizeMode.cover}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  blurred: { opacity: 0.55 },
});
