const cyrillicToLatin: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', ө: 'u', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ү: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function normalizeSearchText(value: string) {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase('mn')
    .split('')
    .map(character => cyrillicToLatin[character] ?? character)
    .join('')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function matchesSearch(query: string, ...values: string[]) {
  const words = normalizeSearchText(query).split(' ').filter(Boolean);
  if (!words.length) return true;
  const searchable = normalizeSearchText(values.join(' '));
  return words.every(word => searchable.includes(word));
}

export const verticalDramaCategory = 'Босоо драма';

export function isVerticalDrama(item: { kind: string; genre: string[] }) {
  return item.kind === 'movie' && item.genre.includes(verticalDramaCategory);
}

export function formatMoney(amount: number) {
  return `${amount.toLocaleString('mn-MN')}₮`;
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function createUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
