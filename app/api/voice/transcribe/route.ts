import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import OpenAI, { toFile } from "openai";

export const runtime = "nodejs";

/**
 * POST /api/voice/transcribe
 * Accepts audio data and returns transcript via OpenAI Whisper.
 * Keys stay server-side - never exposed to client.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return NextResponse.json({ error: "Voice services not configured" }, { status: 503 });
  }

  try {
    const arrayBuffer = await req.arrayBuffer();
    const contentType = req.headers.get("content-type") || "audio/webm";
    
    // Determine file extension from content type
    let filename = "recording.webm";
    if (contentType.includes("mp4") || contentType.includes("m4a")) {
      filename = "recording.m4a";
    } else if (contentType.includes("ogg")) {
      filename = "recording.ogg";
    } else if (contentType.includes("wav")) {
      filename = "recording.wav";
    }
    
    console.log("[Voice] Transcribing audio, size:", arrayBuffer.byteLength, "type:", contentType, "filename:", filename);

    const openai = new OpenAI({ apiKey: openaiApiKey });
    
    // Use toFile helper from openai SDK
    const file = await toFile(Buffer.from(arrayBuffer), filename, { type: contentType });
    
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    });

    const transcript = transcription.text || "";
    console.log("[Voice] Transcript:", transcript || "(empty)");

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("[Voice] Transcription error:", error);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
