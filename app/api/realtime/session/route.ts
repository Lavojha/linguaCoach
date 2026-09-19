import { createHash } from "crypto";
import { NextResponse } from "next/server";

function safetyIdentifier(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const source = forwarded || request.headers.get("x-real-ip") || "anonymous";
  return createHash("sha256").update(source).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
        "OpenAI-Safety-Identifier": safetyIdentifier(request),
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
      return NextResponse.json(
        { error: data?.error?.message || "Could not create realtime session." },
        { status: response.status },
      );
    }

    const clientSecret = data?.value || data?.client_secret?.value;
    if (!clientSecret) {
      return NextResponse.json({ error: "Realtime client secret was not returned." }, { status: 502 });
    }

    return NextResponse.json({ clientSecret });
  } catch {
    return NextResponse.json({ error: "Unable to create realtime session." }, { status: 502 });
  }
}
