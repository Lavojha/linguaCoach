"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateProgress } from "../../lib/progress";
import { readStorage, STORAGE_KEYS, type StoredSession, type StoredVocabulary } from "../../lib/storage";

export default function ProgressPage() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [vocabulary, setVocabulary] = useState<StoredVocabulary[]>([]);

  useEffect(() => {
    setSessions(readStorage<StoredSession[]>(STORAGE_KEYS.sessions, []));
    setVocabulary(readStorage<StoredVocabulary[]>(STORAGE_KEYS.vocabulary, []));
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
