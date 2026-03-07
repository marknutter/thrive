"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { VoiceService, VoiceState } from "./voice";

interface UseVoiceOptions {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onTurnEnd?: (transcript: string) => void;
  onError?: (error: Error) => void;
}

interface UseVoiceReturn {
  isListening: boolean;
  voiceState: VoiceState;
  currentTranscript: string;
  toggleListening: () => Promise<void>;
  speak: (text: string) => Promise<void>;
  isSupported: boolean;
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const voiceServiceRef = useRef<VoiceService | null>(null);
  const optionsRef = useRef(options);
  
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;
    
    setIsSupported(!!SpeechRecognition);
  }, []);

  // Create voice service on first use
  const getVoiceService = useCallback(() => {
    if (!voiceServiceRef.current) {
      voiceServiceRef.current = new VoiceService({
        onTranscript: (text, isFinal) => {
          setCurrentTranscript(text);
          optionsRef.current.onTranscript?.(text, isFinal);
        },
        onTurnEnd: (transcript) => {
          setCurrentTranscript("");
          optionsRef.current.onTurnEnd?.(transcript);
        },
        onError: (error) => {
          console.error("[useVoice] Error:", error);
          optionsRef.current.onError?.(error);
        },
        onStateChange: (state) => {
          console.log("[useVoice] State:", state);
          setVoiceState(state);
        },
      });
    }
    return voiceServiceRef.current;
  }, []);

  const toggleListening = useCallback(async () => {
    const service = getVoiceService();
    const currentState = service.getState();
    
    if (currentState === "listening") {
      // Stop listening
      service.stopListening();
    } else if (currentState === "idle") {
      // Start listening
      try {
        setCurrentTranscript("");
        await service.startListening();
      } catch (error) {
        console.error("[useVoice] Failed to start:", error);
        optionsRef.current.onError?.(error as Error);
      }
    }
    // If speaking or processing, ignore tap
  }, [getVoiceService]);

  const speak = useCallback(async (text: string) => {
    const service = getVoiceService();
    await service.speak(text);
  }, [getVoiceService]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (voiceServiceRef.current) {
        voiceServiceRef.current.stopListening();
      }
    };
  }, []);

  return {
    isListening: voiceState === "listening",
    voiceState,
    currentTranscript,
    toggleListening,
    speak,
    isSupported,
  };
}
