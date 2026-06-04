// Web Speech API wrapper for Darija voice entry
// Browser-only — guard all calls with isVoiceAvailable()

export type VoiceResult = {
  transcript: string;
  confidence: number;
};

export type VoiceState =
  | { status: "idle" }
  | { status: "listening" }
  | { status: "result"; result: VoiceResult }
  | { status: "error"; message: string };

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionResultList = {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

// biome-ignore lint/suspicious/noExplicitAny: Web Speech API has no TS typings in lib.dom
type AnySpeechRecognition = any;

export function isVoiceAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );
}

function getSpeechRecognition(): AnySpeechRecognition | null {
  if (!isVoiceAvailable()) return null;
  // biome-ignore lint/suspicious/noExplicitAny: Web Speech API not in TS lib
  const SpeechRec = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
  return new SpeechRec();
}

export function createVoiceRecorder(onStateChange: (state: VoiceState) => void): {
  start: () => void;
  stop: () => void;
} {
  const recognition = getSpeechRecognition();

  if (!recognition) {
    return {
      start: () => onStateChange({ status: "error", message: "Voice not supported" }),
      stop: () => {},
    };
  }

  // Try Moroccan Arabic first; browsers fall back gracefully if unavailable
  recognition.lang = "ar-MA";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onstart = () => onStateChange({ status: "listening" });

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const result = event.results[0]?.[0];
    if (!result) {
      onStateChange({ status: "error", message: "No result" });
      return;
    }
    onStateChange({
      status: "result",
      result: {
        transcript: result.transcript,
        confidence: result.confidence ?? 1,
      },
    });
  };

  recognition.onerror = (event: { error: string }) => {
    const msg =
      event.error === "not-allowed"
        ? "Microphone access denied"
        : event.error === "no-speech"
          ? "No speech detected"
          : "Voice error";
    onStateChange({ status: "error", message: msg });
  };

  recognition.onend = () => {
    // Only go idle if we haven't received a result or error yet
  };

  return {
    start: () => {
      onStateChange({ status: "listening" });
      recognition.start();
    },
    stop: () => {
      recognition.stop();
      onStateChange({ status: "idle" });
    },
  };
}
