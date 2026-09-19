"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LANGUAGES, LEVELS, SCENARIOS, type Language, type Level, type ScenarioId } from "../lib/languages";
import type { CoachAnalysis, TranscriptMessage } from "../lib/coach";
import { mergeVocabulary } from "../lib/progress";
import { readStorage, STORAGE_KEYS, writeStorage, type StoredSession, type StoredVocabulary } from "../lib/storage";

const STORAGE_KEY = "linguacoach.preferences";
const HISTORY_KEY = "linguacoach.session-history";

type SavedSession = { id: string; date: string; language: Language; scenario: ScenarioId; overall: number; summary: string };

export default function Home() {
  const [language, setLanguage] = useState<Language>("English");
  const [level, setLevel] = useState<Level>("Intermediate");
  const [scenario, setScenario] = useState<ScenarioId>("free-talk");
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState("Ready to talk");
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<SavedSession[]>([]);
  const pc = useRef<RTCPeerConnection | null>(null);
  const dc = useRef<RTCDataChannel | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const messagesRef = useRef<TranscriptMessage[]>([]);
  const sessionStartedAt = useRef<number | null>(null);

  const selectedScenario = useMemo(
    () => SCENARIOS.find(item => item.id === scenario) ?? SCENARIOS[0],
    [scenario],
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (saved.language) setLanguage(saved.language);
      if (saved.level) setLevel(saved.level);
      if (saved.scenario) setScenario(saved.scenario);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ language, level, scenario }));
  }, [language, level, scenario]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => () => {
    stream.current?.getTracks().forEach(track => track.stop());
    pc.current?.close();
  }, []);

  function addMessage(role: "user" | "coach", text: string) {
    if (!text?.trim()) return;
    const item = { role, text: text.trim(), timestamp: Date.now() };
    setMessages(items => [...items, item]);
  }

  async function analyzeSession() {
    const transcript = messagesRef.current;
    if (transcript.filter(item => item.role === "user").length === 0) return;

    setAnalyzing(true);
    setError("");
    try {
      const response = await fetch("/api/coach/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, level, scenario, transcript }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not analyze the session.");
      setAnalysis(data.analysis);\n      const durationSeconds = sessionStartedAt.current ? Math.max(1, Math.round((Date.now() - sessionStartedAt.current) / 1000)) : 0;\n      const savedSessions = readStorage<StoredSession[]>(STORAGE_KEYS.sessions, []);\n      const savedVocabulary = readStorage<StoredVocabulary[]>(STORAGE_KEYS.vocabulary, []);\n      const session: StoredSession = {\n        id: Date.now().toString(), createdAt: new Date().toISOString(), language, level, scenario,\n        durationSeconds, userTurns: transcript.filter(item => item.role === "user").length,\n        overall: Number(data.analysis.overall || 0), fluency: Number(data.analysis.fluency || 0),\n        grammar: Number(data.analysis.grammar || 0), vocabulary: Number(data.analysis.vocabulary || 0),\n        confidence: Number(data.analysis.confidence || 0), summary: String(data.analysis.summary || ""),\n      };\n      writeStorage(STORAGE_KEYS.sessions, [session, ...savedSessions].slice(0, 50));\n      writeStorage(STORAGE_KEYS.vocabulary, mergeVocabulary(savedVocabulary, data.analysis.vocabulary || [], language));\n      const session: SavedSession = {\n        id: Date.now().toString(),\n        date: new Date().toISOString(),\n        language,\n        scenario,\n        overall: Number(data.analysis.overall || 0),\n        summary: String(data.analysis.summary || ""),\n      };\n      setHistory(items => {\n        const next = [session, ...items].slice(0, 10);\n        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));\n        return next;\n      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not analyze the session.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function startConversation() {
    try {
      setError("");
      setAnalysis(null);
      setMessages([]);
      setStatus("Connecting…");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not available in this browser.");
      }

      const sessionResponse = await fetch("/api/realtime/session", { method: "POST" });
      const session = await sessionResponse.json();
      if (!sessionResponse.ok || !session.clientSecret) {
        throw new Error(session.error || "Could not create a secure realtime session.");
      }

      const peer = new RTCPeerConnection();
      pc.current = peer;

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed") {
          setError("Voice connection failed. Please try again.");
          stopConversation(false);
        }
      };

      peer.ontrack = event => {
        if (audio.current) {
          audio.current.srcObject = event.streams[0];
          audio.current.play().catch(() => undefined);
        }
      };

      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      stream.current.getTracks().forEach(track => peer.addTrack(track, stream.current!));

      const channel = peer.createDataChannel("oai-events");
      dc.current = channel;

      channel.onopen = () => {
        const instructions = [
          "You are LinguaCoach, an AI language coach. The learner knows they are speaking with AI.",
          "Have a natural, human-like conversation in " + language + ".",
          "Learner level: " + level + ".",
          "Scenario: " + selectedScenario.label + " — " + selectedScenario.description + ".",
          "Keep spoken responses concise and conversational.",
          "Do not turn every response into a lesson. Prioritize natural conversation.",
          "When the learner makes a meaningful language mistake, respond naturally first, then briefly explain one correction.",
          "Ask follow-up questions that keep the learner speaking.",
          "Use vocabulary appropriate to the learner's level.",
        ].join(" ");

        channel.send(JSON.stringify({
          type: "session.update",
          session: {
            instructions,
            turn_detection: { type: "server_vad" },
          },
        }));

        channel.send(JSON.stringify({ type: "response.create" }));
        setConnected(true);
        setStatus("Listening — start speaking");
      };

      channel.onclose = () => {
        if (connected) setStatus("Conversation ended");
      };

      channel.onerror = () => setError("Realtime data channel error. Please restart the conversation.");

      channel.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "conversation.item.input_audio_transcription.completed" && message.transcript) {
            addMessage("user", message.transcript);
          }
          if (
            (message.type === "response.audio_transcript.done" ||
              message.type === "response.output_audio_transcript.done") &&
            message.transcript
          ) {
            addMessage("coach", message.transcript);
          }
          if (message.type === "input_audio_buffer.speech_started") setStatus("Listening…");
          if (message.type === "response.created") setStatus("Coach is thinking…");
          if (message.type === "response.done") setStatus("Listening — your turn");
        } catch {}
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const answerResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + session.clientSecret,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!answerResponse.ok) {
        const details = await answerResponse.text().catch(() => "");
        throw new Error(details || "Realtime connection failed.");
      }

      await peer.setRemoteDescription({
        type: "answer",
        sdp: await answerResponse.text(),
      });
    } catch (e) {
      setStatus("Ready to talk");
      setConnected(false);
      setError(e instanceof Error ? e.message : "Could not connect.");
      stopConversation(false);
    }
  }

  function toggleMute() {
    const tracks = stream.current?.getAudioTracks() || [];
    const nextMuted = !muted;
    tracks.forEach(track => { track.enabled = !nextMuted; });
    setMuted(nextMuted);
    setStatus(nextMuted ? "Microphone muted" : "Listening — your turn");
  }

  function stopConversation(runAnalysis = true) {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    dc.current?.close();
    dc.current = null;
    pc.current?.close();
    pc.current = null;
    setConnected(false);
    setMuted(false);
    setStatus("Conversation ended");
    if (runAnalysis) void analyzeSession();
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <div><div className="brand">LinguaCoach</div><div className="tagline">Speak. Learn. Improve.</div></div>
          <div className="tagline">Speak. Learn. Improve.</div>
        </div>
        <div className="heroActions"><a className="progressLink" href="/progress">Progress</a><div className="status"><span className={connected ? "statusDot live" : "statusDot"} />{status}</div></div>
      </header>

      <section className="card">
        <div className="eyebrow">REALTIME AI LANGUAGE COACH</div>
        <h1>{connected ? "I'm here." : "Let's talk."}</h1>
        <p className="sub">
          Speak naturally. Your coach listens, responds with voice, and helps you improve without breaking the flow.
        </p>

        <div className="controls">
          <div>
            <label className="label" htmlFor="language">Practice language</label>
            <select id="language" value={language} onChange={e => setLanguage(e.target.value as Language)} disabled={connected}>
              {LANGUAGES.map(item => <option key={item.id} value={item.id}>{item.flag} {item.label} — {item.native}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="level">Your level</label>
            <select id="level" value={level} onChange={e => setLevel(e.target.value as Level)} disabled={connected}>
              {LEVELS.map(item => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="scenario">Conversation</label>
            <select id="scenario" value={scenario} onChange={e => setScenario(e.target.value as ScenarioId)} disabled={connected}>
              {SCENARIOS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>
        </div>

        <button
          className={"orb" + (connected ? " listening" : "")}
          onClick={() => connected ? stopConversation() : void startConversation()}
          aria-label={connected ? "End conversation" : "Start voice conversation"}
        >
          <span>{connected ? "End" : "Talk"}</span>
        </button>

        {connected && (
          <div className="voiceActions">
            <button className="secondaryButton" onClick={toggleMute}>{muted ? "Unmute mic" : "Mute mic"}</button>
            <span className="hint">You can interrupt the coach naturally.</span>
          </div>
        )}

        {error && <div className="error" role="alert">{error}</div>}

        {messages.length > 0 && (
          <div className="conversation" aria-live="polite">
            <div className="sectionTitle">Conversation</div>
            {messages.slice(-12).map((message, index) => (
              <div key={message.timestamp + "-" + index} className={"message " + message.role}>
                <span>{message.role === "user" ? "You" : "Coach"}</span>
                <p>{message.text}</p>
              </div>
            ))}
          </div>
        )}

        {(analyzing || analysis) && (
          <section className="analysis">
            <div className="sectionTitle">Session feedback</div>
            {analyzing ? (
              <div className="analysisLoading">Analyzing your conversation…</div>
            ) : analysis ? (
              <>
                <p className="summary">{analysis.summary}</p>
                <div className="scoreGrid">
                  {[
                    ["Overall", analysis.overall],
                    ["Fluency", analysis.fluency],
                    ["Grammar", analysis.grammar],
                    ["Vocabulary", analysis.vocabulary],
                    ["Confidence", analysis.confidence],
                  ].map(([label, score]) => (
                    <div className="score" key={String(label)}>
                      <strong>{Math.round(Number(score))}</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                {analysis.corrections.length > 0 && (
                  <div className="feedbackGroup">
                    <h3>Corrections</h3>
                    {analysis.corrections.map((item, index) => (
                      <div className="feedbackItem" key={index}>
                        <div className="wrong">{item.original}</div>
                        <div className="better">{item.improved}</div>
                        <p>{item.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
                {analysis.vocabulary.length > 0 && (
                  <div className="feedbackGroup">
                    <h3>Useful vocabulary</h3>
                    <div className="vocabGrid">
                      {analysis.vocabulary.map((item, index) => (
                        <div className="vocab" key={index}>
                          <strong>{item.word}</strong>
                          <span>{item.meaning}</span>
                          <p>{item.example}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="feedbackGroup">
                  <h3>Next practice</h3>
                  <ul>{analysis.nextSteps.map((step, index) => <li key={index}>{step}</li>)}</ul>
                </div>
              </>
            ) : null}
          </section>
        )}
      </section>

      <audio ref={audio} autoPlay />
    </main>
  );
}
