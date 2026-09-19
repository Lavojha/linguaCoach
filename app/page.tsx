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
  const [messages, setMessages] = useState<{role: "user" | "coach"; text: string}[]>([]);
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

    instance.onend = () => {
      setListening(false);
      setTranscript((current) => {
        const spoken = current.trim();
        if (spoken) {
          setMessages((items) => [...items, { role: "user", text: spoken }]);
          respond(spoken);
        }
        return "";
      });
    };
    instance.onerror = () => setListening(false);
    return () => instance.stop();
  }, []);

  function respond(spoken: string) {
    const reply = language === "Hindi"
      ? "Good job. Tell me a little more about that."
      : language === "Spanish"
      ? "Muy bien. Cuéntame un poco más sobre eso."
      : "Good job. Tell me a little more about that.";

    setMessages((items) => [...items, { role: "coach", text: reply }]);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(reply);
      utterance.lang = language === "Hindi" ? "hi-IN" : language === "Spanish" ? "es-ES" : "en-US";
      window.speechSynthesis.speak(utterance);
    }
  }

  function toggleListening() {
    if (!supported || !recognition.current) return;
    if (listening) { recognition.current.stop(); return; }

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
        <p className="sub">Speak naturally. LinguaCoach will listen and reply by voice.</p>

        <label className="label" htmlFor="language">Practice language</label>
        <select id="language" value={language} onChange={e => setLanguage(e.target.value)} disabled={listening}>
          {["English","Hindi","Spanish","French","German","Japanese"].map(x => <option key={x}>{x}</option>)}
        </select>

        <button className={listening ? "orb listening" : "orb"} onClick={toggleListening} disabled={!supported}>
          <span>{!supported ? "Voice unavailable" : listening ? "Stop listening" : "Tap to speak"}</span>
        </button>

        <div className="transcript">{transcript || (listening ? "Waiting for your voice…" : "Speak and your conversation will appear below.")}</div>

        <div className="conversation">
          {messages.map((message, index) => (
            <div key={index} className={message.role === "user" ? "message user" : "message coach"}>
              <span>{message.role === "user" ? "You" : "Coach"}</span>
              <p>{message.text}</p>
            </div>
          ))}
        </div>

        {!supported && <div className="warning">Try Chrome or Edge for browser voice support.</div>}
      </section>
    </main>
  );
}
