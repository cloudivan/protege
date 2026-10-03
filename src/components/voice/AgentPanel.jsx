// The voice agent side panel, shared by all three modules. Two backends:
//   real: live ElevenLabs session (ConversationProvider + useConversation)
//   mock: text chat against the same prompt via /api/agent/mock-turn
// Both expose the same imperative API through `controlRef`:
//   controlRef.current.sendContext(text)   push a screen event / "PAUSE"
//   controlRef.current.end()
//
// `getAt()` returns ms since session start (the screen-moment clock).
// `beforeStart` (optional) runs first on Start, e.g. to open the screen share
// picker inside the same click. Resolve false to cancel the start.
//
// SDK note: @elevenlabs/react is newer than most training data. Verify method
// names against node_modules/@elevenlabs/react/dist/*.d.ts before relying on
// them (e.g. sendContextualUpdate).

import { useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { MonitorUp, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { api, noEmDash } from "@/lib/utils";
import VoiceHud from "@/components/voice/VoiceHud";

const VOICE_MODE = process.env.NEXT_PUBLIC_VOICE_MODE === "real" ? "real" : "mock";

function logTurn(sessionId, role, text, at) {
  const question = role === "agent" && text.trim().endsWith("?") ? { kind: "other" } : undefined; // TODO(capture): classify why/guardrail
  api(`/api/sessions/${sessionId}/transcript`, { method: "POST", body: { role, text, at, question } }).catch(() => {});
}

function Transcript({ turns }) {
  const ref = useRef(null);
  // Braces matter: current Chrome's scrollTo() returns a Promise, and an
  // effect that returns one crashes React on cleanup ("i is not a function").
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [turns]);
  if (!turns.length) return null;
  return (
    <div ref={ref} className="mt-4 max-h-80 space-y-2 overflow-y-auto border border-border bg-background p-3 text-sm scrollbar-subtle">
      {turns.map((m, i) => (
        <div key={i} className={m.role === "user" ? "text-right" : m.role === "context" ? "text-xs text-muted-foreground" : ""}>
          {m.role !== "context" && (
            <span className="mr-2 text-xs uppercase tracking-wide text-muted-foreground">{m.role === "user" ? "You" : "Protégé"}</span>
          )}
          <span>{noEmDash(m.text)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- real voice
function RealPanel({ sessionId, getAt, clientTools, controlRef, onUserTurn, beforeStart, onEnd, showTranscript = false }) {
  const [micMuted, setMicMuted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [needsShare, setNeedsShare] = useState(false);
  const [turns, setTurns] = useState([]);
  const cpsRef = useRef(15); // her speech rate in characters per second
  const conversation = useConversation({
    micMuted,
    onMessage: ({ message, role }) => {
      const r = role === "user" ? "user" : "agent";
      setTurns((t) => [...t, { role: r, text: message }]);
      logTurn(sessionId, r, message, getAt());
      if (r === "user") onUserTurn?.(message);
    },
    // Timing of the characters in each audio chunk: gives her real speech rate.
    onAudioAlignment: ({ chars, char_start_times_ms: starts, char_durations_ms: durs } = {}) => {
      const n = chars?.length;
      const ms = n ? starts[n - 1] + (durs?.[n - 1] || 0) : 0;
      if (ms > 300) cpsRef.current = cpsRef.current * 0.6 + ((n / ms) * 1000) * 0.4;
    },
    onError: (m) => toast.error(m || "Voice session error"),
  });
  const connected = conversation.status === "connected";
  const lastAgentLine = [...turns].reverse().find((t) => t.role === "agent")?.text || "";

  // Her voice is detected from the actual output level: the SDK's isSpeaking
  // flag lags behind the audio. Bars and subtitles both read this.
  const voice = useRef({ her: false, since: 0, lastHeard: 0 });
  const readVoice = () => {
    const v = voice.current;
    const now = performance.now();
    if (conversation.status !== "connected") {
      v.her = false;
      return v;
    }
    if (conversation.getOutputVolume() > 0.01) {
      if (!v.her) v.since = now;
      v.her = true;
      v.lastHeard = now;
    } else if (now - v.lastHeard > 250) {
      v.her = false; // short gaps between words still count as talking
    }
    return v;
  };

  // Live audio levels for the voice bars. Refs, so the animation loops always
  // see the current conversation without restarting.
  const sampleRef = useRef(null);
  sampleRef.current = () => {
    if (conversation.status !== "connected") return { mode: "idle" };
    if (readVoice().her) return { mode: "speaking", freq: conversation.getOutputByteFrequencyData() };
    return { mode: "listening", freq: micMuted ? null : conversation.getInputByteFrequencyData() };
  };
  const audioRef = useRef(null);
  audioRef.current = () => {
    const v = readVoice();
    return { audible: v.her, since: v.since, cps: cpsRef.current };
  };

  useEffect(() => {
    controlRef.current = {
      sendContext: (text) => connected && conversation.sendContextualUpdate?.(text),
      end: () => conversation.endSession(),
    };
  }, [connected, conversation, controlRef]);

  const end = () => {
    conversation.endSession();
    onEnd?.();
  };

  // Runs inside the click so the screen share picker gets the user gesture.
  const start = () => {
    setNeedsShare(false);
    const ready = beforeStart ? beforeStart() : true;
    connect(ready);
  };

  const connect = async (ready) => {
    setStarting(true);
    try {
      if (!(await ready)) {
        // No screen picked: ask again instead of failing.
        setNeedsShare(true);
        return;
      }
      const pre = await navigator.mediaDevices.getUserMedia({ audio: true });
      pre.getTracks().forEach((t) => t.stop());
      const data = await api("/api/agent/session", { method: "POST", body: { sessionId } });
      conversation.startSession({
        signedUrl: data.signedUrl,
        connectionType: "websocket",
        dynamicVariables: data.dynamicVariables,
        clientTools,
        onConnect: ({ conversationId }) =>
          api(`/api/sessions/${sessionId}`, { method: "PATCH", body: { status: "live", elevenConversationId: conversationId } }),
        onDisconnect: () => api(`/api/sessions/${sessionId}`, { method: "PATCH", body: { status: "done" } }),
      });
    } catch (err) {
      toast.error(err.message || "Microphone unavailable");
    } finally {
      setStarting(false);
    }
  };

  const live = connected || starting || conversation.status === "connecting";

  return (
    <>
      {live ? (
        <>
          <VoiceHud
            sampleRef={sampleRef}
            audioRef={audioRef}
            status={conversation.status}
            caption={lastAgentLine}
            micMuted={micMuted}
            onToggleMute={() => setMicMuted((m) => !m)}
            onEnd={end}
          />
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-primary animate-pulse" : "bg-muted-foreground/50"}`} />
            {connected ? "On a call. She is in the top right corner." : "Connecting…"}
          </p>
        </>
      ) : (
        <>
          {showTranscript && <Transcript turns={turns} />}
          {needsShare ? (
            <div className="mt-4 flex flex-col items-center gap-3 py-2 text-center">
              <p className="text-sm text-muted-foreground">Which screen should she watch? Pick the tab or window you will work in.</p>
              <button type="button" onClick={start} className="btn btn-primary">
                <MonitorUp className="mr-2 h-4 w-4" /> Choose screen
              </button>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2">
              <button type="button" onClick={start} className="btn btn-primary">
                <Phone className="mr-2 h-4 w-4" /> Start
              </button>
              <span className="ml-auto text-xs text-muted-foreground">Not connected</span>
            </div>
          )}
        </>
      )}
      {/* Surface SDK connection errors instead of failing silently. */}
      {conversation.status === "error" && (
        <p className="mt-2 text-xs text-error-600">Voice error: {conversation.message || "could not connect"}</p>
      )}
    </>
  );
}

// ---------------------------------------------------------------- mock voice
function MockPanel({ sessionId, getAt, controlRef, onUserTurn, clientTools = {}, beforeStart }) {
  const [cfg, setCfg] = useState(null);
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState("");
  const history = useRef([]);
  const context = useRef([]);
  const busy = useRef(false);

  const agentTurn = async () => {
    if (!cfg || busy.current) return;
    busy.current = true;
    try {
      const { text, toolCalls = [] } = await api("/api/agent/mock-turn", {
        method: "POST",
        body: { role: cfg.role, dynamicVariables: cfg.dynamicVariables, history: history.current },
      });
      // Same client tools the real ElevenLabs session would call.
      for (const { name, input } of toolCalls) {
        setTurns((t) => [...t, { role: "context", text: `[tool] ${name}` }]);
        await Promise.resolve(clientTools[name]?.(input || {})).catch((e) => console.warn(`tool ${name} failed`, e));
      }
      if (text) {
        history.current.push({ role: "assistant", text });
        setTurns((t) => [...t, { role: "agent", text }]);
        logTurn(sessionId, "agent", text, getAt());
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      busy.current = false;
    }
  };

  useEffect(() => {
    controlRef.current = {
      sendContext: (text) => {
        setTurns((t) => [...t, { role: "context", text: `[screen] ${text}` }]);
        context.current.push(text);
        // Like the real agent: only speak on PAUSE, a tutor ALERT or LESSON DONE.
        if (text === "PAUSE" || text === "LESSON DONE" || text.startsWith("ALERT")) {
          history.current.push({ role: "user", text: `[screen events]\n${context.current.join("\n")}` });
          context.current = [];
          agentTurn();
        }
      },
      end: () => api(`/api/sessions/${sessionId}`, { method: "PATCH", body: { status: "done" } }),
    };
  });

  const start = async () => {
    if (beforeStart && !(await beforeStart())) return;
    const data = await api("/api/agent/session", { method: "POST", body: { sessionId } });
    setCfg(data);
    api(`/api/sessions/${sessionId}`, { method: "PATCH", body: { status: "live" } });
  };

  const send = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    history.current.push({ role: "user", text: draft });
    setTurns((t) => [...t, { role: "user", text: draft }]);
    logTurn(sessionId, "user", draft, getAt());
    onUserTurn?.(draft);
    setDraft("");
    agentTurn();
  };

  if (!cfg) {
    return (
      <button type="button" onClick={() => start().catch((e) => toast.error(e.message))} className="btn btn-primary mt-4">
        <Phone className="mr-2 h-4 w-4" /> Start (mock voice)
      </button>
    );
  }
  return (
    <>
      <Transcript turns={turns} />
      <form onSubmit={send} className="mt-4 flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type what you would say…" className="flex-1 border border-input bg-background px-3 py-2 text-sm" />
        <button type="submit" className="btn btn-primary"><Send className="h-4 w-4" /></button>
      </form>
    </>
  );
}

export default function AgentPanel({ title, subtitle, ...props }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      {VOICE_MODE === "real" ? (
        <ConversationProvider>
          <RealPanel {...props} />
        </ConversationProvider>
      ) : (
        <MockPanel {...props} />
      )}
    </section>
  );
}
