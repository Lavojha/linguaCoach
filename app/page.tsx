"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [language, setLanguage] = useState("English");
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Ready to talk");
  const [messages, setMessages] = useState<{role: "user" | "coach"; text: string}[]>([]);
  const pc = useRef<RTCPeerConnection | null>(null);
  const dc = useRef<RTCDataChannel | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => () => {
    stream.current?.getTracks().forEach(track => track.stop());
    pc.current?.close();
  }, []);

  async function startConversation() {
    try {
      setStatus("Connecting…");
      const sessionResponse = await fetch("/api/realtime/session", { method: "POST" });
      const session = await sessionResponse.json();
      if (!session.clientSecret) throw new Error(session.error || "Could not create session.");

      const peer = new RTCPeerConnection();
      pc.current = peer;
      peer.ontrack = event => {
        if (audio.current) {
          audio.current.srcObject = event.streams[0];
          audio.current.play().catch(() => undefined);
        }
      };

      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current.getTracks().forEach(track => peer.addTrack(track, stream.current!));

      const channel = peer.createDataChannel("oai-events");
      dc.current = channel;
      channel.onopen = () => {
        channel.send(JSON.stringify({
          type: "session.update",
          session: {
            instructions: "You are LinguaCoach. Speak naturally with the learner in " + language + ". Keep replies concise. Correct only important mistakes and explain corrections briefly.",
            turn_detection: { type: "server_vad" }
          }
        }));
        setConnected(true);
        setStatus("Listening — start speaking");
      };

      channel.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "conversation.item.input_audio_transcription.completed" && message.transcript) {
            setMessages(items => [...items, { role: "user", text: message.transcript }]);
          }
          if (message.type === "response.audio_transcript.done" && message.transcript) {
            setMessages(items => [...items, { role: "coach", text: message.transcript }]);
          }
          if (message.type === "input_audio_buffer.speech_started") setStatus("Listening…");
          if (message.type === "response.created") setStatus("Coach is thinking…");
          if (message.type === "response.audio.delta") setStatus("Coach is speaking…");
          if (message.type === "response.done") setStatus("Listening — your turn");
        } catch {}
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const answerResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: { Authorization: "Bearer " + session.clientSecret, "Content-Type": "application/sdp" },
        body: offer.sdp
      });
      if (!answerResponse.ok) throw new Error("Realtime connection failed.");
      const answer = await answerResponse.text();
      await peer.setRemoteDescription({ type: "answer", sdp: answer });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not connect.");
      setConnected(false);
    }
  }

  function stopConversation() {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    dc.current?.close();
    dc.current = null;
    pc.current?.close();
    pc.current = null;
    setConnected(false);
    setStatus("Ready to talk");
  }

  return (
    <main className="shell">
      <header className="hero">
        <div className="brand">LinguaCoach</div>
        <div className="status">{status}</div>
      </header>

      <section className="card">
        <p className="eyebrow">REALTIME VOICE</p>
        <h1>{connected ? "I&apos;m here." : "Let&apos;s talk."}</h1>
        <p className="sub">Speak naturally. The AI can listen, understand, and respond with voice.</p>

        <label className="label" htmlFor="language">Practice language</label>
        <select id="language" value={language} onChange={e => setLanguage(e.target.value)} disabled={connected}>
          {["English", "Hindi", "Spanish", "French", "German", "Japanese"].map(x => <option key={x}>{x}</option>)}
        </select>

        {!connected ? (
          <button className="orb" onClick={startConversation}><span>Start voice chat</span></button>
        ) : (
          <button className="orb listening" onClick={stopConversation}><span>End conversation</span></button>
        )}

        <div className="conversation">
          {messages.map((message, index) => (
            <div key={index} className={message.role === "user" ? "message user" : "message coach"}>
              <span>{message.role === "user" ? "You" : "Coach"}</span>
              <p>{message.text}</p>
            </div>
          ))}
        </div>
      </section>
      <audio ref={audio} autoPlay />
    </main>
  );
}
