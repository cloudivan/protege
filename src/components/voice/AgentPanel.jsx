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
import { createPortal } from "react-dom";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Phone, PictureInPicture2, Send } from "lucide-react";
import { toast } from "sonner";
import { api, noEmDash } from "@/lib/utils";
import { usePipWindow } from "@/lib/usePipWindow";
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
// Small and square-ish: Chrome draws it as a normal window, so keep it compact.
const PIP_SIZE = { width: 240, height: 200 };

function RealPanel({ sessionId, getAt, clientTools, controlRef, onUserTurn, beforeStart, onEnd, showTranscript = true }) {
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
  const pip = usePipWindow();
  const lastAgentLine = [...turns].reverse().find((t) => t.role === "agent")?.text || "";

  // Read live audio levels for the voice bars. A ref, so the animation loop
  // always sees the current conversation without restarting.
  const sampleRef = useRef(null);
  sampleRef.current = () => {
    if (conversation.status !== "connected") return { mode: "idle" };
    if (conversation.isSpeaking) return { mode: "speaking", freq: conversation.getOutputByteFrequencyData() };
    return { mode: "listening", freq: micMuted ? null : conversation.getInputByteFrequencyData() };
  };

  useEffect(() => {
    controlRef.current = {
      sendContext: (text) => connected && conversation.sendContextualUpdate?.(text),
      end: () => conversation.endSession(),
    };
  }, [connected, conversation, controlRef]);

  // Close the floating window once a call that was live has ended.
  const wasConnected = useRef(false);
  useEffect(() => {
    if (connected) wasConnected.current = true;
    else if (wasConnected.current && conversation.status !== "connecting") {
      wasConnected.current = false;
      pip.close();
    }
  }, [connected, conversation.status, pip.close]);

  const end = () => {
    conversation.endSession();
    pip.close();
    onEnd?.();
  };

  // Runs inside the click: the screen share picker and the floating window
  // both need the user gesture, so both are requested before any await.
  const start = () => {
    const ready = beforeStart ? beforeStart() : true;
    pip.open(PIP_SIZE);
    connect(ready);
  };

  const connect = async (ready) => {
    setStarting(true);
    try {
      if (!(await ready)) {
        pip.close();
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
      pip.close();
      toast.error(err.message || "Microphone unavailable");
    } finally {
      setStarting(false);
    }
  };

  const live = connected || starting || conversation.status === "connecting";
  const hud = (floating) => (
    <VoiceHud
      sampleRef={sampleRef}
      status={conversation.status}
      speaking={conversation.isSpeaking}
      caption={lastAgentLine}
      micMuted={micMuted}
      onToggleMute={() => setMicMuted((m) => !m)}
      onEnd={end}
      floating={floating}
    />
  );

  return (
    <>
      {live ? (
        <>
          {hud(false)}
          {pip.pipWindow && createPortal(<div className="h-screen bg-background text-foreground">{hud(true)}</div>, pip.pipWindow.document.body)}
          {connected && pip.supported && !pip.pipWindow && (
            <button type="button" onClick={() => pip.open(PIP_SIZE)} className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <PictureInPicture2 className="h-3.5 w-3.5" /> Pop out, keep her visible on any tab
            </button>
          )}
        </>
      ) : (
        <>
          {showTranscript && <Transcript turns={turns} />}
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={start} className="btn btn-primary">
              <Phone className="mr-2 h-4 w-4" /> Start
            </button>
            <span className="ml-auto text-xs text-muted-foreground">Not connected</span>
          </div>
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
