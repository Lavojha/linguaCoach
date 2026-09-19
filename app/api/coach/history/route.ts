import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = body?.session;

    if (!session || typeof session !== "object") {
      return NextResponse.json({ error: "Session is required." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      persisted: false,
      message: "Client-side persistence is active until account storage is configured.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid session payload." }, { status: 400 });
  }
}
