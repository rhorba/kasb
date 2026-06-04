"use client";

import { extractDescription, parseAmountFromTranscript } from "@/lib/voice/number-parser";
import { type VoiceState, createVoiceRecorder, isVoiceAvailable } from "@/lib/voice/recorder";
import { useEffect, useRef, useState } from "react";

type Props = {
  /** Called when the voice input yields a parsed amount and description */
  onParsed: (amountCentimes: number, description: string) => void;
  /** Called with raw transcript if amount could not be parsed */
  onTranscript: (transcript: string) => void;
};

export default function VoiceEntryButton({ onParsed, onTranscript }: Props) {
  const [voiceState, setVoiceState] = useState<VoiceState>({ status: "idle" });
  const recorderRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    if (!isVoiceAvailable()) return;
    recorderRef.current = createVoiceRecorder((state) => {
      setVoiceState(state);
      if (state.status === "result") {
        const { transcript } = state.result;
        const amount = parseAmountFromTranscript(transcript);
        if (amount !== null && amount > 0) {
          const desc = extractDescription(transcript, amount);
          onParsed(amount, desc);
        } else {
          onTranscript(transcript);
        }
        // Reset to idle after a short delay
        setTimeout(() => setVoiceState({ status: "idle" }), 1200);
      }
    });
  }, [onParsed, onTranscript]);

  if (!isVoiceAvailable()) return null;

  const isListening = voiceState.status === "listening";
  const hasError = voiceState.status === "error";

  function handlePress() {
    if (!recorderRef.current) return;
    if (isListening) {
      recorderRef.current.stop();
    } else {
      setVoiceState({ status: "idle" });
      recorderRef.current.start();
    }
  }

  return (
    <button
      type="button"
      onClick={handlePress}
      aria-label={isListening ? "Stop voice input" : "Start voice input"}
      className={`flex h-12 w-12 items-center justify-center rounded-full shadow transition-colors active:scale-95 ${
        isListening
          ? "animate-pulse bg-red-500 text-white"
          : hasError
            ? "bg-red-100 text-red-500"
            : "bg-gray-100 text-gray-500"
      }`}
    >
      {/* Microphone SVG */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
        <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V20H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.08A7 7 0 0 0 19 11z" />
      </svg>
    </button>
  );
}
