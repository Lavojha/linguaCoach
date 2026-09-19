import type { StoredSession, StoredVocabulary } from "./storage";

export function calculateProgress(sessions: StoredSession[]) {
  if (!sessions.length) {
    return { sessions: 0, minutes: 0, average: 0, latest: null, improvement: 0 };
  }

  const minutes = Math.round(
    sessions.reduce((sum, item) => sum + item.durationSeconds, 0) / 60,
  );
  const average = Math.round(
    sessions.reduce((sum, item) => sum + item.overall, 0) / sessions.length,
  );
  const latest = sessions[0]?.overall ?? 0;
  const previous = sessions.slice(1, 4);
  const previousAverage = previous.length
    ? previous.reduce((sum, item) => sum + item.overall, 0) / previous.length
    : latest;

  return {
    sessions: sessions.length,
    minutes,
    average,
    latest,
    improvement: Math.round(latest - previousAverage),
  };
}

export function mergeVocabulary(
  current: StoredVocabulary[],
  incoming: Array<{ word: string; meaning: string; example: string }>,
  language: string,
) {
  const next = [...current];

  for (const item of incoming) {
    const word = item.word.trim();
    if (!word) continue;

    const existing = next.find(
      entry => entry.language === language && entry.word.toLowerCase() === word.toLowerCase(),
    );

    if (existing) {
      existing.meaning = item.meaning;
      existing.example = item.example;
      existing.reviewCount += 1;
    } else {
      next.unshift({
        id: crypto.randomUUID(),
        word,
        meaning: item.meaning,
        example: item.example,
        language,
        firstSeenAt: new Date().toISOString(),
        reviewCount: 1,
      });
    }
  }

  return next.slice(0, 100);
}
