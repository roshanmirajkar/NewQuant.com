// Synthesises the placeholder sound-design cues used by <SoundDesign />.
//
//   node scripts/generate-sfx.mjs
//
// Output: public/sfx/*.wav (48 kHz, 16-bit, mono). Deterministic (seeded noise),
// so re-running produces identical files. Swap any of these for a production
// asset by dropping a file with the same name into public/sfx/ (see src/sfx.ts).

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sfx");

// ---------- helpers ----------

const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const makeNoise = (seed) => {
  const rnd = mulberry32(seed);
  return () => rnd() * 2 - 1;
};

const empty = (seconds) => new Float32Array(Math.round(seconds * SR));

/** Chamberlin state-variable filter with a per-sample cutoff. mode: "band" | "low" | "high" */
const svf = (input, cutoffAt, q, mode) => {
  const out = new Float32Array(input.length);
  let low = 0;
  let band = 0;
  for (let i = 0; i < input.length; i++) {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoffAt(i / SR), 9000)) / SR);
    low += f * band;
    const high = input[i] - low - band / q;
    band += f * high;
    out[i] = mode === "band" ? band : mode === "low" ? low : high;
  }
  return out;
};

const expSweep = (f0, f1, dur) => (t) => f0 * Math.pow(f1 / f0, Math.min(t / dur, 1));

/** Rise to `peak` (0..1 of the duration) then fall away. */
const swellEnv = (t, dur, peak, riseCurve = 2, fallCurve = 1.6) => {
  const p = t / dur;
  return p < peak
    ? Math.pow(p / peak, riseCurve)
    : Math.pow(Math.max(0, 1 - (p - peak) / (1 - peak)), fallCurve);
};

/** Phase-accumulating sine so a pitch glide stays click-free. */
const glideSine = (dur, freqAt, ampAt) => {
  const out = empty(dur);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    phase += (2 * Math.PI * freqAt(t)) / SR;
    out[i] = Math.sin(phase) * ampAt(t);
  }
  return out;
};

const mix = (...layers) => {
  const len = Math.max(...layers.map((l) => l.length));
  const out = new Float32Array(len);
  for (const l of layers) for (let i = 0; i < l.length; i++) out[i] += l[i];
  return out;
};

const scale = (buf, g) => buf.map((v) => v * g);

const drive = (buf, amount) => buf.map((v) => Math.tanh(v * amount));

const fadeEdges = (buf, inSec = 0.002, outSec = 0.02) => {
  const a = Math.round(inSec * SR);
  const b = Math.round(outSec * SR);
  for (let i = 0; i < a && i < buf.length; i++) buf[i] *= i / a;
  for (let i = 0; i < b && i < buf.length; i++) buf[buf.length - 1 - i] *= i / b;
  return buf;
};

const normalise = (buf, peak = 0.9) => {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  return max === 0 ? buf : buf.map((v) => (v / max) * peak);
};

const write = (name, buf) => {
  const samples = fadeEdges(buf);
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(join(OUT_DIR, name), Buffer.concat([header, data]));
  console.log(`  ${name.padEnd(22)} ${(samples.length / SR).toFixed(2)}s  ${((header.length + data.length) / 1024).toFixed(0)} KB`);
};

// ---------- building blocks ----------

/** Band-passed noise with a swept centre frequency and a swell envelope. */
const whoosh = ({ dur, from, to, q, peak, seed, rise, fall }) => {
  const noise = makeNoise(seed);
  const raw = empty(dur).map(() => noise());
  const filtered = svf(raw, expSweep(from, to, dur), q, "band");
  return filtered.map((v, i) => v * swellEnv(i / SR, dur, peak, rise, fall));
};

/** Short broadband click for transients. */
const click = (dur, seed, amp = 1) => {
  const noise = makeNoise(seed);
  return empty(dur).map((_, i) => noise() * Math.exp(-(i / SR) * (3 / dur)) * amp);
};

// ---------- cues ----------

mkdirSync(OUT_DIR, { recursive: true });
console.log(`Writing sound design cues to ${OUT_DIR}`);

// 0f: air rushing in just before the STOP slam lands (frame 7).
write(
  "riser-in.wav",
  normalise(whoosh({ dur: 0.24, from: 300, to: 5200, q: 2.2, peak: 0.92, seed: 11, rise: 1.6, fall: 3 }), 0.8),
);

