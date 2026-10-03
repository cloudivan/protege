// The voice agent side panel, shared by all three modules. Two backends:
//   real: live ElevenLabs session (ConversationProvider + useConversation)
//   mock: text chat against the same prompt via /api/agent/mock-turn
// Both expose the same imperative API through `controlRef`:
//   controlRef.current.sendContext(text)   push a screen event / "PAUSE"
//   controlRef.current.end()
//
// `getAt()` returns ms since session start (the screen-moment clock).
//
// SDK note: @elevenlabs/react is newer than most training data. Verify method
// names against node_modules/@elevenlabs/react/dist/*.d.ts before relying on
// them (e.g. sendContextualUpdate).

import { useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Mic, MicOff, Phone, PhoneOff, Send } from "lucide-react";
import { toast } from "sonner";
import { api, noEmDash } from "@/lib/utils";

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
function RealPanel({ sessionId, getAt, clientTools, controlRef, onUserTurn }) {
  const [micMuted, setMicMuted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [turns, setTurns] = useState([]);
  const conversation = useConversation({
    micMuted,
    onMessage: ({ message, role }) => {
      const r = role === "user" ? "user" : "agent";
      setTurns((t) => [...t, { role: r, text: message }]);
      logTurn(sessionId, r, message, getAt());
      if (r === "user") onUserTurn?.(message);
    },
    onError: (m) => toast.error(m || "Voice session error"),
  });
  const connected = conversation.status === "connected";

  useEffect(() => {
    controlRef.current = {
      sendContext: (text) => connected && conversation.sendContextualUpdate?.(text),
      end: () => conversation.endSession(),
    };
  }, [connected, conversation, controlRef]);

  const start = async () => {
    setStarting(true);
    try {
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

  return (
    <>
      <Transcript turns={turns} />
      <div className="mt-4 flex items-center gap-2">
        {connected ? (
          <>
            <button type="button" onClick={() => setMicMuted((m) => !m)} className={`btn ${micMuted ? "btn-secondary" : "btn-primary"}`}>
              {micMuted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {micMuted ? "Unmute" : "Mute"}
            </button>
            <button type="button" onClick={() => conversation.endSession()} className="btn btn-secondary">
              <PhoneOff className="mr-2 h-4 w-4" /> End
            </button>
          </>
        ) : (
          <button type="button" onClick={start} disabled={starting} className="btn btn-primary disabled:opacity-50">
            <Phone className="mr-2 h-4 w-4" /> {starting ? "Connecting…" : "Start"}
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {connected
            ? conversation.isSpeaking ? "Speaking" : "Listening"
            : conversation.status === "connecting" ? "Connecting…" : "Not connected"}
        </span>
      </div>
      {/* Surface SDK connection errors instead of failing silently. */}
      {conversation.status === "error" && (
        <p className="mt-2 text-xs text-error-600">Voice error: {conversation.message || "could not connect"}</p>
      )}
    </>
  );
}

// ---------------------------------------------------------------- mock voice
function MockPanel({ sessionId, getAt, controlRef, onUserTurn, clientTools = {} }) {
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
