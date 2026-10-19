import axios, { type AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config';
import { readDeviceId } from './storage';
import {
  clearCookieJar,
  cookieHeader,
  getAccessToken,
  getRefreshToken,
  loadCookieJar,
  parseSetCookieHeaders,
  saveAuthTokens,
  saveCookieJar,
} from './session';

let jar: Record<string, string> = {};
let sessionExpiredHandler: (() => void) | undefined;
let refreshPromise: Promise<boolean> | null = null;

export function onSessionExpired(handler: () => void) {
  sessionExpiredHandler = handler;
}

export async function hydrateCookieJar() {
  jar = await loadCookieJar();
}

export async function mergeCookies(incoming: Record<string, string>) {
  if (!Object.keys(incoming).length) return;
  jar = { ...jar, ...incoming };
  await saveCookieJar(jar);
}

export async function resetSessionCookies() {
  jar = {};
  await clearCookieJar();
}

function readSetCookie(headers: AxiosHeaders | Record<string, unknown>) {
  const raw =
    (headers as Record<string, unknown>)['set-cookie'] ??
    (headers as Record<string, unknown>)['Set-Cookie'];
  return parseSetCookieHeaders(raw);
}

function applyAuth(config: InternalAxiosRequestConfig) {
  config.headers = config.headers ?? {};
  const header = cookieHeader(jar);
  if (header) config.headers.Cookie = header;
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}

function isAuthUrl(url: string) {
  return url.includes('/api/auth/') || url.includes('/api/mobile/auth/');
}

function shouldAttemptRefresh(url: string, method?: string) {
  if (isAuthUrl(url)) return false;
  if (url.includes('/api/mobile/session') && (method ?? 'get').toLowerCase() === 'post') return false;
  return true;
}

async function refreshAccessToken() {
  const token = getRefreshToken();
  if (!token) return false;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/api/mobile/session`,
          { refreshToken: token },
          { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, timeout: 20000 },
        );
        const session = data as { accessToken?: string; refreshToken?: string; expiresAt?: number | null };
        if (!session.accessToken || !session.refreshToken) return false;
        await saveAuthTokens({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
        });
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  withCredentials: true,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Khuree-Client': 'mobile' },
});

api.interceptors.request.use(async config => {
  applyAuth(config);
  const deviceId = await readDeviceId();
  if (deviceId) {
    config.headers = config.headers ?? {};
    config.headers['X-Khuree-Device-Id'] = deviceId;
  }
  return config;
});

api.interceptors.response.use(
  async response => {
    await mergeCookies(readSetCookie(response.headers as AxiosHeaders));
    return response;
  },
  async error => {
    const headers = error?.response?.headers as AxiosHeaders | undefined;
    if (headers) await mergeCookies(readSetCookie(headers));
    const status = error?.response?.status;
    const config = error?.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = String(config?.url ?? '');
    if (status === 401 && config && !config._retry && shouldAttemptRefresh(url, config.method)) {
      config._retry = true;
      const refreshed = await refreshAccessToken();
      if (refreshed) return api.request(applyAuth(config));
      sessionExpiredHandler?.();
    } else if (status === 401 && !isAuthUrl(url)) {
      sessionExpiredHandler?.();
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | string | undefined;
    if (typeof data === 'object' && data?.error) return data.error;
    if (error.response?.status === 404) return 'Серверийн нэвтрэх API олдсонгүй. Дахин оролдоно уу.';
    if (!error.response) return 'Сервертэй холбогдож чадсангүй. Интернэтээ шалгана уу.';
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
