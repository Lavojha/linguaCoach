import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const language = String(body.language || "English");
    const message = String(body.message || "").trim();
    if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    const systemPrompt = "You are LinguaCoach, a friendly voice-first language coach. The learner is practicing " + language + ". Reply naturally and briefly like a real conversation partner. If the learner makes an important grammar mistake, first respond naturally, then add one short correction in this format: Correction: ...";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.OPENAI_API_KEY },
      body: JSON.stringify({ model: "gpt-5.6-luna", input: [{ role: "system", content: systemPrompt }, { role: "user", content: message }] })
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "OpenAI request failed." }, { status: response.status });
    return NextResponse.json({ reply: data.output_text || "I did not catch that. Could you say it again?" });
  } catch {
    return NextResponse.json({ error: "Unable to process the conversation." }, { status: 500 });
  }
}