import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiErrorMessage, requestRecovery, updateRecoveryPassword, verifyRecovery } from '../../api/khuree';
import { BrandMark } from '../../components/ScreenHeader';
import { ErrorText, PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/ui/TextField';
import type { AuthStackParamList } from '../../navigation/types';
import { authStyles as styles } from './LoginScreen';

type Step = 'email' | 'otp' | 'password' | 'done';
type Kind = 'phone' | 'email';

export function ForgotPasswordScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('email');
  const [kind, setKind] = useState<Kind>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentialKind, setCredentialKind] = useState<'pin' | 'password' | 'oauth'>('password');

  async function requestCode() {
    setLoading(true);
    setError('');
    try {
      await requestRecovery(
        kind === 'phone'
          ? { kind, identifier: `+976${phone}`, recoveryEmail: email }
          : { kind, email },
      );
      setStep('otp');
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Имэйл хаяг буруу байна.'));
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setLoading(true);
    setError('');
    try {
      const data = await verifyRecovery({ kind, email, token: code });
      setCredentialKind(data.credentialKind ?? 'password');
      setStep('password');
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Код буруу байна.'));
    } finally {
      setLoading(false);
    }
  }

  async function update() {
    if (credentialKind === 'pin' ? !/^\d{4}$/.test(password) : password.length < 8) {
      setError(credentialKind === 'pin' ? 'Шинэ PIN яг 4 оронтой байна.' : 'Нууц үг дор хаяж 8 тэмдэгттэй байна.');
      return;
    }
    if (password !== repeat) {
      setError('Нууц үг таарахгүй байна.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await updateRecoveryPassword(password);
      setStep('done');
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Нууц үг шинэчилж чадсангүй.'));
    } finally {
      setLoading(false);
    }
  }

  const titles = { email: 'Нууц үг сэргээх', otp: 'Баталгаажуулах код', password: credentialKind === 'pin' ? 'Шинэ PIN' : 'Шинэ нууц үг', done: 'Амжилттай' };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + 28 }]} keyboardShouldPersistTaps="handled">
        <BrandMark />
        <Pressable onPress={() => navigation.goBack()} style={styles.linkWrap}>
          <Text style={styles.link}>← Нэвтрэх рүү буцах</Text>
        </Pressable>
        <Text style={styles.kicker}>ХҮРЭЭ AUTH</Text>
        <Text style={styles.title}>{titles[step]}</Text>
        {step === 'done' ? (
          <>
            <Text style={styles.copy}>{credentialKind === 'pin' ? 'PIN' : 'Нууц үг'} амжилттай шинэчлэгдлээ.</Text>
            <View style={styles.gap} />
            <PrimaryButton label="Нэвтрэх" onPress={() => navigation.navigate('Login')} />
          </>
        ) : (
          <>
            {step === 'email' && (
              <>
                <View style={styles.tabs}>
                  <Pressable style={[styles.tab, kind === 'phone' && styles.tabOn]} onPress={() => setKind('phone')}>
                    <Text style={[styles.tabText, kind === 'phone' && styles.tabTextOn]}>Утасны дугаар</Text>
                  </Pressable>
                  <Pressable style={[styles.tab, kind === 'email' && styles.tabOn]} onPress={() => setKind('email')}>
                    <Text style={[styles.tabText, kind === 'email' && styles.tabTextOn]}>Имэйл</Text>
                  </Pressable>
                </View>
                {kind === 'phone' ? (
                  <TextField
                    style={styles.field}
                    label="Утасны дугаар"
                    prefix="+976"
                    value={phone}
                    onChangeText={value => setPhone(value.replace(/\D/g, '').slice(0, 8))}
                    keyboardType="number-pad"
                    placeholder="99112233"
                  />
                ) : null}
                <TextField
                  style={styles.field}
                  label={kind === 'phone' ? 'Сэргээх Gmail' : 'И-мэйл хаяг'}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="name@gmail.com"
                />
              </>
            )}
            {step === 'otp' && (
              <>
                <Text style={styles.copy}>Таны Gmail хаяг руу илгээсэн кодыг оруулна уу.</Text>
                <TextField
                  style={styles.field}
                  label="6 оронтой код"
                  value={code}
                  onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  placeholder="000000"
                />
              </>
            )}
            {step === 'password' && (
              <>
                <TextField
                  style={styles.field}
                  label={`Шинэ ${credentialKind === 'pin' ? 'PIN' : 'нууц үг'}`}
                  value={password}
                  onChangeText={value => setPassword(credentialKind === 'pin' ? value.replace(/\D/g, '').slice(0, 4) : value)}
                  secureTextEntry
                  keyboardType={credentialKind === 'pin' ? 'number-pad' : 'default'}
                />
                <TextField
                  style={styles.field}
                  label="Давтах"
                  value={repeat}
                  onChangeText={value => setRepeat(credentialKind === 'pin' ? value.replace(/\D/g, '').slice(0, 4) : value)}
                  secureTextEntry
                  keyboardType={credentialKind === 'pin' ? 'number-pad' : 'default'}
                />
              </>
            )}
            <ErrorText message={error} />
            <View style={styles.gap} />
            <PrimaryButton
              label={loading ? 'Түр хүлээнэ үү…' : step === 'email' ? 'Код авах' : step === 'otp' ? 'Баталгаажуулах' : credentialKind === 'pin' ? 'PIN шинэчлэх' : 'Нууц үг шинэчлэх'}
              loading={loading}
              onPress={() => void (step === 'email' ? requestCode() : step === 'otp' ? verify() : update())}
              disabled={
                (step === 'email' && (kind === 'phone' ? phone.length !== 8 : !email)) ||
                (step === 'otp' && code.length !== 6)
              }
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
