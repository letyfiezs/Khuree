import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiErrorMessage } from '../../api/khuree';
import { BrandMark } from '../../components/ScreenHeader';
import { ErrorText, PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/ui/TextField';
import { useAuth } from '../../store/AuthContext';
import { colors, fonts } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';

type Kind = 'phone' | 'email';

export function LoginScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Login'>) {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<Kind>('phone');
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const valid = kind === 'phone' ? /^\d{8}$/.test(identifier) : /^\S+@\S+\.\S+$/.test(identifier);

  async function submit() {
    setLoading(true);
    setError('');
    try {
      await login({
        kind,
        identifier: kind === 'phone' ? `+976${identifier}` : identifier.trim().toLowerCase(),
        pin,
      });
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Нэвтрэх хүсэлт амжилтгүй боллоо. Дахин оролдоно уу.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + 28 }]} keyboardShouldPersistTaps="handled">
        <BrandMark />
        <Text style={styles.kicker}>ТАВТАЙ МОРИЛ</Text>
        <Text style={styles.title}>Нэвтрэх</Text>
        <Text style={styles.copy}>Баталгаажуулах SMS, имэйл шаардлагагүй. 4 оронтой PIN-ээ марталгүй хадгална уу.</Text>
        <View style={styles.tabs}>
          <Pressable style={[styles.tab, kind === 'phone' && styles.tabOn]} onPress={() => { setKind('phone'); setIdentifier(''); }}>
            <Text style={[styles.tabText, kind === 'phone' && styles.tabTextOn]}>Утасны дугаар</Text>
          </Pressable>
          <Pressable style={[styles.tab, kind === 'email' && styles.tabOn]} onPress={() => { setKind('email'); setIdentifier(''); }}>
            <Text style={[styles.tabText, kind === 'email' && styles.tabTextOn]}>Имэйл</Text>
          </Pressable>
        </View>
        {kind === 'phone' ? (
          <TextField
            style={styles.field}
            label="Утасны дугаар"
            prefix="+976"
            value={identifier}
            onChangeText={value => setIdentifier(value.replace(/\D/g, '').slice(0, 8))}
            keyboardType="number-pad"
            placeholder="99112233"
          />
        ) : (
          <TextField
            style={styles.field}
            label="Имэйл хаяг"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="name@example.com"
          />
        )}
        <TextField
          style={styles.field}
          label="4 оронтой PIN"
          value={pin}
          onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          secureTextEntry
          placeholder="••••"
        />
        <ErrorText message={error} />
        <View style={styles.gap} />
        <PrimaryButton label="Шууд нэвтрэх" onPress={() => void submit()} loading={loading} disabled={!valid || pin.length !== 4} />
        <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.linkWrap}>
          <Text style={styles.link}>Нууц үгээ мартсан?</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Register')} style={styles.linkWrap}>
          <Text style={styles.switch}>Бүртгэлгүй юу? <Text style={styles.link}>Бүртгүүлэх</Text></Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const authStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  page: { paddingHorizontal: 24, paddingBottom: 40 },
  kicker: { color: colors.red, fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.6, marginTop: 32 },
  title: { color: '#fff', fontSize: 24, lineHeight: 32, fontFamily: fonts.bold, marginTop: 8 },
  copy: { color: colors.muted, marginTop: 8, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 24 },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.brand, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  tabTextOn: { color: '#fff' },
  field: { marginTop: 16 },
  gap: { height: 16 },
  linkWrap: { marginTop: 16, alignItems: 'center' },
  link: { color: colors.red, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  switch: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
});

const styles = authStyles;
