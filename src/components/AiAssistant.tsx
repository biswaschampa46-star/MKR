"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { Send, Mic, MicOff, Volume2, VolumeX, X, Sparkles, Bot } from "lucide-react";
import { useUI } from "@/lib/store";

type Msg = { role: "user" | "model"; text: string };

type LogoOption = "image" | "sparkles" | "bot";
const LOGO_OPTIONS: LogoOption[] = ["image", "sparkles", "bot"];
const LOGO_LABEL: Record<LogoOption, string> = { image: "Logo image", sparkles: "Sparkle icon", bot: "Bot icon" };

/* Web Speech API typings (not in all TS libs) */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

const GREETING: Msg = {
  role: "model",
  text: "আপনাকে স্বাগতম! 👋 আমি MKR-এর AI সহকারি। পণ্য, দাম, ডেলিভারি বা অর্ডার সম্পর্কে যেকোনো প্রশ্ন করুন।",
};

export default function AiAssistant() {
  const open = useUI((s) => s.aiOpen);
  const setOpen = useUI((s) => s.setAiOpen);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakOn, setSpeakOn] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [mounted, setMounted] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const speakRef = useRef(false);
  const [logo, setLogo] = useState<LogoOption>("image");

  speakRef.current = speakOn;

  /* Portal target: document.body. The panel is position:fixed, so it must
     never live inside an ancestor with a transform/filter (e.g. the
     .page-enter transition wrapper), which would hijack its containing
     block and push it off-screen. Rendering into <body> guarantees that. */
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const saved = window.localStorage.getItem("mkr-assistant-logo") as LogoOption | null;
    if (saved && LOGO_OPTIONS.includes(saved)) setLogo(saved);
  }, []);

  const cycleLogo = () => {
    setLogo((prev) => {
      const next = LOGO_OPTIONS[(LOGO_OPTIONS.indexOf(prev) + 1) % LOGO_OPTIONS.length];
      window.localStorage.setItem("mkr-assistant-logo", next);
      return next;
    });
  };

  const LogoMark = ({ className }: { className?: string }) =>
    logo === "image" ? (
      <Image src="/images/ai.png" alt="" width={40} height={40} className={`${className} object-contain`} />
    ) : logo === "sparkles" ? (
      <span className={`${className} grid place-items-center rounded-full bg-accent/15 text-accent`}>
        <Sparkles className="h-1/2 w-1/2" strokeWidth={1.5} />
      </span>
    ) : (
      <span className={`${className} grid place-items-center rounded-full bg-soft/20 text-ice`}>
        <Bot className="h-1/2 w-1/2" strokeWidth={1.5} />
      </span>
    );

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    setVoiceSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const speak = (text: string) => {
    if (!speakRef.current || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = /[\u0980-\u09FF]/.test(text) ? "bn-BD" : "en-US";
    u.rate = 1;
    window.speechSynthesis.speak(u);
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", text }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history: next.slice(-10).map((m) => ({ role: m.role, text: m.text })) }),
      });
      const data = (await res.json()) as { ok: boolean; text?: string; message?: string };
      const reply = data.ok && data.text ? data.text : data.message ?? "Something went wrong. Please try again.";
      setMessages((m) => [...m, { role: "model", text: reply }]);
      speak(reply);
    } catch {
      setMessages((m) => [...m, { role: "model", text: "সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।" }]);
    } finally {
      setBusy(false);
    }
  };

  const toggleMic = () => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }
    const recog = new Ctor();
    recog.lang = "bn-BD";
    recog.interimResults = false;
    recog.continuous = false;
    recog.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setSpeakOn(true);
        void send(transcript);
      }
    };
    recog.onend = () => setListening(false);
    recog.onerror = () => setListening(false);
    recogRef.current = recog;
    recog.start();
    setListening(true);
  };

  const toggleSpeak = () => {
    setSpeakOn((v) => {
      if (v && typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
      return !v;
    });
  };

  if (!mounted) return null;

  const panel = (
    <div
      aria-hidden={!open}
      className={`fixed bottom-24 right-6 z-[75] flex w-[min(24rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-line-soft bg-[rgba(7,26,43,0.97)] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all duration-300 ${
        open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
      role="dialog"
      aria-label="AI shop assistant"
    >
      {/* header */}
      <div className="flex items-center gap-3 border-b border-line-soft px-5 py-4">
        <LogoMark className="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold tracking-[0.1em] text-foam">Mkr Assistant</p>
          <p className="text-[0.7rem] text-mist/70">প্রশ্ন করুন, আমি আপনাকে সাহায্য করতে পারি</p>
        </div>
        <button
          type="button"
          onClick={cycleLogo}
          title={`AI logo: ${LOGO_LABEL[logo]} (click to change)`}
          aria-label={`Change AI logo (current: ${LOGO_LABEL[logo]})`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-mist transition-colors hover:bg-white/10 hover:text-ice"
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.5} />
        </button>
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleSpeak}
            aria-label={speakOn ? "Mute voice replies" : "Speak replies aloud"}
            aria-pressed={speakOn}
            className="grid h-8 w-8 place-items-center rounded-full text-mist transition-colors hover:bg-white/10 hover:text-ice"
          >
            {speakOn ? <Volume2 className="h-4 w-4" strokeWidth={1.5} /> : <VolumeX className="h-4 w-4" strokeWidth={1.5} />}
          </button>
        )}
      </div>

      {/* messages */}
      <div ref={listRef} className="flex h-80 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[0.82rem] leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-sm bg-soft/20 text-foam"
                  : "rounded-bl-sm bg-white/[0.06] text-mist"
              }`}
            >
              {m.text}
            </p>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <p className="rounded-2xl rounded-bl-sm bg-white/[0.06] px-4 py-2.5 text-[0.82rem] text-mist/60">
              লিখছি…
            </p>
          </div>
        )}
      </div>

      {/* input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2 border-t border-line-soft px-3 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="আপনার প্রশ্ন লিখুন…"
          aria-label="Message the AI assistant"
          className="min-w-0 flex-1 rounded-full border border-line bg-transparent px-4 py-2.5 text-[0.82rem] text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none"
        />
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleMic}
            aria-label={listening ? "Stop listening" : "Speak your question"}
            aria-pressed={listening}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors ${
              listening ? "border-accent bg-accent/20 text-accent" : "border-line text-mist hover:text-ice"
            }`}
          >
            {listening ? <MicOff className="h-4 w-4" strokeWidth={1.5} /> : <Mic className="h-4 w-4" strokeWidth={1.5} />}
          </button>
        )}
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-soft/20 text-ice transition-colors hover:bg-soft/30 disabled:opacity-40"
        >
          <Send className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </form>
    </div>
  );

  return mounted ? createPortal(panel, document.body) : null;
}