// 7f: STOP slam. Pitch-dropping sub + noise crack, driven for punch.
{
  const body = glideSine(0.9, (t) => 38 + 150 * Math.exp(-t * 16), (t) => Math.exp(-t * 5.2));
  const crack = svf(click(0.12, 21, 1.4), () => 2400, 0.9, "low");
  const thump = glideSine(0.25, (t) => 90 + 120 * Math.exp(-t * 40), (t) => Math.exp(-t * 18) * 0.8);
  write("hit-slam.wav", normalise(drive(mix(body, crack, thump), 2.4), 0.95));
}

// 45f: STOP splits. Whoosh up the middle plus a sharp cut-line crack.
{
  const air = whoosh({ dur: 0.55, from: 350, to: 4200, q: 1.3, peak: 0.3, seed: 31, rise: 1.4, fall: 1.8 });
  const crack = svf(click(0.05, 32, 1.2), () => 4500, 0.8, "high");
  write("whoosh-split.wav", normalise(mix(air, crack), 0.85));
}

// 90f / 98f / 106f: each line sliding in.
write(
  "whoosh-line.wav",
  normalise(whoosh({ dur: 0.34, from: 700, to: 2600, q: 1.6, peak: 0.4, seed: 41, rise: 1.5, fall: 2 }), 0.75),
);

// +10f after each line starts: soft landing thud.
{
  const thud = glideSine(0.16, (t) => 70 + 130 * Math.exp(-t * 45), (t) => Math.exp(-t * 24));
  write("tick.wav", normalise(drive(mix(thud, svf(click(0.03, 51, 0.6), () => 3000, 0.9, "low")), 1.6), 0.8));
}

// 180f: letters explode. Low-passed noise burst closing down + sub drop + debris crackle.
{
  const dur = 1.3;
  const noise = makeNoise(61);
  const burst = svf(empty(dur).map((_, i) => noise() * Math.exp(-(i / SR) * 4.2)), expSweep(7000, 180, 0.9), 0.8, "low");
  const sub = glideSine(dur, (t) => 32 + 90 * Math.exp(-t * 9), (t) => Math.exp(-t * 3.4) * 0.9);
  const rnd = mulberry32(62);
  const debris = empty(dur);
  for (let n = 0; n < 70; n++) {
    const start = Math.floor(rnd() * 0.55 * SR);
    const len = Math.floor((0.01 + rnd() * 0.02) * SR);
    const g = (0.15 + rnd() * 0.25) * (1 - start / (0.6 * SR));
    for (let i = 0; i < len; i++) debris[start + i] += (rnd() * 2 - 1) * g * (1 - i / len);
  }
  write("explosion.wav", normalise(drive(mix(burst, sub, debris), 1.8), 0.95));
}

// 270f: lime circle wipe. Swelling sweep that opens up.
{
  const air = whoosh({ dur: 0.75, from: 180, to: 6500, q: 1.1, peak: 0.78, seed: 71, rise: 1.7, fall: 2.5 });
  const sub = glideSine(0.75, (t) => 50 + 70 * (t / 0.75), (t) => swellEnv(t, 0.75, 0.78, 1.5, 2) * 0.35);
  write("whoosh-wipe.wav", normalise(mix(air, sub), 0.85));
}

// 292f: brand lands. Warm thump + short chime.
{
  const thump = glideSine(0.5, (t) => 48 + 70 * Math.exp(-t * 30), (t) => Math.exp(-t * 9));
  const chime = (freq, decay, amp) => glideSine(1.0, () => freq, (t) => Math.exp(-t * decay) * amp);
  write(
    "hit-brand.wav",
    normalise(mix(thump, chime(880, 5, 0.3), chime(1320, 7, 0.18), chime(1760, 9, 0.1), chime(2640, 12, 0.05)), 0.85),
  );
}

// 354f: white flash. Bright zap that cuts the video off.
{
  const dur = 0.3;
  const zap = glideSine(dur, (t) => 300 + 2400 * Math.exp(-t * 22), (t) => Math.exp(-t * 9) * 0.6);
  const hiss = svf(click(dur, 81, 1.6), () => 5000, 0.8, "high");
  write("flash-zap.wav", normalise(mix(zap, hiss), 0.8));
}
