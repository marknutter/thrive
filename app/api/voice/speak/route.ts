import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const runtime = "nodejs";

/**
 * POST /api/voice/speak
 * Accepts text and returns audio via ElevenLabs TTS.
 * Keys stay server-side - never exposed to client.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "cgSgspJ2msm6clMCkdW9";

  if (!elevenLabsApiKey) {
    return NextResponse.json({ error: "Voice services not configured" }, { status: 503 });
  }

  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Send to ElevenLabs for TTS
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Voice] ElevenLabs error:", errorText);
      throw new Error(`ElevenLabs error: ${response.status}`);
    }

    // Return audio as binary
    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("[Voice] TTS error:", error);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
