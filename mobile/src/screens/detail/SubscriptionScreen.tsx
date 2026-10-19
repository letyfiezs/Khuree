import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiErrorMessage, createQpayInvoice, fetchPlans, fetchQpayStatus } from '../../api/khuree';
import { ErrorText, PrimaryButton } from '../../components/PrimaryButton';
import { Radio } from '../../components/ui/Radio';
import type { PaymentPlan, PlanId, QPayPayment } from '../../types/content';
import { colors } from '../../theme';
import { formatMoney } from '../../utils/content';
import { useAuth } from '../../store/AuthContext';

export function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, refresh } = useAuth();
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [days, setDays] = useState(30);
  const [selected, setSelected] = useState<PlanId>('vip');
  const [payment, setPayment] = useState<QPayPayment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchPlans().then(data => {
      setPlans(data.plans);
      setDays(data.days);
    });
  }, []);

  useEffect(() => {
    if (!payment || payment.status !== 'pending') return;
    const timer = setInterval(() => {
      void fetchQpayStatus(payment.id).then(async data => {
        if (data.status !== 'pending') {
          setPayment(current => (current ? { ...current, status: data.status } : null));
          if (data.status === 'paid') await refresh();
        }
      });
    }, 8000);
    return () => clearInterval(timer);
  }, [payment, refresh]);

  async function pay() {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      setPayment(await createQpayInvoice(selected));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Нэхэмжлэх үүссэнгүй.'));
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (!payment) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchQpayStatus(payment.id, true);
      setPayment(current => (current ? { ...current, status: data.status } : null));
      if (data.status === 'pending') setError('Төлбөр хараахан баталгаажаагүй байна.');
      if (data.status === 'paid') await refresh();
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Төлбөр шалгаж чадсангүй.'));
    } finally {
      setLoading(false);
    }
  }

  const qr = payment?.qrImage
    ? payment.qrImage.startsWith('data:')
      ? payment.qrImage
      : `data:image/png;base64,${payment.qrImage}`
    : null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 12, padding: 18, paddingBottom: 48 }}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.back}>← Буцах</Text>
      </Pressable>
      <Text style={styles.kicker}>ХҮРЭЭ ЭРХ</Text>
      <Text style={styles.title}>Кино ертөнцийг{'\n'}хязгааргүй үз.</Text>
      <Text style={styles.copy}>Хүссэн төрлөө тусад нь эсвэл VIP багцаар бүгдийг нээгээрэй.</Text>
      <Text style={styles.bullet}>• 3 төхөөрөмж дээр үзэх</Text>
      <Text style={styles.bullet}>• HD чанар</Text>
      <Text style={styles.bullet}>• Монгол хадмал</Text>
      {user?.canWatch && user.accessExpiresAt ? (
        <Text style={styles.active}>Үзэх эрх {new Date(user.accessExpiresAt).toLocaleDateString('mn-MN')} хүртэл идэвхтэй.</Text>
      ) : null}

      {payment?.status === 'paid' ? (
        <View style={styles.success}>
          <Text style={styles.successTitle}>✓ Эрх амжилттай идэвхжлээ</Text>
          <Text style={styles.copy}>Сонгосон багцын контентыг одоо үзэх боломжтой.</Text>
        </View>
      ) : !payment ? (
        <>
          <View style={styles.plans}>
            {plans.map(plan => (
              <Pressable
                key={plan.id}
                onPress={() => setSelected(plan.id)}
                style={[styles.plan, selected === plan.id && styles.planOn]}
              >
                <Radio selected={selected === plan.id} onChange={() => setSelected(plan.id)} />
                <View style={styles.planCopy}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDesc}>{plan.description}</Text>
                  <Text style={styles.planPrice}>
                    {formatMoney(plan.price)} / {days} хоног
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
          <Text style={styles.priceBig}>{formatMoney(plans.find(plan => plan.id === selected)?.price ?? 0)}</Text>
          <Text style={styles.copy}>/ {days} хоног</Text>
          <View style={{ height: 16 }} />
          <PrimaryButton label={loading ? 'QR үүсгэж байна…' : 'QPay-аар төлөх'} loading={loading} onPress={() => void pay()} />
          <ErrorText message={error} />
        </>
      ) : (
        <>
          <Text style={styles.kicker}>QPAY НЭХЭМЖЛЭХ</Text>
          <Text style={styles.priceBig}>{formatMoney(payment.amount)}</Text>
          {qr ? <Image source={{ uri: qr }} style={styles.qr} /> : null}
          <Text style={styles.copy}>QR кодоо банкны апп-аар уншуулна уу.</Text>
          {payment.shortUrl ? (
            <Pressable onPress={() => void Linking.openURL(payment.shortUrl!)}>
              <Text style={styles.link}>Утсаар QPay нээх</Text>
            </Pressable>
          ) : null}
          <View style={styles.banks}>
            {payment.urls.map(bank => (
              <Pressable key={`${bank.name}-${bank.link}`} style={styles.bank} onPress={() => void Linking.openURL(bank.link)}>
                {bank.logo ? <Image source={{ uri: bank.logo }} style={styles.logo} /> : null}
                <Text style={styles.bankName}>{bank.name}</Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton label={loading ? 'Шалгаж байна…' : 'Төлбөр шалгах'} loading={loading} onPress={() => void verify()} />
          <ErrorText message={error} />
          <Text style={styles.wait}>Төлбөр хүлээж байна…</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  back: { color: '#fff', fontFamily: 'Rubik-Medium', marginBottom: 18 },
  kicker: { color: colors.red, fontFamily: 'Rubik-Bold', letterSpacing: 1.4 },
  title: { color: '#fff', fontSize: 24, lineHeight: 32, fontFamily: 'Rubik-Bold', marginTop: 8 },
  copy: { color: colors.muted, marginTop: 8, lineHeight: 20, fontFamily: 'Rubik-Regular', fontSize: 14 },
  bullet: { color: colors.muted, marginTop: 4, fontFamily: 'Rubik-Regular', fontSize: 14, lineHeight: 20 },
  active: { color: '#9f9', marginTop: 14, fontFamily: 'Rubik-Medium' },
  plans: { marginTop: 24, gap: 8 },
  plan: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planOn: { borderColor: colors.brand, backgroundColor: colors.darkPrimary },
  planCopy: { flex: 1 },
  planName: { color: '#fff', fontFamily: 'Rubik-Bold', fontSize: 16 },
  planDesc: { color: colors.dim, marginTop: 4, fontFamily: 'Rubik-Regular', fontSize: 14, lineHeight: 20 },
  planPrice: { color: '#fff', marginTop: 8, fontFamily: 'Rubik-Medium' },
  priceBig: { color: '#fff', fontSize: 24, lineHeight: 32, fontFamily: 'Rubik-Bold', marginTop: 16 },
  qr: { width: 220, height: 220, alignSelf: 'center', marginVertical: 16, backgroundColor: '#fff' },
  link: { color: colors.red, fontFamily: 'Rubik-Bold', marginTop: 8 },
  banks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 },
  bank: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#161616', padding: 8, borderRadius: 8 },
  logo: { width: 22, height: 22, borderRadius: 4 },
  bankName: { color: '#fff', fontSize: 12, lineHeight: 16, fontFamily: 'Rubik-Regular' },
  wait: { color: colors.dim, marginTop: 12, textAlign: 'center', fontFamily: 'Rubik-Regular', fontSize: 12, lineHeight: 16 },
  success: { marginTop: 28, backgroundColor: '#102010', padding: 16, borderRadius: 12 },
  successTitle: { color: '#9f9', fontFamily: 'Rubik-Bold', fontSize: 18 },
});
