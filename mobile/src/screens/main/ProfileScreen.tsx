import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiErrorMessage, fetchDevices, removeDevice, unlockAdult } from '../../api/khuree';
import { ScreenHeader } from '../../components/ScreenHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/ui/TextField';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../store/AuthContext';
import { colors, fonts } from '../../theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function ProfileScreen() {
  const { user, logout, refresh } = useAuth();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [devices, setDevices] = useState<Awaited<ReturnType<typeof fetchDevices>> | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchDevices().then(setDevices).catch(() => undefined);
  }, []);

  async function unlock() {
    setError('');
    try {
      await unlockAdult(pin);
      setPin('');
      await refresh();
    } catch (cause) {
      setError(apiErrorMessage(cause, 'PIN буруу байна.'));
    }
  }

  return (
    <View style={styles.root}>
      <ScreenHeader onSearch={() => navigation.navigate('Search')} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 72, paddingHorizontal: 18, paddingBottom: 40 }}>
        <Text style={styles.kicker}>МИНИЙ БҮРТГЭЛ</Text>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.phone || user?.email}</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Үзэх эрх</Text>
          <Text style={styles.copy}>
            {user?.canWatch
              ? user.accessExpiresAt
                ? `Идэвхтэй · ${new Date(user.accessExpiresAt).toLocaleDateString('mn-MN')} хүртэл`
                : 'Идэвхтэй'
              : 'Идэвхгүй — багц идэвхжүүлнэ үү'}
          </Text>
          <View style={styles.gap} />
          <PrimaryButton label="Багц / QPay" onPress={() => navigation.navigate('Subscription')} />
        </View>
        {user?.adultEnabled ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>18+ түгжээ</Text>
            <Text style={styles.copy}>{user.adultUnlocked ? 'Энэ төхөөрөмж дээр нээлттэй (1 цаг).' : 'Parental PIN оруулна уу.'}</Text>
            {!user.adultUnlocked ? (
              <>
                <TextField
                  style={styles.input}
                  value={pin}
                  onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  secureTextEntry
                  placeholder="4 оронтой PIN"
                  error={error}
                />
                <View style={styles.gap} />
                <PrimaryButton label="Нээх" onPress={() => void unlock()} disabled={pin.length !== 4} />
              </>
            ) : null}
          </View>
        ) : null}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Төхөөрөмж</Text>
          <Text style={styles.copy}>
            {devices?.registeredDeviceCount ?? user?.devices.length ?? 0} / {devices?.deviceLimit ?? 3} бүртгэлтэй
          </Text>
          {(devices?.devices ?? []).map(device => (
            <View key={device.id} style={styles.device}>
              <View>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.meta}>{new Date(device.lastSeenAt).toLocaleString('mn-MN')}</Text>
              </View>
              <Pressable
                onPress={() =>
                  Alert.alert('Төхөөрөмж хасах', device.name, [
                    { text: 'Болих', style: 'cancel' },
                    {
                      text: 'Хасах',
                      style: 'destructive',
                      onPress: () => void removeDevice(device.id).then(() => fetchDevices().then(setDevices)),
                    },
                  ])
                }
              >
                <Text style={styles.remove}>Хасах</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <PrimaryButton
          label="Гарах"
          onPress={() =>
            Alert.alert('Гарах', 'Сесс дуусгана.', [
              { text: 'Болих', style: 'cancel' },
              { text: 'Гарах', style: 'destructive', onPress: () => void logout() },
            ])
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  kicker: { color: colors.red, fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.4 },
  name: { color: '#fff', fontSize: 24, lineHeight: 32, fontFamily: fonts.bold, marginTop: 8 },
  meta: { color: colors.dim, marginTop: 4, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: '#121212', borderRadius: 12, padding: 16, marginTop: 16, marginBottom: 8 },
  cardTitle: { color: '#fff', fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  copy: { color: colors.muted, marginTop: 8, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  gap: { height: 12 },
  input: { marginTop: 12 },
  device: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  deviceName: { color: '#fff', fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  remove: { color: colors.red, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
});
