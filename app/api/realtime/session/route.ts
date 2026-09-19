import { NextResponse } from "next/server";

export async function POST() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: "gpt-realtime-2.1-mini",
        audio: { output: { voice: "marin" } },
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: data?.error?.message || "Could not create realtime session." }, { status: response.status });
  }

  return NextResponse.json({ clientSecret: data?.value || data?.client_secret?.value });
}
