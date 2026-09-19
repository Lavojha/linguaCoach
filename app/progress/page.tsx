"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateProgress } from "../../lib/progress";
import { readStorage, STORAGE_KEYS, type StoredSession, type StoredVocabulary } from "../../lib/storage";
import { cloudConfigured, getAuthSession, loadCloudData } from "../../lib/cloud";
import "./progress.css";

export default function ProgressPage() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [vocabulary, setVocabulary] = useState<StoredVocabulary[]>([]);

  useEffect(() => {
    setSessions(readStorage<StoredSession[]>(STORAGE_KEYS.sessions, []));
    setVocabulary(readStorage<StoredVocabulary[]>(STORAGE_KEYS.vocabulary, []));
    if (cloudConfigured && getAuthSession()) {
      void loadCloudData().then(data => {
        const cloudSessions: StoredSession[] = (data.sessions || []).map((item: any) => ({
          id: item.id, createdAt: item.created_at, language: item.language, level: item.level,
          scenario: item.scenario, durationSeconds: item.duration_seconds, userTurns: item.user_turns,
          overall: Number(item.overall), fluency: Number(item.fluency), grammar: Number(item.grammar),
          vocabulary: Number(item.vocabulary), confidence: Number(item.confidence), summary: item.summary,
        }));
        const cloudVocabulary: StoredVocabulary[] = (data.vocabulary || []).map((item: any) => ({
          id: item.id, word: item.word, meaning: item.meaning, example: item.example,
          language: item.language, firstSeenAt: item.first_seen_at, reviewCount: item.review_count,
        }));
        setSessions(cloudSessions);
        setVocabulary(cloudVocabulary);
        writeStorage(STORAGE_KEYS.sessions, cloudSessions);
        writeStorage(STORAGE_KEYS.vocabulary, cloudVocabulary);
      }).catch(() => undefined);
    }
  }, []);

  const progress = useMemo(() => calculateProgress(sessions), [sessions]);

  return (
    <main className="progressShell">
      <header className="progressHeader">
        <a href="/" className="backLink">← Practice</a>
        <div>
          <div className="brand">Your progress</div>
          <p>See how your speaking practice is building over time.</p>
        </div>
      </header>

      <section className="progressGrid">
        <div className="metric"><strong>{progress.sessions}</strong><span>Sessions</span></div>
        <div className="metric"><strong>{progress.minutes}</strong><span>Minutes spoken</span></div>
        <div className="metric"><strong>{progress.average || "—"}</strong><span>Average score</span></div>
        <div className="metric"><strong>{progress.improvement > 0 ? "+" : ""}{progress.improvement || "—"}</strong><span>Recent change</span></div>
      </section>

      <section className="progressCard">
        <div className="sectionTitle">Session history</div>
        {sessions.length === 0 ? (
          <p className="empty">Finish a conversation to start building your learning history.</p>
        ) : (
          <div className="sessionRows">
            {sessions.map(item => (
              <div className="sessionRow" key={item.id}>
                <div>
                  <strong>{item.language} · {item.scenario.replace("-", " ")}</strong>
                  <span>{new Date(item.createdAt).toLocaleDateString()} · {Math.round(item.durationSeconds / 60)} min</span>
                </div>
                <b>{Math.round(item.overall)}</b>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="progressCard">
        <div className="sectionTitle">Vocabulary bank</div>
        {vocabulary.length === 0 ? (
          <p className="empty">Useful words from your sessions will appear here.</p>
        ) : (
          <div className="wordGrid">
            {vocabulary.slice(0, 20).map(item => (
              <div className="wordCard" key={item.id}>
                <strong>{item.word}</strong>
                <span>{item.meaning}</span>
                <p>{item.example}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
