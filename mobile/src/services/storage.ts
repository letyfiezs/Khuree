import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlaybackProgress, RecentWatchItem } from '../types/content';

const RECENT_KEY = 'khuree-recently-watched';
const PROGRESS_KEY = 'khuree-playback-progress';
const DEVICE_KEY = 'khuree-device-id';

export async function loadRecent(): Promise<RecentWatchItem[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentWatchItem[]) : [];
  } catch {
    return [];
  }
}

export async function saveRecent(item: Omit<RecentWatchItem, 'watchedAt'>) {
  const saved = await loadRecent();
  const next = [{ ...item, watchedAt: Date.now() }, ...saved.filter(entry => entry.id !== item.id)].slice(0, 20);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}

export async function clearRecent() {
  await AsyncStorage.removeItem(RECENT_KEY);
}

export async function loadProgressMap(): Promise<Record<string, PlaybackProgress>> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PlaybackProgress>) : {};
  } catch {
    return {};
  }
}

export async function saveProgress(progress: PlaybackProgress) {
  const map = await loadProgressMap();
  map[progress.movieId] = progress;
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
}

export async function getProgress(movieId: string) {
  const map = await loadProgressMap();
  return map[movieId];
}

export async function readDeviceId() {
  return AsyncStorage.getItem(DEVICE_KEY);
}

export async function getDeviceId(createIfMissing: () => string) {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = createIfMissing();
  await AsyncStorage.setItem(DEVICE_KEY, id);
  return id;
}

export async function setDeviceId(id: string) {
  await AsyncStorage.setItem(DEVICE_KEY, id);
}
