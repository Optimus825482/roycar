"use client";

import { useRef, useState, useCallback, useEffect } from "react";

// ─── Types ───

type VoiceState = "idle" | "listening" | "processing" | "speaking";

interface UseVoiceChatOptions {
  onTranscript: (text: string) => void;
  lang?: string;
  silenceThresholdMs?: number;
  minSpeechMs?: number;
  speechRate?: number;
}

interface UseVoiceChatReturn {
  voiceState: VoiceState;
  isVoiceMode: boolean;
  transcript: string;
  startVoiceMode: () => void;
  stopVoiceMode: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isBrowserSupported: boolean;
  setSpeechRate: (rate: number) => void;
  /** true when the browser denied microphone access */
  micPermissionDenied: boolean;
  /** reset micPermissionDenied back to false */
  clearMicError: () => void;
}

// ─── Clean text for TTS ───

function cleanTextForSpeech(text: string): string {
  let c = text;
  c = c.replace(/\|.+\|/g, "");
  c = c.replace(/\|?[\s:]*-+[\s:]*\|?/g, "");
  c = c.replace(/#{1,6}\s*/g, "");
  c = c.replace(/\*\*(.+?)\*\*/g, "$1");
  c = c.replace(/\*(.+?)\*/g, "$1");
  c = c.replace(/`{1,3}[^`]*`{1,3}/g, "");
  c = c.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  c = c.replace(/^[-*+]\s+/gm, "");
  c = c.replace(/^\d+\.\s+/gm, "");
  c = c.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu,
    "",
  );
  c = c.replace(/[•·▪▸►▶◆◇○●□■★☆✓✗✔✘→←↑↓↔⇒⇐]/g, "");
  c = c.replace(/\[SQL_QUERY\][\s\S]*?\[\/SQL_QUERY\]/g, "");
  c = c.replace(/\[SQL_RESULTS\][\s\S]*?\[\/SQL_RESULTS\]/g, "");
  c = c.replace(/\n{2,}/g, ". ");
  c = c.replace(/\n/g, " ");
  c = c.replace(/\s{2,}/g, " ");
  return c.trim();
}

// ─── Select best Turkish voice ───

function selectTurkishVoice(): SpeechSynthesisVoice | null {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    const turkishVoices = voices.filter((v) => v.lang.startsWith("tr"));
    if (turkishVoices.length === 0) return null;

    const priorities: ((v: SpeechSynthesisVoice) => boolean)[] = [
      (v) => /emel/i.test(v.name) && /microsoft/i.test(v.name),
      (v) => /microsoft/i.test(v.name) && v.localService,
      (v) => v.localService,
      () => true,
    ];

    for (const test of priorities) {
      const match = turkishVoices.find(test);
      if (match) return match;
    }
    return turkishVoices[0];
  } catch {
    return null;
  }
}

// ─── Split text into speakable chunks at natural boundaries ───

function splitTextIntoChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitAt = -1;
    const range = remaining.slice(0, maxLen);

    // Priority 1: Split at sentence-ending punctuation (. ! ?)
    for (let i = range.length - 1; i >= maxLen * 0.3; i--) {
      if (".!?".includes(range[i])) {
        splitAt = i + 1;
        break;
      }
    }
    // Priority 2: Split at semicolon or colon
    if (splitAt === -1) {
      for (let i = range.length - 1; i >= maxLen * 0.3; i--) {
        if (";:".includes(range[i])) {
          splitAt = i + 1;
          break;
        }
      }
    }
    // Priority 3: Split at comma
    if (splitAt === -1) {
      for (let i = range.length - 1; i >= maxLen * 0.4; i--) {
        if (range[i] === ",") {
          splitAt = i + 1;
          break;
        }
      }
    }
    // Priority 4: Split at space
    if (splitAt === -1) {
      splitAt = range.lastIndexOf(" ");
      if (splitAt === -1) splitAt = maxLen;
    }
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  return chunks.filter(Boolean);
}

// ─── Calculate natural pause duration between chunks ───

function getChunkPauseDuration(chunk: string): number {
  const trimmed = chunk.trim();
  if (!trimmed) return 80;
  const lastChar = trimmed[trimmed.length - 1];
  // Longer pause after sentence-ending punctuation
  if (".!?".includes(lastChar)) return 220;
  // Medium pause after semicolons/colons
  if (";:".includes(lastChar)) return 160;
  // Short pause after commas
  if (lastChar === ",") return 120;
  // Default short pause
  return 80;
}

// ─── Calculate natural speech rate variation per chunk ───

function getChunkSpeechRate(baseRate: number, chunk: string): number {
  const len = chunk.trim().length;
  // Slightly slower for longer chunks (more content to process)
  if (len > 120) return Math.max(0.7, baseRate - 0.05);
  // Slightly faster for very short chunks (feels more natural)
  if (len < 30) return Math.min(1.5, baseRate + 0.03);
  return baseRate;
}

// ─── Calculate natural pitch variation ───

function getChunkPitch(chunk: string): number {
  const trimmed = chunk.trim();
  if (!trimmed) return 1.05;
  const lastChar = trimmed[trimmed.length - 1];
  // Slight pitch rise for questions
  if (lastChar === "?") return 1.12;
  // Slight pitch drop for statements ending with period
  if (lastChar === ".") return 1.0;
  // Emphasis for exclamations
  if (lastChar === "!") return 1.08;
  return 1.05;
}

// ─── Safe speechSynthesis access ───

function safeSpeechSynthesis(): SpeechSynthesis | null {
  try {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      return window.speechSynthesis;
    }
  } catch {
    /* SSR or restricted context */
  }
  return null;
}

// ─── Main Hook ───

export function useVoiceChat({
  onTranscript,
  lang = "tr-TR",
  silenceThresholdMs = 1800,
  minSpeechMs = 500,
  speechRate: initialSpeechRate = 1.0,
}: UseVoiceChatOptions): UseVoiceChatReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isBrowserSupported, setIsBrowserSupported] = useState(false);
  const [speechRate, setSpeechRateState] = useState(initialSpeechRate);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  // All refs — no speech API touched until user clicks voice button
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechStartTimeRef = useRef<number>(0);
  const voiceModeRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isUnmountedRef = useRef(false);
  const processedResultIndexRef = useRef(0);
  const accumulatedFinalRef = useRef("");
  const currentInterimRef = useRef("");
  const lastSentTextRef = useRef("");
  const isSendingRef = useRef(false);
  const ttsKeepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechRateRef = useRef(initialSpeechRate);
  // Store onTranscript in ref to avoid stale closures
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  // Keep speechRate ref in sync
  useEffect(() => {
    speechRateRef.current = speechRate;
  }, [speechRate]);

  // Update from prop changes
  useEffect(() => {
    setSpeechRateState(initialSpeechRate);
    speechRateRef.current = initialSpeechRate;
  }, [initialSpeechRate]);

  const setSpeechRate = useCallback((rate: number) => {
    const clamped = Math.max(0.5, Math.min(2.0, rate));
    setSpeechRateState(clamped);
    speechRateRef.current = clamped;
  }, []);

  // SSR-safe browser detection — only checks, no API calls
  useEffect(() => {
    try {
      const ok =
        typeof window !== "undefined" &&
        ("SpeechRecognition" in window ||
          "webkitSpeechRecognition" in window) &&
        "speechSynthesis" in window;
      setIsBrowserSupported(ok);
    } catch {
      setIsBrowserSupported(false);
    }
  }, []);

  // Preload voices — only when browser is supported, wrapped in try-catch
  useEffect(() => {
    if (!isBrowserSupported) return;
    const synth = safeSpeechSynthesis();
    if (!synth) return;
    try {
      synth.getVoices();
      const onVoicesChanged = () => {
        try {
          synth.getVoices();
        } catch {
          /* */
        }
      };
      synth.addEventListener("voiceschanged", onVoicesChanged);
      return () => {
        try {
          synth.removeEventListener("voiceschanged", onVoicesChanged);
        } catch {
          /* */
        }
      };
    } catch {
      /* */
    }
  }, [isBrowserSupported]);

  // ─── Helpers ───

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearTtsKeepAlive = useCallback(() => {
    if (ttsKeepAliveRef.current) {
      clearInterval(ttsKeepAliveRef.current);
      ttsKeepAliveRef.current = null;
    }
  }, []);

  // ─── Kill recognition safely ───
  const killRecognition = useCallback(() => {
    clearSilenceTimer();
    const rec = recognitionRef.current;
    if (rec) {
      // Null handlers FIRST to prevent restart cascade
      rec.onend = null;
      rec.onerror = null;
      rec.onresult = null;
      rec.onstart = null;
      rec.onspeechstart = null;
      rec.onspeechend = null;
      try {
        rec.abort();
      } catch {
        /* */
      }
      recognitionRef.current = null;
    }
  }, [clearSilenceTimer]);

  // ─── Start recognition ───
  const startRecognition = useCallback(() => {
    if (!isBrowserSupported || !voiceModeRef.current || isUnmountedRef.current)
      return;
    if (isSpeakingRef.current) return;

    // Kill existing first
    killRecognition();

    // Reset state
    accumulatedFinalRef.current = "";
    currentInterimRef.current = "";
    processedResultIndexRef.current = 0;
    isSendingRef.current = false;
    speechStartTimeRef.current = 0;

    try {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) return;

      const recognition = new SpeechRecognitionAPI();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (!isUnmountedRef.current) setVoiceState("listening");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (isUnmountedRef.current) return;
        let newFinal = "";
        let interim = "";

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            if (i >= processedResultIndexRef.current) {
              newFinal += result[0].transcript + " ";
              processedResultIndexRef.current = i + 1;
            }
          } else {
            interim = result[0].transcript;
          }
        }

        if (newFinal) {
          accumulatedFinalRef.current = (
            accumulatedFinalRef.current +
            " " +
            newFinal
          ).trim();
          speechStartTimeRef.current = speechStartTimeRef.current || Date.now();
        }
        currentInterimRef.current = interim;
        if (interim)
          speechStartTimeRef.current = speechStartTimeRef.current || Date.now();

        const display = (
          accumulatedFinalRef.current +
          " " +
          currentInterimRef.current
        ).trim();
        setTranscript(display);

        // Inline silence timer
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          if (isUnmountedRef.current) return;
          const totalText = (
            accumulatedFinalRef.current +
            " " +
            currentInterimRef.current
          ).trim();
          const dur = Date.now() - speechStartTimeRef.current;

          if (
            totalText &&
            dur >= minSpeechMs &&
            !isSendingRef.current &&
            totalText !== lastSentTextRef.current
          ) {
            isSendingRef.current = true;
            lastSentTextRef.current = totalText;
            setTranscript(totalText);
            if (!isUnmountedRef.current) setVoiceState("processing");

            // Kill recognition before sending
            killRecognition();

            // Use ref to avoid stale closure
            onTranscriptRef.current(totalText);

            accumulatedFinalRef.current = "";
            currentInterimRef.current = "";
            processedResultIndexRef.current = 0;
            setTranscript("");
          }
        }, silenceThresholdMs);
      };

      recognition.onspeechstart = () => {
        speechStartTimeRef.current = Date.now();
        clearSilenceTimer();
      };

      recognition.onspeechend = () => {
        // Re-arm silence timer
        if (!isUnmountedRef.current && voiceModeRef.current) {
          clearSilenceTimer();
          silenceTimerRef.current = setTimeout(() => {
            if (isUnmountedRef.current) return;
            const totalText = (
              accumulatedFinalRef.current +
              " " +
              currentInterimRef.current
            ).trim();
            const dur = Date.now() - speechStartTimeRef.current;
            if (
              totalText &&
              dur >= minSpeechMs &&
              !isSendingRef.current &&
              totalText !== lastSentTextRef.current
            ) {
              isSendingRef.current = true;
              lastSentTextRef.current = totalText;
              setTranscript(totalText);
              if (!isUnmountedRef.current) setVoiceState("processing");
              killRecognition();
              onTranscriptRef.current(totalText);
              accumulatedFinalRef.current = "";
              currentInterimRef.current = "";
              processedResultIndexRef.current = 0;
              setTranscript("");
            }
          }, silenceThresholdMs);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (isUnmountedRef.current || !voiceModeRef.current) return;
        if (event.error === "no-speech" || event.error === "aborted") {
          // Normal — schedule restart only if still active
          setTimeout(() => {
            if (
              voiceModeRef.current &&
              !isUnmountedRef.current &&
              !isSpeakingRef.current
            ) {
              startRecognition();
            }
          }, 300);
          return;
        }
        // Microphone permission denied by the user or the OS
        if (
          event.error === "not-allowed" ||
          event.error === "service-not-allowed"
        ) {
          setMicPermissionDenied(true);
          voiceModeRef.current = false;
          setIsVoiceMode(false);
          setVoiceState("idle");
          killRecognition();
          return;
        }
        // Microphone hardware not found
        if (event.error === "audio-capture") {
          setMicPermissionDenied(true);
          voiceModeRef.current = false;
          setIsVoiceMode(false);
          setVoiceState("idle");
          killRecognition();
          return;
        }
        console.error("[VoiceChat] Recognition error:", event.error);
      };

      recognition.onend = () => {
        if (isUnmountedRef.current || !voiceModeRef.current) return;
        // Auto-restart only if still in voice mode
        if (!isSpeakingRef.current) {
          setTimeout(() => {
            if (
              voiceModeRef.current &&
              !isUnmountedRef.current &&
              !isSpeakingRef.current
            ) {
              startRecognition();
            }
          }, 200);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("[VoiceChat] Failed to start:", err);
      // Single retry
      setTimeout(() => {
        if (
          voiceModeRef.current &&
          !isUnmountedRef.current &&
          !isSpeakingRef.current
        ) {
          startRecognition();
        }
      }, 500);
    }
  }, [
    isBrowserSupported,
    lang,
    silenceThresholdMs,
    minSpeechMs,
    clearSilenceTimer,
    killRecognition,
  ]);

  // ─── TTS: Speak text ───
  const speak = useCallback(
    (text: string) => {
      if (!isBrowserSupported || !text.trim() || isUnmountedRef.current) return;
      const synth = safeSpeechSynthesis();
      if (!synth) return;

      // Stop recognition while speaking
      killRecognition();
      isSpeakingRef.current = true;
      if (!isUnmountedRef.current) setVoiceState("speaking");

      try {
        synth.cancel();
      } catch {
        /* */
      }
      clearTtsKeepAlive();

      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) {
        isSpeakingRef.current = false;
        isSendingRef.current = false;
        if (voiceModeRef.current && !isUnmountedRef.current) {
          setVoiceState("listening");
          startRecognition();
        } else if (!isUnmountedRef.current) {
          setVoiceState("idle");
        }
        return;
      }

      const chunks = splitTextIntoChunks(cleaned, 160);
      let chunkIndex = 0;

      const finishSpeaking = () => {
        clearTtsKeepAlive();
        isSpeakingRef.current = false;
        isSendingRef.current = false;
        if (voiceModeRef.current && !isUnmountedRef.current) {
          setVoiceState("listening");
          // Start listening IMMEDIATELY — no delay
          if (!isSpeakingRef.current) {
            startRecognition();
          }
        } else if (!isUnmountedRef.current) {
          setVoiceState("idle");
        }
      };

      const speakNextChunk = () => {
        if (
          isUnmountedRef.current ||
          chunkIndex >= chunks.length ||
          !isSpeakingRef.current
        ) {
          finishSpeaking();
          return;
        }

        try {
          const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
          utterance.lang = lang;
          utterance.rate = getChunkSpeechRate(
            speechRateRef.current,
            chunks[chunkIndex],
          );
          utterance.pitch = getChunkPitch(chunks[chunkIndex]);
          utterance.volume = 1.0;

          const voice = selectTurkishVoice();
          if (voice) utterance.voice = voice;

          utterance.onend = () => {
            chunkIndex++;
            if (
              chunkIndex < chunks.length &&
              isSpeakingRef.current &&
              !isUnmountedRef.current
            ) {
              // Natural pause between chunks based on punctuation
              const pauseMs = getChunkPauseDuration(chunks[chunkIndex - 1]);
              setTimeout(speakNextChunk, pauseMs);
            } else {
              finishSpeaking();
            }
          };

          utterance.onerror = (e) => {
            if (e.error !== "interrupted" && e.error !== "canceled") {
              console.error("[VoiceChat] TTS error:", e.error);
            }
            finishSpeaking();
          };

          synth.speak(utterance);
        } catch (err) {
          console.error("[VoiceChat] TTS speak error:", err);
          finishSpeaking();
        }
      };

      // Delay after cancel() — Chrome needs this
      setTimeout(() => {
        if (!isSpeakingRef.current || isUnmountedRef.current) return;

        // Chrome keepalive: pause/resume every 10s
        ttsKeepAliveRef.current = setInterval(() => {
          try {
            const s = safeSpeechSynthesis();
            if (s?.speaking) {
              s.pause();
              s.resume();
            }
          } catch {
            /* */
          }
        }, 10000);

        speakNextChunk();
      }, 100);
    },
    [
      isBrowserSupported,
      lang,
      killRecognition,
      startRecognition,
      clearTtsKeepAlive,
    ],
  );

  // ─── Stop speaking ───
  const stopSpeaking = useCallback(() => {
    clearTtsKeepAlive();
    try {
      safeSpeechSynthesis()?.cancel();
    } catch {
      /* */
    }
    isSpeakingRef.current = false;
    isSendingRef.current = false;

    if (voiceModeRef.current && !isUnmountedRef.current) {
      setVoiceState("listening");
      // Start listening IMMEDIATELY
      startRecognition();
    } else if (!isUnmountedRef.current) {
      setVoiceState("idle");
    }
  }, [startRecognition, clearTtsKeepAlive]);

  // ─── Start voice mode ───
  const startVoiceMode = useCallback(async () => {
    if (!isBrowserSupported) return;

    // Proactively request mic permission so the browser shows the native
    // permission prompt and we can catch explicit denials BEFORE STT starts.
    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices?.getUserMedia
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        // We only needed the permission grant — immediately release the track.
        stream.getTracks().forEach((t) => t.stop());
        // Clear any stale denial flag from a previous session.
        setMicPermissionDenied(false);
      } catch (err) {
        const name = (err as Error).name;
        // NotAllowedError / PermissionDeniedError = user clicked "Block"
        // NotFoundError / DevicesNotFoundError   = no microphone hardware
        // OverconstrainedError                   = constraints can't be met
        if (
          name === "NotAllowedError" ||
          name === "PermissionDeniedError" ||
          name === "NotFoundError" ||
          name === "DevicesNotFoundError" ||
          name === "OverconstrainedError"
        ) {
          setMicPermissionDenied(true);
          return; // Abort — no point starting STT
        }
        // For any other error (e.g. AbortError, NotReadableError) fall through
        // and let SpeechRecognition handle it.
      }
    }

    voiceModeRef.current = true;
    setIsVoiceMode(true);
    lastSentTextRef.current = "";
    isSendingRef.current = false;
    isSpeakingRef.current = false;
    startRecognition();
  }, [isBrowserSupported, startRecognition]);

  // ─── Stop voice mode ───
  const stopVoiceMode = useCallback(() => {
    voiceModeRef.current = false;
    setIsVoiceMode(false);
    killRecognition();
    clearTtsKeepAlive();
    try {
      safeSpeechSynthesis()?.cancel();
    } catch {
      /* */
    }
    isSpeakingRef.current = false;
    isSendingRef.current = false;
    setVoiceState("idle");
    setTranscript("");
    accumulatedFinalRef.current = "";
    currentInterimRef.current = "";
    processedResultIndexRef.current = 0;
    lastSentTextRef.current = "";
  }, [killRecognition, clearTtsKeepAlive]);

  // ─── Cleanup on unmount ───
  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      voiceModeRef.current = false;
      // Kill recognition with handlers nulled first
      const rec = recognitionRef.current;
      if (rec) {
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        rec.onstart = null;
        rec.onspeechstart = null;
        rec.onspeechend = null;
        try {
          rec.abort();
        } catch {
          /* */
        }
        recognitionRef.current = null;
      }
      // Clear timers
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (ttsKeepAliveRef.current) {
        clearInterval(ttsKeepAliveRef.current);
        ttsKeepAliveRef.current = null;
      }
      // Cancel speech
      try {
        safeSpeechSynthesis()?.cancel();
      } catch {
        /* */
      }
    };
  }, []);

  const clearMicError = useCallback(() => {
    setMicPermissionDenied(false);
  }, []);

  return {
    voiceState,
    isVoiceMode,
    transcript,
    startVoiceMode,
    stopVoiceMode,
    speak,
    stopSpeaking,
    isBrowserSupported,
    setSpeechRate,
    micPermissionDenied,
    clearMicError,
  };
}
