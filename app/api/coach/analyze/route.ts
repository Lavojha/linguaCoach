import { NextResponse } from "next/server";

const schema = {
  type: "object",
  properties: {
    overall: { type: "number" },
    fluency: { type: "number" },
    grammar: { type: "number" },
    vocabulary: { type: "number" },
    confidence: { type: "number" },
    summary: { type: "string" },
    corrections: { type: "array", items: { type: "object", properties: {
      original: { type: "string" }, improved: { type: "string" }, explanation: { type: "string" }
    }, required: ["original", "improved", "explanation"], additionalProperties: false } },
    vocabulary: { type: "array", items: { type: "object", properties: {
      word: { type: "string" }, meaning: { type: "string" }, example: { type: "string" }
    }, required: ["word", "meaning", "example"], additionalProperties: false } },
    nextSteps: { type: "array", items: { type: "string" } }
  },
  required: ["overall", "fluency", "grammar", "vocabulary", "confidence", "summary", "corrections", "vocabulary", "nextSteps"],
  additionalProperties: false
};

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    const body = await request.json();
    const language = String(body.language || "English");
    const level = String(body.level || "Intermediate");
    const scenario = String(body.scenario || "free-talk");
    const transcript = Array.isArray(body.transcript) ? body.transcript : [];
    if (!transcript.length) return NextResponse.json({ error: "Transcript is required." }, { status: 400 });

    const cleanTranscript = transcript.slice(-60).map((item: { role?: string; text?: string }) =>
      (item.role === "user" ? "LEARNER" : "COACH") + ": " + String(item.text || "").slice(0, 1200)
    ).join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.OPENAI_API_KEY },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        input: [
          { role: "system", content: "You are LinguaCoach's post-session evaluator. Analyze only the learner's language performance. Be encouraging but precise. Scores are 0-100. Give at most 5 corrections, 6 vocabulary items, and 3 next steps. Return JSON matching the schema." },
          { role: "user", content: "Practice language: " + language + "\nLevel: " + level + "\nScenario: " + scenario + "\n\nTranscript:\n" + cleanTranscript }
        ],
        max_output_tokens: 1400,
        text: { format: { type: "json_schema", name: "linguacoach_session_analysis", strict: true, schema } }
      })
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "Coaching analysis failed." }, { status: response.status });
    if (!data.output_text) return NextResponse.json({ error: "The coaching analysis was empty." }, { status: 502 });
    return NextResponse.json({ analysis: JSON.parse(data.output_text) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to analyze session." }, { status: 500 });
  }
}
