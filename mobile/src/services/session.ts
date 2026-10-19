import * as Keychain from 'react-native-keychain';

const SERVICE = 'mn.khuree.mobile.session';
const USER = 'khuree-cookie-jar';

type PersistedSession = {
  cookies: Record<string, string>;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number | null;
};

let jar: Record<string, string> = {};
let accessToken = '';
let refreshToken = '';
let expiresAt: number | null = null;

function parsePersisted(raw: string): PersistedSession {
  try {
    const parsed = JSON.parse(raw) as PersistedSession | Record<string, string>;
    if (parsed && typeof parsed === 'object' && 'cookies' in parsed && parsed.cookies && typeof parsed.cookies === 'object') {
      return parsed as PersistedSession;
    }
    if (parsed && typeof parsed === 'object') return { cookies: parsed as Record<string, string> };
  } catch {
    /* ignore */
  }
  return { cookies: {} };
}

async function persist() {
  const payload: PersistedSession = { cookies: jar };
  if (accessToken) payload.accessToken = accessToken;
  if (refreshToken) payload.refreshToken = refreshToken;
  if (expiresAt != null) payload.expiresAt = expiresAt;
  await Keychain.setGenericPassword(USER, JSON.stringify(payload), {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function saveCookieJar(next: Record<string, string>) {
  jar = next;
  await persist();
}

export async function loadCookieJar(): Promise<Record<string, string>> {
  const result = await Keychain.getGenericPassword({ service: SERVICE });
  if (!result) {
    jar = {};
    accessToken = '';
    refreshToken = '';
    expiresAt = null;
    return {};
  }
  const parsed = parsePersisted(result.password);
  jar = parsed.cookies ?? {};
  accessToken = parsed.accessToken ?? '';
  refreshToken = parsed.refreshToken ?? '';
  expiresAt = parsed.expiresAt ?? null;
  return jar;
}

export async function clearCookieJar() {
  jar = {};
  accessToken = '';
  refreshToken = '';
  expiresAt = null;
  await Keychain.resetGenericPassword({ service: SERVICE });
}

export async function saveAuthTokens(session: { accessToken: string; refreshToken: string; expiresAt?: number | null }) {
  accessToken = session.accessToken;
  refreshToken = session.refreshToken;
  expiresAt = session.expiresAt ?? null;
  await persist();
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function cookieHeader(cookies: Record<string, string>) {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

export function parseSetCookieHeaders(headers: unknown): Record<string, string> {
  const list: string[] = [];
  if (Array.isArray(headers)) {
    for (const value of headers) if (typeof value === 'string') list.push(value);
  } else if (typeof headers === 'string') {
    list.push(headers);
  }
  const next: Record<string, string> = {};
  for (const header of list) {
    const first = header.split(';')[0];
    const eq = first.indexOf('=');
    if (eq < 1) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1);
    if (name) next[name] = value;
  }
  return next;
}
