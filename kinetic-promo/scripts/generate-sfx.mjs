// Synthesizes the sound-design stems used by the video (no dependencies, deterministic).
//
//   npm run sfx
//
// Writes mono 48kHz 16-bit WAVs to public/sfx/. Each sound is built from a few
// primitives (filtered noise sweeps, pitched sine drops, short transients) so
// it is easy to tweak, or replace entirely with your own files (see
// `audio.files` in src/props.ts).

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sfx");

// --- primitives -----------------------------------------------------------------

/** Small seeded PRNG so every run produces byte-identical files. */
const makeRng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const buffer = (seconds) => new Float32Array(Math.round(seconds * SR));
const whiteNoise = (seconds, seed) => {
  const rand = makeRng(seed);
  const out = buffer(seconds);
  for (let i = 0; i < out.length; i++) out[i] = rand() * 2 - 1;
  return out;
};

/**
 * Chamberlin state-variable filter with a per-sample cutoff.
 * mode: "band" | "low" | "high". `freq(t, progress)` -> Hz, `q` ~ resonance.
 */
const svf = (input, mode, freq, q) => {
  const out = new Float32Array(input.length);
  const q1 = 1 / q;
  let low = 0;
  let band = 0;
  for (let i = 0; i < input.length; i++) {
    const hz = Math.min(Math.max(freq(i / SR, i / input.length), 20), SR / 6);
    const f = 2 * Math.sin((Math.PI * hz) / SR);
    low += f * band;
    const high = input[i] - low - q1 * band;
    band += f * high;
    out[i] = mode === "band" ? band : mode === "low" ? low : high;
  }
  return out;
};

/** Sine with a time-varying frequency (phase is integrated, so sweeps stay clean). */
const sine = (seconds, freq) => {
  const out = buffer(seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    phase += (2 * Math.PI * freq(i / SR, i / out.length)) / SR;
    out[i] = Math.sin(phase);
  }
  return out;
};

/** Multiply a buffer by an amplitude envelope env(t, progress). */
const shape = (input, env) => {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] * env(i / SR, i / input.length);
  return out;
};

const decay = (tau) => (t) => Math.exp(-t / tau);
/** Fast linear attack followed by exponential decay. */
const pluckEnv = (attack, tau) => (t) => Math.min(1, t / attack) * Math.exp(-t / tau);

const mix = (length, ...layers) => {
  const out = buffer(length);
  for (const [layer, gain = 1, offsetSeconds = 0] of layers) {
    const offset = Math.round(offsetSeconds * SR);
    for (let i = 0; i < layer.length && i + offset < out.length; i++) {
      out[i + offset] += layer[i] * gain;
    }
  }
  return out;
};

/** Soft clip: adds weight/punch and keeps peaks under control. */
const saturate = (input, drive) => {
  const norm = Math.tanh(drive);
  return input.map((v) => Math.tanh(v * drive) / norm);
};

/** Peak-normalize, then fade the very ends so nothing clicks. */
const finish = (input, peak = 0.9, fadeInMs = 1, fadeOutMs = 8) => {
  let max = 0;
  for (const v of input) max = Math.max(max, Math.abs(v));
  const gain = max > 0 ? peak / max : 1;
  const fadeIn = Math.round((fadeInMs / 1000) * SR);
  const fadeOut = Math.round((fadeOutMs / 1000) * SR);
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    let g = gain;
    if (i < fadeIn) g *= i / fadeIn;
    if (i > input.length - fadeOut) g *= (input.length - i) / fadeOut;
    out[i] = input[i] * g;
  }
  return out;
};

const writeWav = (name, samples) => {
  const dataBytes = samples.length * 2;
  const wav = Buffer.alloc(44 + dataBytes);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataBytes, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16); // PCM chunk size
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(1, 22); // mono
  wav.writeUInt32LE(SR, 24);
  wav.writeUInt32LE(SR * 2, 28); // byte rate
  wav.writeUInt16LE(2, 32); // block align
  wav.writeUInt16LE(16, 34); // bits
  wav.write("data", 36);
  wav.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    wav.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(join(OUT_DIR, name), wav);
  console.log(`${name.padEnd(16)} ${(samples.length / SR).toFixed(2)}s  ${(wav.length / 1024).toFixed(0)} KB`);
};

// --- the sounds -----------------------------------------------------------------

// 0-7f: STOP flies in. Rising band-pass swell that ends right where the hit lands.
const whooshIn = () => {
  const len = 0.24;
  const air = svf(whiteNoise(len, 1), "band", (t, p) => 300 + 4200 * p * p, 1.6);
  return finish(shape(air, (t, p) => Math.pow(p, 2.2)), 0.9, 2, 4);
};

// Frame 7: the slam. Sub drop + body thump + transient click, saturated.
const hit = () => {
  const len = 0.9;
  const sub = shape(sine(len, (t) => 38 + 120 * Math.exp(-t / 0.045)), decay(0.3));
  const body = shape(sine(len, (t) => 150 + 260 * Math.exp(-t / 0.025)), decay(0.07));
  const click = shape(svf(whiteNoise(len, 2), "high", () => 1800, 0.8), decay(0.006));
  return finish(saturate(mix(len, [sub, 1], [body, 0.55], [click, 0.45]), 2.2));
};

// Frame 45: STOP tears in half. Descending air sweep + low thump + crack.
const split = () => {
  const len = 0.9;
  const air = svf(whiteNoise(len, 3), "band", (t) => 300 + 5500 * Math.exp(-t / 0.18), 1.8);
  const tear = shape(air, pluckEnv(0.008, 0.22));
  const thump = shape(sine(len, (t) => 45 + 70 * Math.exp(-t / 0.05)), decay(0.18));
  const crack = shape(svf(whiteNoise(len, 4), "high", () => 3000, 0.7), decay(0.012));
  return finish(saturate(mix(len, [tear, 1], [thump, 0.8], [crack, 0.5]), 1.6));
};

