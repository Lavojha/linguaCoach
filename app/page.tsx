"use client";

import { useEffect, useRef, useState } from "react";

type RecognitionEventLike = Event & { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean;
  start: () => void; stop: () => void;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export default function Home() {
  const [language, setLanguage] = useState("English");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => {
    const w = window as SpeechWindow;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) { setSupported(false); return; }
    const instance = new SpeechRecognition();
    instance.interimResults = true;
    instance.continuous = false;
    recognition.current = instance;
    instance.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      setTranscript(text);
    };
    instance.onend = () => setListening(false);
    instance.onerror = () => setListening(false);
    return () => instance.stop();
  }, []);

  function toggleListening() {
    if (!supported || !recognition.current) return;
    if (listening) { recognition.current.stop(); setListening(false); return; }
    const locale = language === "English" ? "en-US" : language === "Hindi" ? "hi-IN" :
      language === "Spanish" ? "es-ES" : language === "French" ? "fr-FR" :
      language === "German" ? "de-DE" : "ja-JP";
    recognition.current.lang = locale;
    setTranscript("");
    recognition.current.start();
    setListening(true);
  }

  return (
    <main className="shell">
      <header className="hero"><div className="brand">LinguaCoach</div><div className="status">AI speaking partner</div></header>
      <section className="card">
        <p className="eyebrow">VOICE PRACTICE</p>
        <h1>{listening ? "I&apos;m listening." : "Let&apos;s talk."}</h1>
        <p className="sub">Speak naturally. LinguaCoach will listen, capture your speech, and help you improve.</p>
        <label className="label" htmlFor="language">Practice language</label>
        <select id="language" value={language} onChange={e => setLanguage(e.target.value)} disabled={listening}>
          {["English","Hindi","Spanish","French","German","Japanese"].map(x => <option key={x}>{x}</option>)}
        </select>
        <button className={listening ? "orb listening" : "orb"} onClick={toggleListening} disabled={!supported}>
          <span>{!supported ? "Voice unavailable" : listening ? "Stop listening" : "Tap to speak"}</span>
        </button>
        <div className="transcript">{transcript || (listening ? "Waiting for your voice…" : "Your speech transcript will appear here.")}</div>
        {!supported && <div className="warning">This browser does not support speech recognition. Try Chrome or Edge.</div>}
      </section>
    </main>
  );
}
