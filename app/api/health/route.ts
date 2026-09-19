import { NextResponse } from "next/server";

export async function GET() {
  const configured = Boolean(process.env.OPENAI_API_KEY);
  return NextResponse.json({
    ok: true,
    service: "linguacoach",
    configured,
    realtimeModel: "gpt-realtime-2.1-mini",
    coachingModel: "gpt-5.6-luna",
    transport: "webrtc",
  }, { status: configured ? 200 : 503 });
}
