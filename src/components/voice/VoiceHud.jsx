// The live call card: big voice bars, a status line, and the agent's latest
// words underneath. Rendered in the page and in the floating PiP window.
import { Mic, MicOff, PhoneOff } from "lucide-react";
import VoiceBars from "@/components/voice/VoiceBars";
import LiveCaption from "@/components/voice/LiveCaption";

export default function VoiceHud({ sampleRef, status, speaking, caption, micMuted, onToggleMute, onEnd, floating = false }) {
  const label = status === "connected" ? (speaking ? "Speaking" : "Listening") : "Connecting…";

  return (
    <div className={floating ? "flex h-full flex-col items-center justify-between gap-3 p-5" : "flex flex-col items-center gap-3 py-2"}>
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        <span className={`h-1.5 w-1.5 rounded-full ${status === "connected" ? "bg-primary animate-pulse" : "bg-muted-foreground/50"}`} />
        Protégé · {label}
      </div>

      <VoiceBars sampleRef={sampleRef} className={floating ? "h-28 w-44" : "h-24 w-40"} />

      <LiveCaption
        text={caption}
        speaking={speaking}
        className={`w-full text-sm text-foreground ${floating ? "min-h-0 flex-1" : "h-[4.5rem]"}`}
      />

      {floating && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className={`btn ${micMuted ? "btn-primary" : "btn-secondary"} px-3 py-1.5 text-xs`}
          >
            {micMuted ? <MicOff className="mr-1.5 h-3.5 w-3.5" /> : <Mic className="mr-1.5 h-3.5 w-3.5" />}
            {micMuted ? "Unmute" : "Mute"}
          </button>
          <button type="button" onClick={onEnd} className="btn btn-secondary px-3 py-1.5 text-xs">
            <PhoneOff className="mr-1.5 h-3.5 w-3.5" /> End
          </button>
        </div>
      )}
    </div>
  );
}