// Frames 90/98/106: a line slides in. Short descending swish + a tiny "snap" as it settles.
const line = () => {
  const len = 0.36;
  const swish = svf(whiteNoise(len, 5), "band", (t) => 700 + 3800 * Math.exp(-t / 0.07), 2);
  const body = shape(swish, pluckEnv(0.012, 0.09));
  const snap = shape(sine(len, () => 1700), pluckEnv(0.001, 0.012));
  return finish(mix(len, [body, 1], [snap, 0.5, 0.16]), 0.9, 1, 12);
};

// Frames 150-180: 1s tension riser. Cut dead silent at the end so the explosion lands in a gap.
const riser = () => {
  const len = 1.0;
  const air = svf(whiteNoise(len, 6), "band", (t, p) => 250 * Math.pow(30, p), 2.5);
  const noiseBed = shape(air, (t, p) => Math.pow(p, 1.8));
  const tone = shape(sine(len, (t, p) => 110 * Math.pow(8, p)), (t, p) => 0.35 * Math.pow(p, 1.5));
  return finish(mix(len, [noiseBed, 1], [tone, 0.6]), 0.85, 5, 10);
};

// Frame 180: letters blow apart. Noise burst + sub boom + a scatter of debris ticks.
const explode = () => {
  const len = 1.8;
  const burst = shape(
    svf(whiteNoise(len, 7), "low", (t) => 220 + 9000 * Math.exp(-t / 0.22), 0.9),
    decay(0.3),
  );
  const boom = shape(sine(len, (t) => 28 + 55 * Math.exp(-t / 0.14)), decay(0.55));
  const crack = shape(svf(whiteNoise(len, 8), "high", () => 2500, 0.8), decay(0.015));

  // debris: sparse short noise ticks at random pitches, thinning out over time
  const rand = makeRng(9);
  const debris = buffer(len);
  const base = whiteNoise(len, 10);
  for (let n = 0; n < 70; n++) {
    const at = 0.08 + Math.pow(rand(), 1.6) * 1.5;
    const pitch = 900 + rand() * 4500;
    const loud = 0.5 * (1 - at / 1.7) * (0.4 + rand() * 0.6);
    const start = Math.round(at * SR);
    let low = 0;
    let band = 0;
    const f = 2 * Math.sin((Math.PI * pitch) / SR);
    for (let i = 0; i < 0.03 * SR && start + i < debris.length; i++) {
      low += f * band;
      const high = base[start + i] - low - 0.3 * band;
      band += f * high;
      debris[start + i] += band * loud * Math.exp(-i / (0.008 * SR));
    }
  }
  return finish(saturate(mix(len, [burst, 0.9], [boom, 1], [crack, 0.5], [debris, 0.6]), 1.8), 0.92, 1, 40);
};

// Frame 270: circular wipe. Rising-then-falling air sweep with a faint tonal glide.
const wipe = () => {
  const len = 0.9;
  const air = svf(
    whiteNoise(len, 11),
    "band",
    (t, p) => 250 + 5500 * Math.sin(Math.PI * Math.min(1, p * 1.15)) ** 1.5 + 200 * p,
    1.4,
  );
  const swell = shape(air, (t, p) => Math.pow(Math.sin(Math.PI * Math.pow(p, 0.7)), 1.4));
  const glide = shape(sine(len, (t, p) => 200 * Math.pow(6, p)), (t, p) => 0.12 * Math.sin(Math.PI * p));
  return finish(mix(len, [swell, 1], [glide, 1]), 0.85, 4, 30);
};

// Frame ~284: the brand lands. Soft thump + a bright three-note pluck + a sparkle tick.
const brand = () => {
  const len = 1.1;
  const thump = shape(sine(len, (t) => 52 + 70 * Math.exp(-t / 0.05)), decay(0.16));
  const pluck = (hz, gain) =>
    mix(
      len,
      [shape(sine(len, () => hz), pluckEnv(0.003, 0.45)), gain],
      [shape(sine(len, () => hz * 2.003), pluckEnv(0.002, 0.22)), gain * 0.35],
    );
  const chord = mix(len, [pluck(392, 1)], [pluck(587.33, 0.8)], [pluck(783.99, 0.65)]);
  const sparkle = shape(svf(whiteNoise(len, 12), "high", () => 6500, 1), pluckEnv(0.001, 0.05));
  return finish(saturate(mix(len, [thump, 0.9], [chord, 0.45], [sparkle, 0.25]), 1.4), 0.9, 1, 60);
};

// Frame 354: the white flash. Bright zap that drops away fast.
const flash = () => {
  const len = 0.3;
  const zap = shape(sine(len, (t) => 150 + 3500 * Math.exp(-t / 0.03)), decay(0.05));
  const fizz = shape(svf(whiteNoise(len, 13), "high", () => 4000, 0.8), decay(0.05));
  const thump = shape(sine(len, (t) => 55 + 60 * Math.exp(-t / 0.04)), decay(0.1));
  return finish(saturate(mix(len, [zap, 0.7], [fizz, 0.6], [thump, 0.7]), 1.8), 0.9, 1, 20);
};

mkdirSync(OUT_DIR, { recursive: true });
writeWav("whoosh-in.wav", whooshIn());
writeWav("hit.wav", hit());
writeWav("split.wav", split());
writeWav("line.wav", line());
writeWav("riser.wav", riser());
writeWav("explode.wav", explode());
writeWav("wipe.wav", wipe());
writeWav("brand.wav", brand());
writeWav("flash.wav", flash());
