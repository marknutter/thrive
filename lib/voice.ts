/**
 * Voice service for Thrive - push-to-talk mode.
 * User taps to start speaking, taps again or silence to stop.
 * Works reliably on Safari iOS.
 */

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

export interface VoiceConfig {
  onTranscript: (text: string, isFinal: boolean) => void;
  onTurnEnd: (transcript: string) => void;
  onError: (error: Error) => void;
  onStateChange: (state: VoiceState) => void;
  onPlaybackReady?: (playback: PlaybackSource) => void;
}

export interface PlaybackSource {
  url: string;
  mimeType: string;
}

// Global audio element for Safari - must warm up on user gesture
let globalAudioElement: HTMLAudioElement | null = null;
let audioWarmedUp = false;

// Call this on user tap to unlock audio playback
export function warmUpAudio(): void {
  if (audioWarmedUp) return;
  
  console.log("[Voice] Warming up audio...");
  if (!globalAudioElement) {
    globalAudioElement = new Audio();
  }
  
  // Play silent audio to unlock playback
  const silentDataUri = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
  globalAudioElement.src = silentDataUri;
  globalAudioElement.volume = 0.01;
  globalAudioElement.play().then(() => {
    console.log("[Voice] Audio warmed up");
    audioWarmedUp = true;
  }).catch((e) => {
    console.log("[Voice] Warmup failed:", e.message);
  });
}

export class VoiceService {
  private config: VoiceConfig;
  private recognition: any = null;
  private state: VoiceState = "idle";
  private finalTranscript = "";
  private interimTranscript = "";
  private silenceTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastSpeechTime = 0;
  
  private readonly SILENCE_DURATION_MS = 2000; // 2s silence = end turn

  constructor(config: VoiceConfig) {
    this.config = config;
  }

  async startListening(): Promise<void> {
    console.log("[Voice] Starting to listen (push-to-talk)...");
    
    // Warm up audio on user gesture so TTS can play later
    warmUpAudio();
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error("Speech recognition not supported");
    }

    // Clean up any existing recognition
    if (this.recognition) {
      try { this.recognition.abort(); } catch(e) {}
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";
    
    this.finalTranscript = "";
    this.interimTranscript = "";
    
    this.recognition.onstart = () => {
      console.log("[Voice] Recognition started");
      this.setState("listening");
      this.lastSpeechTime = Date.now();
      this.startSilenceDetection();
    };

    this.recognition.onresult = (event: any) => {
      this.lastSpeechTime = Date.now();
      
      let interim = "";
      let final = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      
      if (final) {
        this.finalTranscript += final;
      }
      
      this.interimTranscript = interim;
      const fullTranscript = this.finalTranscript + this.interimTranscript;
      
      console.log("[Voice] Transcript:", fullTranscript);
      this.config.onTranscript(fullTranscript, !!final);
    };

    this.recognition.onerror = (event: any) => {
      console.error("[Voice] Error:", event.error);
      
      if (event.error === "no-speech" || event.error === "aborted") {
        return; // Not real errors
      }
      
      this.config.onError(new Error(event.error));
    };

    this.recognition.onend = () => {
      console.log("[Voice] Recognition ended, state:", this.state);
      this.clearSilenceTimeout();
      
      // If we have a transcript, send it
      if (this.state === "listening" && this.finalTranscript.trim()) {
        this.endTurn();
      } else if (this.state === "listening") {
        // No transcript, just go back to idle
        this.setState("idle");
      }
    };

    try {
      // Explicitly request microphone permission first — Chrome won't prompt
      // for SpeechRecognition alone on some origins
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop()); // Release immediately; we just need the permission
      this.recognition.start();
    } catch (error) {
      console.error("[Voice] Start failed:", error);
      throw error;
    }
  }

  stopListening(): void {
    console.log("[Voice] Stopping listening...");
    this.clearSilenceTimeout();
    
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.log("[Voice] Stop error:", e);
      }
    }
  }

  private startSilenceDetection(): void {
    this.clearSilenceTimeout();
    
    const checkSilence = () => {
      if (this.state !== "listening") return;
      
      const timeSinceLastSpeech = Date.now() - this.lastSpeechTime;
      
      if (this.finalTranscript.trim() && timeSinceLastSpeech > this.SILENCE_DURATION_MS) {
        console.log("[Voice] Silence detected, ending turn");
        this.stopListening();
        return;
      }
      
      this.silenceTimeout = setTimeout(checkSilence, 500);
    };
    
    this.silenceTimeout = setTimeout(checkSilence, 500);
  }

  private clearSilenceTimeout(): void {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  private endTurn(): void {
    const transcript = this.finalTranscript.trim();
    console.log("[Voice] Turn ended:", transcript);
    
    if (transcript) {
      this.setState("processing");
      this.config.onTurnEnd(transcript);
    } else {
      this.setState("idle");
    }
  }

  async speak(text: string): Promise<void> {
    console.log("[Voice] Speaking:", text.substring(0, 50) + "...");
    this.setState("speaking");

    try {
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        console.error("[Voice] TTS request failed:", response.status, errBody.slice(0, 200));
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("audio")) {
        const errBody = await response.text().catch(() => "");
        console.error("[Voice] TTS returned non-audio:", contentType, errBody.slice(0, 200));
        throw new Error("TTS returned non-audio response");
      }

      const audioData = await response.arrayBuffer();
      if (audioData.byteLength < 100) {
        console.error("[Voice] Audio too small:", audioData.byteLength, "bytes");
        throw new Error("TTS returned empty audio");
      }

      console.log("[Voice] Audio ready, size:", audioData.byteLength);
      this.playAudio(audioData);
    } catch (error) {
      console.error("[Voice] Speak error:", error);
      this.config.onError(error as Error);
    }
  }

  handlePlaybackComplete(): void {
    this.setState("idle");
    console.log("[Voice] Ready for next push-to-talk");
  }

  handlePlaybackStarted(): void {
    this.setState("speaking");
  }

  handlePlaybackPaused(): void {
    this.setState("idle");
  }

  handlePlaybackError(error: Error): void {
    console.error("[Voice] Playback error:", error);
    this.config.onError(error);
    this.setState("idle");
  }

  private setState(state: VoiceState): void {
    console.log("[Voice] State:", this.state, "→", state);
    this.state = state;
    this.config.onStateChange(state);
  }

  getState(): VoiceState {
    return this.state;
  }

  private playAudio(audioData: ArrayBuffer): void {
    const blob = new Blob([audioData], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    this.config.onPlaybackReady?.({
      url,
      mimeType: "audio/mpeg",
    });
  }
}
