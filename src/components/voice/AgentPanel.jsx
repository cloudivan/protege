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
import { Mic, MicOff, MonitorUp, Phone, PhoneOff, Send } from "lucide-react";
import { toast } from "sonner";
import { api, noEmDash } from "@/lib/utils";
import VoiceBars from "@/components/voice/VoiceBars";
import { createAgentAudioTap } from "@/lib/agentAudioTap";
import { TOOLS } from "@/config/prompts";

const VOICE_MODE = process.env.NEXT_PUBLIC_VOICE_MODE === "real" ? "real" : "mock";

// Every client tool either agent may call. ElevenLabs ends the whole call when
// the agent calls a tool the page did not provide, so missing ones get a stub
// that answers instead (e.g. capture mode has no debrief tools).
const ALL_TOOL_NAMES = [...TOOLS.interviewer, ...TOOLS.tutor].map((t) => t.name);
function withToolStubs(clientTools = {}) {
  const tools = { ...clientTools };
  for (const name of ALL_TOOL_NAMES) {
    if (!tools[name]) tools[name] = async () => `${name} is not available on this page; carry on without it`;
  }
  return tools;
}

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
          <span>{noEmDash(m.text).replace(/\[[^\]]*\]\s*/g, "")}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- real voice
// How long her reply keeps the bars "speaking" when no audio level can be
// read: an estimate from the text length (about 15 characters per second).
const SPEECH_CPS = 15;

function RealPanel({ sessionId, getAt, clientTools, controlRef, onUserTurn, beforeStart, onEnd }) {
  const [micMuted, setMicMuted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [needsShare, setNeedsShare] = useState(false);
  const [turns, setTurns] = useState([]);
  // Until when her latest line is expected to be playing (performance.now ms).
  const herUntil = useRef(0);
  const conversation = useConversation({
    micMuted,
    onMessage: ({ message, role }) => {
      const r = role === "user" ? "user" : "agent";
      setTurns((t) => [...t, { role: r, text: message }]);
      logTurn(sessionId, r, message, getAt());
      if (r === "user") onUserTurn?.(message);
      if (r === "agent") herUntil.current = performance.now() + Math.max(1500, (message.length / SPEECH_CPS) * 1000);
    },
    onError: (m) => toast.error(m || "Voice session error"),
  });
  const connected = conversation.status === "connected";

  // Our own measurement of her audio element, next to the SDK's analyser.
  const tap = useRef(null);
  useEffect(() => {
    if (!connected) return;
    tap.current = createAgentAudioTap();
    return () => {
      tap.current?.close();
      tap.current = null;
    };
  }, [connected]);

  // Is she talking? Any one of these signals is enough: her audio level from
  // the SDK, her audio level from our tap, the SDK's speaking flag, or a reply
  // that just arrived and is still being read out.
  const sampleRef = useRef(null);
  sampleRef.current = () => {
    if (conversation.status !== "connected") return { mode: "idle" };
    let sdk = 0;
    try {
      sdk = conversation.getOutputVolume() || 0;
    } catch {}
    const own = tap.current?.volume() || 0;
    const her = sdk > 0.002 || own > 0.002 || conversation.isSpeaking || performance.now() < herUntil.current;
    if (her) {
      // Frequency data from whichever source hears her. None means the bars
      // run their own speaking animation.
      let freq = null;
      if (sdk > 0.002) freq = conversation.getOutputByteFrequencyData();
      else if (own > 0.002) freq = tap.current.frequency();
      return { mode: "speaking", freq };
    }
    return { mode: "listening", freq: micMuted ? null : conversation.getInputByteFrequencyData() };
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
        clientTools: withToolStubs(clientTools),
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
      {live && <VoiceBars sampleRef={sampleRef} className="mx-auto mt-4 h-14 w-24" />}
      <Transcript turns={turns} />
      {needsShare && !live ? (
        <div className="mt-4 flex flex-col items-center gap-3 py-2 text-center">
          <p className="text-sm text-muted-foreground">Which screen should she watch? Pick the tab or window you will work in.</p>
          <button type="button" onClick={start} className="btn btn-primary">
            <MonitorUp className="mr-2 h-4 w-4" /> Choose screen
          </button>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2">
          {connected ? (
            <>
              <button type="button" onClick={() => setMicMuted((m) => !m)} className={`btn ${micMuted ? "btn-secondary" : "btn-primary"}`}>
                {micMuted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                {micMuted ? "Unmute" : "Mute"}
              </button>
              <button type="button" onClick={end} className="btn btn-secondary">
                <PhoneOff className="mr-2 h-4 w-4" /> End
              </button>
            </>
          ) : (
            <button type="button" onClick={start} disabled={live} className="btn btn-primary disabled:opacity-50">
              <Phone className="mr-2 h-4 w-4" /> {live ? "Connecting…" : "Start"}
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {connected ? (conversation.isSpeaking ? "Speaking" : "Listening") : live ? "Connecting…" : "Not connected"}
          </span>
        </div>
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
        // Like the real agents: the interviewer only speaks on "PAUSE. ASK:"
        // (the planner's question), the tutor on PAUSE, ALERT or LESSON DONE.
        const speak =
          text.startsWith("PAUSE. ASK") ||
          (text === "PAUSE" && cfg?.role === "tutor") ||
          text === "LESSON DONE" ||
          text.startsWith("ALERT");
        if (speak) {
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

  // Like the real agents' first message: the tutor greets and the debrief
  // interviewer opens. Capture stays silent (no opening_line) until PAUSE.
  const opened = useRef(false);
  useEffect(() => {
    if (!cfg || opened.current) return;
    opened.current = true;
    if (cfg.role === "tutor" || cfg.dynamicVariables?.opening_line) agentTurn();
  }, [cfg]); // eslint-disable-line react-hooks/exhaustive-deps

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
