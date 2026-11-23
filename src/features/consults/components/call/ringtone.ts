"use client";

/**
 * Call sounds with WebAudio (no audio files to download). "out" is the 425 Hz
 * ringback people in Bangladesh know; "in" is a two-tone ring plus vibration.
 * Browsers may block sound before the first tap; vibration still works on Android.
 */
export function startTone(kind: "in" | "out"): () => void {
  let ctx: AudioContext | null = null;
  try {
    ctx = new AudioContext();
    void ctx.resume().catch(() => undefined);
  } catch {
    ctx = null;
  }

  const beep = (freq: number, at: number, length: number) => {
    if (!ctx || ctx.state === "closed") return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + at);
    gain.gain.linearRampToValueAtTime(kind === "in" ? 0.18 : 0.08, ctx.currentTime + at + 0.02);
    gain.gain.setValueAtTime(kind === "in" ? 0.18 : 0.08, ctx.currentTime + at + length - 0.03);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + at + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + at);
    osc.stop(ctx.currentTime + at + length + 0.02);
  };

  const cycle = () => {
    if (kind === "out") {
      beep(425, 0, 1);
    } else {
      beep(880, 0, 0.35);
      beep(660, 0.4, 0.35);
      beep(880, 1, 0.35);
      beep(660, 1.4, 0.35);
      if ("vibrate" in navigator) navigator.vibrate([400, 200, 400]);
    }
  };
  cycle();
  const timer = window.setInterval(cycle, kind === "out" ? 4000 : 3000);

  return () => {
    window.clearInterval(timer);
    if ("vibrate" in navigator) navigator.vibrate(0);
    void ctx?.close().catch(() => undefined);
    ctx = null;
  };
}
