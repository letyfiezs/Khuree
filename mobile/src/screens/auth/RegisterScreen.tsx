import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiErrorMessage } from '../../api/khuree';
import { BrandMark } from '../../components/ScreenHeader';
import { ErrorText, PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/ui/TextField';
import { useAuth } from '../../store/AuthContext';
import type { AuthStackParamList } from '../../navigation/types';
import { authStyles as styles } from './LoginScreen';

type Kind = 'phone' | 'email';

export function RegisterScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Register'>) {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<Kind>('phone');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const valid = kind === 'phone' ? /^\d{8}$/.test(identifier) : /^\S+@\S+\.\S+$/.test(identifier);

  async function submit() {
    setLoading(true);
    setError('');
    try {
      await register({
        kind,
        identifier: kind === 'phone' ? `+976${identifier}` : identifier.trim().toLowerCase(),
        pin,
        name: name.trim(),
      });
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Алдаа гарлаа.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + 28 }]} keyboardShouldPersistTaps="handled">
        <BrandMark />
        <Text style={styles.kicker}>ШИНЭ ГИШҮҮН</Text>
        <Text style={styles.title}>Бүртгүүлэх</Text>
        <Text style={styles.copy}>Баталгаажуулах SMS, имэйл шаардлагагүй. 4 оронтой PIN-ээ марталгүй хадгална уу.</Text>
        <View style={styles.tabs}>
          <Pressable style={[styles.tab, kind === 'phone' && styles.tabOn]} onPress={() => { setKind('phone'); setIdentifier(''); }}>
            <Text style={[styles.tabText, kind === 'phone' && styles.tabTextOn]}>Утасны дугаар</Text>
          </Pressable>
          <Pressable style={[styles.tab, kind === 'email' && styles.tabOn]} onPress={() => { setKind('email'); setIdentifier(''); }}>
            <Text style={[styles.tabText, kind === 'email' && styles.tabTextOn]}>Имэйл</Text>
          </Pressable>
        </View>
        <TextField style={styles.field} label="Таны нэр" value={name} onChangeText={setName} placeholder="Нэр" />
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
        <PrimaryButton
          label="Бүртгэл үүсгэх"
          onPress={() => void submit()}
          loading={loading}
          disabled={!valid || pin.length !== 4 || !name.trim()}
        />
        <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkWrap}>
          <Text style={styles.switch}>Бүртгэлтэй юу? <Text style={styles.link}>Нэвтрэх</Text></Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
