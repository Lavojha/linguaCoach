export const STORAGE_KEYS = {
  preferences: "linguacoach.preferences",
  sessions: "linguacoach.sessions",
  vocabulary: "linguacoach.vocabulary",
} as const;

export type StoredSession = {
  id: string;
  createdAt: string;
  language: string;
  level: string;
  scenario: string;
  durationSeconds: number;
  userTurns: number;
  overall: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  confidence: number;
  summary: string;
};

export type StoredVocabulary = {
  id: string;
  word: string;
  meaning: string;
  example: string;
  language: string;
  firstSeenAt: string;
  reviewCount: number;
};

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}
