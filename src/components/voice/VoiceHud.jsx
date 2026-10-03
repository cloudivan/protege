// The live call bubble: voice bars, a few words of what she is saying, and two
// small round controls. No box around it. Rendered in the page and in the
// floating PiP window.
import { Mic, MicOff, PhoneOff } from "lucide-react";
import VoiceBars from "@/components/voice/VoiceBars";
import LiveCaption from "@/components/voice/LiveCaption";

const roundBtn =
  "flex h-8 w-8 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function VoiceHud({ sampleRef, status, speaking, caption, micMuted, onToggleMute, onEnd, floating = false }) {
  const connected = status === "connected";

  return (
    <div className={`flex flex-col items-center justify-center ${floating ? "h-full gap-1.5 px-4 py-3" : "gap-2 py-4"}`}>
      <VoiceBars sampleRef={sampleRef} className={floating ? "h-16 w-24" : "h-20 w-32"} />

      <LiveCaption
        text={caption}
        speaking={speaking}
        placeholder={connected ? "" : "Connecting…"}
        className={`w-full max-w-[16rem] font-medium text-foreground ${floating ? "h-10 text-[13px]" : "h-12 text-sm"}`}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMute}
          disabled={!connected}
          aria-label={micMuted ? "Unmute" : "Mute"}
          className={`${roundBtn} ${micMuted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"} disabled:opacity-40`}
        >
          {micMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </button>
        <button type="button" onClick={onEnd} aria-label="End call" className={`${roundBtn} bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground`}>
          <PhoneOff className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
