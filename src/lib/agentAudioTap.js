// Measures the agent's voice straight from the hidden <audio> element the
// ElevenLabs SDK plays it through, with our own analyser. Used because the
// SDK's own output level can read as silence in some browsers.
//
// The analyser is not connected to the speakers, so nothing plays twice.
// Frequency data is resampled to the SDK's layout (1024 bins, 100 Hz to
// 8 kHz) so the voice bars can use either source.

const BINS = 1024;
const MIN_HZ = 100;
const MAX_HZ = 8000;

export function createAgentAudioTap() {
  let ctx = null;
  let analyser = null;
  let tapped = null; // the MediaStream we are measuring
  let raw = null;
  const out = new Uint8Array(BINS);

  const findStream = () => {
    for (const el of document.querySelectorAll("audio")) {
      const s = el.srcObject;
      if (s instanceof MediaStream && s.getAudioTracks().some((t) => t.readyState === "live")) return s;
    }
    return null;
  };

  const attach = () => {
    const stream = findStream();
    if (!stream || stream === tapped) return;
    try {
      ctx ??= new AudioContext();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.6;
      ctx.createMediaStreamSource(stream).connect(analyser);
      raw = new Uint8Array(analyser.frequencyBinCount);
      tapped = stream;
    } catch {
      analyser = null;
    }
  };
  const timer = setInterval(attach, 500);
  attach();

  return {
    // Byte frequency data in the SDK's layout, or null before the tap is live.
    frequency() {
      if (!analyser) return null;
      analyser.getByteFrequencyData(raw);
      const hzPerBin = ctx.sampleRate / 2 / raw.length;
      const lo = MIN_HZ / hzPerBin;
      const span = Math.min(MAX_HZ / hzPerBin, raw.length - 1) - lo;
      for (let i = 0; i < BINS; i++) out[i] = raw[Math.floor(lo + (i / BINS) * span)];
      return out;
    },
    // 0..1 loudness across the voice range.
    volume() {
      const f = this.frequency();
      if (!f) return 0;
      let sum = 0;
      for (let i = 0; i < BINS; i++) sum += f[i];
      return sum / BINS / 255;
    },
    live: () => Boolean(analyser),
    close() {
      clearInterval(timer);
      ctx?.close().catch(() => {});
    },
  };
}
