"use client";

import { useState } from "react";

export default function Home() {
  const [language, setLanguage] = useState("English");
  const [listening, setListening] = useState(false);
  return (
    <main className="shell">
      <header className="hero"><div className="brand">LinguaCoach</div><div className="status">AI speaking partner</div></header>
      <section className="card">
        <p className="eyebrow">VOICE PRACTICE</p>
        <h1>Let&apos;s talk.</h1>
        <p className="sub">Speak naturally. LinguaCoach will listen, reply, and help you improve.</p>
        <label className="label" htmlFor="language">Practice language</label>
        <select id="language" value={language} onChange={e => setLanguage(e.target.value)}>
          {["English","Hindi","Spanish","French","German","Japanese"].map(x => <option key={x}>{x}</option>)}
        </select>
        <button className={listening ? "orb listening" : "orb"} onClick={() => setListening(!listening)}>
          <span>{listening ? "Listening…" : "Tap to speak"}</span>
        </button>
        <div className="hint">{listening ? `I&apos;m listening in ${language}. Speak naturally.` : "Your conversation, corrections and vocabulary will appear here."}</div>
      </section>
    </main>
  );
}
