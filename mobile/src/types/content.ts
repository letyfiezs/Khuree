export type ContentKind = 'movie' | 'series';
export type AudioLabel = 'Субтай' | 'Хэлтэй';
export type WatchSection = 'movie' | 'series' | 'vertical' | 'adult';
export type PlanId = 'movie' | 'series' | 'vertical' | 'adult' | 'vip';
export type CredentialKind = 'pin' | 'password' | 'oauth';

export type SubtitleTrack = {
  id: string;
  label: string;
  language: string;
  key: string;
  originalFilename: string;
  sourceUrl?: string;
};

export type ContentItem = {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  year: number;
  duration: string;
  age: string;
  rating: number;
  genre: string[];
  kind: ContentKind;
  status: 'published' | 'draft' | 'processing';
  accent: string;
  episodes?: number;
  hasVideo?: boolean;
  subtitles?: SubtitleTrack[];
  posterUrl?: string;
  backdropUrl?: string;
  featured?: boolean;
  backdropPositionX?: number;
  backdropPositionY?: number;
  backdropZoom?: number;
  seriesTitle?: string;
  seriesId?: string;
  seasonId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  audioLabel?: AudioLabel;
};

export type SeriesSeason = { id: string; seriesId: string; number: number; title: string };

export type RegisteredDevice = {
  id: string;
  name: string;
  createdAt: string;
  lastSeenAt: string;
  fingerprint?: string;
};

export type LocalUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  recoveryEmail?: string;
  loginKind?: 'phone' | 'email';
  credentialKind: CredentialKind;
  role: 'user' | 'admin';
  emailVerified: boolean;
  adultEnabled: boolean;
  hasParentalPin: boolean;
  adultUnlocked: boolean;
  canWatch: boolean;
  accessExpiresAt?: string;
  watchPermissions: Record<WatchSection, boolean>;
  devices: RegisteredDevice[];
  deviceLimit: number | null;
};

export type CatalogPayload = {
  items: ContentItem[];
  movies: ContentItem[];
  popularIds: string[];
  categories: { id: string; name: string }[];
  authenticated: boolean;
  adultUnlocked: boolean;
};

export type PaymentPlan = { id: PlanId; name: string; description: string; price: number };

export type QPayPayment = {
  id: string;
  amount: number;
  status: 'creating' | 'pending' | 'paid' | 'failed';
  qrImage: string | null;
  shortUrl: string | null;
  urls: { name: string; description: string; logo: string; link: string }[];
};

export type RecentWatchItem = {
  id: string;
  slug: string;
  title: string;
  posterUrl?: string;
  year?: number;
  age?: string;
  kind?: ContentKind;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  audioLabel?: AudioLabel;
  watchedAt: number;
};

export type PlaybackProgress = {
  movieId: string;
  slug: string;
  position: number;
  duration: number;
  updatedAt: number;
};

export type LiveChannel = {
  id: string;
  name: string;
  category: string;
  streamUrl: string;
  accent: string;
};
