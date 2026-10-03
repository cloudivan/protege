// The live call bubble, pinned to the top right corner of the page for the
// whole call: round voice bars, a few words of what she is saying, and two
// small round controls. No box: a soft fade keeps the text readable.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import VoiceBars from "@/components/voice/VoiceBars";
import LiveCaption from "@/components/voice/LiveCaption";

const roundBtn =
  "flex h-8 w-8 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function VoiceHud({ sampleRef, audioRef, status, caption, micMuted, onToggleMute, onEnd }) {
  const connected = status === "connected";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null; // document.body only exists in the browser

  // Portaled to <body> so no transformed parent can pull it out of the corner.
  return createPortal(
    <div className="voice-halo pointer-events-none fixed right-4 top-4 z-50 flex w-64 animate-fadeIn flex-col items-center gap-1 px-6 pb-4 pt-5">
      <VoiceBars sampleRef={sampleRef} className="h-14 w-24" />

      <LiveCaption
        text={caption}
        audioRef={audioRef}
        placeholder={connected ? "" : "Connecting…"}
        className="h-10 w-full text-[13px] font-medium text-foreground"
      />

      <div className="pointer-events-auto flex items-center gap-2">
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
    </div>,
    document.body,
  );
}
