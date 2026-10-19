import { api, apiErrorMessage } from '../services/api';
import { saveAuthTokens } from '../services/session';
import { getDeviceId, setDeviceId } from '../services/storage';
import type {
  CatalogPayload,
  ContentItem,
  LocalUser,
  PaymentPlan,
  PlanId,
  QPayPayment,
  SeriesSeason,
} from '../types/content';
import { createUuid } from '../utils/content';

export type PinAuthResult = {
  ok: boolean;
  user?: LocalUser | null;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number | null;
};

export async function pinAuth(
  mode: 'login' | 'signup',
  input: { kind: 'phone' | 'email'; identifier: string; pin: string; name?: string },
) {
  const { data } = await api.post(`/api/auth/pin/${mode}`, input);
  const result = data as PinAuthResult;
  if (!result?.ok) throw new Error('Нэвтрэх хүсэлт амжилтгүй боллоо.');
  if (result.accessToken && result.refreshToken) {
    await saveAuthTokens({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
    });
  }
  return result;
}

export async function logoutRequest() {
  await api.post('/api/auth/logout');
}

export async function fetchSession() {
  try {
    const { data } = await api.get('/api/mobile/session');
    return (data as { user: LocalUser | null }).user;
  } catch {
    return null;
  }
}

export async function requestRecovery(body: Record<string, string>) {
  const { data } = await api.post('/api/auth/recovery/request', body);
  return data as { ok: boolean; message?: string };
}

export async function verifyRecovery(body: Record<string, string>) {
  const { data } = await api.post('/api/auth/recovery/verify', body);
  return data as { ok: boolean; credentialKind?: 'pin' | 'password' | 'oauth' };
}

export async function updateRecoveryPassword(password: string) {
  const { data } = await api.post('/api/auth/recovery/update', { password });
  return data as { ok: boolean };
}

export async function fetchCatalog() {
  const { data } = await api.get('/api/mobile/catalog');
  return data as CatalogPayload;
}

export async function fetchMovie(slug: string) {
  const { data } = await api.get(`/api/mobile/movie/${encodeURIComponent(slug)}`);
  return (data as { item: ContentItem }).item;
}

export async function fetchSeries(id: string) {
  const { data } = await api.get(`/api/mobile/series/${encodeURIComponent(id)}`);
  return data as { show: ContentItem; seasons: SeriesSeason[]; episodes: ContentItem[] };
}

export async function fetchPlayback(slug: string) {
  const { data } = await api.get(`/api/mobile/playback/${encodeURIComponent(slug)}`);
  return data as {
    item: ContentItem;
    videoUrl?: string;
    subtitles: ContentItem['subtitles'];
    nextEpisode: ContentItem | null;
    episodes: ContentItem[];
    expiresInSeconds: number;
  };
}

export async function fetchPlans() {
  const { data } = await api.get('/api/mobile/plans');
  return data as {
    authenticated: boolean;
    canWatch: boolean;
    accessExpiresAt: string | null;
    days: number;
    plans: PaymentPlan[];
  };
}

export async function createQpayInvoice(plan: PlanId) {
  const { data } = await api.post('/api/qpay/invoice', { plan });
  return (data as { payment: QPayPayment }).payment;
}

export async function fetchQpayStatus(orderId: string, verify = false) {
  const { data } = await api.get('/api/qpay/status', {
    params: { order_id: orderId, verify: verify ? '1' : undefined },
  });
  return data as { status: QPayPayment['status']; plan?: PlanId; error?: string };
}

export async function fetchLiveNow() {
  const { data } = await api.get('/api/analytics/live');
  return (data as { items?: Array<ContentItem & { viewerCount: number; posterUrl: string | null }> }).items ?? [];
}

export async function recordView(movieId: string) {
  await api.post('/api/analytics/view', { movieId }).catch(() => undefined);
}

export async function liveHeartbeat(
  method: 'post' | 'delete',
  body: { movieId: string; sessionId: string },
) {
  await api.request({ url: '/api/analytics/live', method, data: body }).catch(() => undefined);
}

export async function unlockAdult(pin: string) {
  const { data } = await api.post('/api/account/unlock-adult', { pin });
  return data as { unlocked: boolean };
}

export async function ensureDeviceRegistered() {
  const deviceId = await getDeviceId(createUuid);
  const { data } = await api.get('/api/account/devices', { params: { deviceId } });
  const status = data as {
    currentRegistered: boolean;
    currentDeviceId?: string;
    canRegisterDevice: boolean;
    suggestedName: string;
  };
  if (status.currentDeviceId) await setDeviceId(status.currentDeviceId);
  if (status.currentRegistered) return status;
  if (!status.canRegisterDevice) return status;
  const registered = await api.post('/api/account/devices', {
    deviceId,
    name: `Хүрээ апп • ${status.suggestedName || 'Утас'}`,
  });
  const payload = registered.data as { currentDeviceId?: string };
  if (payload.currentDeviceId) await setDeviceId(payload.currentDeviceId);
  return registered.data;
}

export async function fetchDevices() {
  const { data } = await api.get('/api/account/devices');
  return data as {
    deviceLimit: number | null;
    registeredDeviceCount: number;
    canRegisterDevice: boolean;
    currentDeviceId?: string;
    devices: { id: string; name: string; lastSeenAt: string }[];
  };
}

export async function removeDevice(id: string) {
  await api.delete('/api/account/devices', { params: { id } });
}

export { apiErrorMessage };
