// Module 1: share a screen and send a frame every FRAME_INTERVAL_MS to the
// vision model. A cheap client-side diff (tiny thumbnail) skips identical
// frames so we do not pay for vision calls on a static screen.

import { useEffect, useRef, useState } from "react";
import { MonitorUp, MonitorX } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";

const INTERVAL = Number(process.env.NEXT_PUBLIC_FRAME_INTERVAL_MS) || 1500;
const MAX_W = 1280;

function thumbDiff(a, b) {
  if (!a || !b) return 1;
  let d = 0;
  for (let i = 0; i < a.length; i += 4) d += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  return d / (a.length * 0.75 * 255);
}

// `shareRef` (optional) exposes start() so another control can open the picker.
// start() resolves true once sharing, false if the user cancelled.
// `hideUntilSharing` hides the card (and its Share button) until a share is live.
// `headless` never shows the card: the share runs, frames are still read from
// an invisible video element.
export default function ScreenShare({ sessionId, getAt, onEvents, onSharingChange, shareRef, hideUntilSharing = false, headless = false }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastThumb = useRef(null);
  const inFlight = useRef(false);
  const [sharing, setSharing] = useState(false);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setSharing(false);
    onSharingChange?.(false);
  };

  const start = async () => {
    if (streamRef.current) return true;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      stream.getVideoTracks()[0].addEventListener("ended", stop);
      setSharing(true);
      onSharingChange?.(true);
      return true;
    } catch (e) {
      // Cancelling the picker is not an error: the caller asks again.
      if (e.name !== "NotAllowedError") toast.error(e.message || "Screen share failed");
      return false;
    }
  };

  if (shareRef) shareRef.current = { start, stop };

  useEffect(() => {
    if (!sharing) return;
    const canvas = document.createElement("canvas");
    const thumb = document.createElement("canvas");
    thumb.width = 32;
    thumb.height = 18;
    const id = setInterval(async () => {
      const v = videoRef.current;
      if (!v?.videoWidth || inFlight.current) return;
      const tctx = thumb.getContext("2d", { willReadFrequently: true });
      tctx.drawImage(v, 0, 0, 32, 18);
      const t = tctx.getImageData(0, 0, 32, 18).data;
      const changed = thumbDiff(t, lastThumb.current) > 0.01;
      lastThumb.current = t;
      if (!changed) return onEvents?.([], "idle");

      const scale = Math.min(1, MAX_W / v.videoWidth);
      canvas.width = v.videoWidth * scale;
      canvas.height = v.videoHeight * scale;
      canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
      const frameBase64 = canvas.toDataURL("image/jpeg", 0.6);
      inFlight.current = true;
      try {
        const { events, activity } = await api(`/api/sessions/${sessionId}/frame`, {
          method: "POST",
          body: { frameBase64, at: getAt() },
        });
        onEvents?.(events, activity);
      } catch (e) {
        console.warn("frame failed", e);
      } finally {
        inFlight.current = false;
      }
    }, INTERVAL);
    return () => clearInterval(id);
  }, [sharing, sessionId, getAt, onEvents]);

  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (headless) {
    // Invisible but still playing, so frames can be drawn from it.
    return <video ref={videoRef} muted playsInline aria-hidden="true" className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0" />;
  }

  return (
    <section className={`card p-5 ${hideUntilSharing && !sharing ? "hidden" : ""}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Screen</h2>
        {sharing ? (
          <button type="button" onClick={stop} className="btn btn-secondary"><MonitorX className="mr-2 h-4 w-4" /> Stop sharing</button>
        ) : (
          <button type="button" onClick={start} className="btn btn-primary"><MonitorUp className="mr-2 h-4 w-4" /> Share screen</button>
        )}
      </div>
      <video ref={videoRef} muted playsInline className={`mt-4 w-full border border-border bg-black ${sharing ? "" : "hidden"}`} />
    </section>
  );
}
