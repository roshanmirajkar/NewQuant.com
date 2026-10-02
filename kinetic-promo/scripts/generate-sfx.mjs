#!/usr/bin/env node
/**
 * Synthesises the sound-design WAVs in public/sfx/ (mono, 48 kHz, 16-bit PCM). No dependencies,
 * seeded noise, so every run produces byte-identical files:   npm run sfx
 *
 * They are deliberately simple: sine sweeps, filtered noise, a little saturation and a small
 * Schroeder reverb. Swap any of them for a recorded sample (same file name) and nothing else needs
 * to change. Which frame each one plays on is in src/sfx.ts.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const FPS = 30;
const TAU = Math.PI * 2;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sfx");

// ── helpers ──────────────────────────────────────────────────────────────────────────────
const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
/** White noise in [-1, 1). */
const noiseGen = (seed) => {
  const r = mulberry32(seed);
  return () => r() * 2 - 1;
};
const buf = (seconds) => new Float32Array(Math.round(seconds * SR));
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

/** Chamberlin state-variable filter; the cutoff may change every sample. `q` is the damping (1/Q). */
const svf = () => {
  let low = 0;
  let band = 0;
  return (x, fc, q) => {
    const f = 2 * Math.sin((Math.PI * Math.min(fc, SR * 0.4)) / SR);
    low += f * band;
    const high = x - low - q * band;
    band += f * high;
    return { low, band, high };
  };
};

/** Small Schroeder reverb (6 damped combs + 2 allpasses). `tail` seconds are appended. */
const reverb = (input, tail, mix, feedback = 0.8, fadeSec = 0.25) => {
  const n = input.length + Math.round(tail * SR);
  const dry = new Float32Array(n);
  dry.set(input);
  // Fade the dry signal out before the reverb tail takes over, so the end of the buffer never clicks.
  const fadeN = Math.min(input.length, Math.round(fadeSec * SR));
  for (let k = 0; k < fadeN; k++) dry[input.length - 1 - k] *= smooth(k / fadeN);
  const wet = new Float32Array(n);
  const scale = (d) => Math.round((d * SR) / 44100);
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map(scale);
  for (const d of combs) {
    const line = new Float32Array(d);
    let idx = 0;
    let damp = 0;
    for (let i = 0; i < n; i++) {
      const y = line[idx];
      damp = y * 0.65 + damp * 0.35;
      line[idx] = dry[i] + damp * feedback;
      wet[i] += (y * 2) / combs.length;
      idx = (idx + 1) % d;
    }
  }
  for (const d0 of [225, 556]) {
    const d = scale(d0);
    const line = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < n; i++) {
      const delayed = line[idx];
      const v = wet[i] + 0.5 * delayed;
      line[idx] = v;
      wet[i] = -0.5 * v + delayed;
      idx = (idx + 1) % d;
    }
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = dry[i] + wet[i] * mix;
  return out;
};

const finish = (samples, peak, fadeOutMs = 10) => {
  let max = 1e-9;
  for (const s of samples) max = Math.max(max, Math.abs(s));
  const gain = peak / max;
  const fadeIn = Math.round(0.0008 * SR);
  const fadeOut = Math.round((fadeOutMs / 1000) * SR);
  for (let i = 0; i < samples.length; i++) {
    let g = gain;
    if (i < fadeIn) g *= i / fadeIn;
    const left = samples.length - 1 - i;
    if (left < fadeOut) g *= left / fadeOut;
    samples[i] *= g;
  }
  return samples;
};

const writeWav = (name, samples) => {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(36 + samples.length * 2, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20); // PCM
  bytes.writeUInt16LE(1, 22); // mono
  bytes.writeUInt32LE(SR, 24);
  bytes.writeUInt32LE(SR * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    bytes.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  writeFileSync(join(OUT, name), bytes);
  console.log(`  ${name.padEnd(16)} ${(samples.length / SR).toFixed(2)}s  ${(bytes.length / 1024).toFixed(0)} KB`);
};

// ── the sounds ───────────────────────────────────────────────────────────────────────────

/** Deep impact: pitch-dropping sub, a mid body, a noise click, saturated and given a little room. */
const hit = () => {
  const noise = noiseGen(11);
  const out = buf(1.2);
  const lp = svf();
  const bp = svf();
  let ph1 = 0;
  let ph2 = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph1 += (TAU * (42 + 120 * Math.exp(-t / 0.04))) / SR; // sub: 162 → 42 Hz
    ph2 += (TAU * (88 + 160 * Math.exp(-t / 0.03))) / SR; // body: 248 → 88 Hz
    const sub = Math.sin(ph1) * Math.exp(-t / 0.26);
    const body = Math.sin(ph2) * Math.exp(-t / 0.11) * 0.55;
    const n = noise();
    const click = lp(n, 6500, 0.9).low * Math.exp(-t / 0.012) * 0.8;
    const crack = bp(n, 1400, 0.6).band * Math.exp(-t / 0.05) * 0.5;
    const attack = Math.min(1, t / 0.0015);
    out[i] = Math.tanh((sub + body + click + crack) * attack * 1.7);
  }
  return finish(reverb(out, 0.5, 0.16), 0.95);
};

/** Suck-in that peaks exactly as STOP lands (7 frames), then stops dead for the hit to take over. */
const whooshIn = () => {
  const T = 7 / FPS;
  const out = buf(T);
  const noise = noiseGen(21);
  const f = svf();
  for (let i = 0; i < out.length; i++) {
    const p = i / out.length;
    const fc = 260 * Math.pow(14, p); // 260 → 3600 Hz
    out[i] = f(noise(), fc, 0.5).band * Math.pow(p, 2.2);
  }
  return finish(out, 0.8, 4);
};

/** Big whoosh: band-passed noise whose centre sweeps up then back down, plus a low rumble. */
const whoosh = () => {
  const T = 0.85;
  const out = buf(T);
  const noise = noiseGen(31);
  const f = svf();
  const r = svf();
  for (let i = 0; i < out.length; i++) {
    const p = i / out.length;
    const shape = Math.sin(Math.PI * Math.pow(p, 0.8));
    const n = noise();
    const swoosh = f(n, 380 + 3400 * shape, 0.55).band * Math.pow(shape, 1.3);
    const rumble = r(n, 220, 1).low * shape * 0.6;
    out[i] = swoosh + rumble;
  }
  return finish(out, 0.8, 30);
};

/** Short high swish for the shutter and the three line slides. */
const swish = () => {
  const out = buf(0.32);
  const noise = noiseGen(41);
  const f = svf();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const fc = 1100 + 5200 * Math.exp(-t / 0.12);
    const env = Math.min(1, t / 0.015) * Math.exp(-t / 0.075);
    out[i] = f(noise(), fc, 0.5).band * env;
  }
  return finish(out, 0.8, 20);
};

/** Rising sweep into the lime flood; ends on the frame the end-card hit lands. */
const riser = () => {
  const T = 27 / FPS;
  const out = buf(T);
  const noise = noiseGen(51);
  const f = svf();
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const p = i / out.length;
    const env = Math.pow(p, 1.7);
    ph += (TAU * 160 * Math.pow(9, p)) / SR; // 160 → 1440 Hz
    const band = f(noise(), 180 * Math.pow(45, p), 0.45).band * env * 1.1;
    out[i] = band + Math.sin(ph) * env * 0.22;
  }
  return finish(out, 0.85, 6);
};

/** Blast: huge sub boom, a closing-down noise burst, then sparse falling-debris crackle. */
const explode = () => {
  const out = buf(1.9);
  const noise = noiseGen(61);
  const rand = mulberry32(62);
  const burst = svf();
  const debris = svf();
  let ph = 0;
  let click = 0;
  const clickDecay = Math.exp(-1 / (0.003 * SR));
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (TAU * (38 + 140 * Math.exp(-t / 0.06))) / SR;
    const boom = Math.sin(ph) * Math.exp(-t / 0.38);
    const n = noise();
    const blast =
      burst(n, 400 + 9000 * Math.exp(-t / 0.22), 0.9).low * Math.exp(-t / 0.3) * 1.2;
    if (t > 0.12 && t < 1.6 && rand() < (90 * Math.exp(-(t - 0.12) / 0.7)) / SR) {
      click = 0.4 + 0.6 * rand();
    }
    click *= clickDecay;
    const crackle = debris(n, 2500, 0.8).high * click * 0.9;
    const attack = Math.min(1, t / 0.001);
    out[i] = Math.tanh((boom + blast + crackle) * attack * 1.5);
  }
  return finish(reverb(out, 0.7, 0.2), 0.95);
};

/** End-card landing: soft thump plus a bell-like chime and a little air. */
const brand = () => {
  const out = buf(2.2);
  const noise = noiseGen(71);
  const hp = svf();
  let ph = 0;
  const partials = [
    [1, 1, 1.0],
    [2.0, 0.55, 0.75],
    [2.97, 0.32, 0.5],
    [4.16, 0.2, 0.32],
    [5.43, 0.12, 0.22],
  ];
  const base = 784; // G5
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (TAU * (55 + 70 * Math.exp(-t / 0.05))) / SR;
    const thump = Math.sin(ph) * Math.exp(-t / 0.18) * 0.8;
    let bell = 0;
    for (const [ratio, amp, tau] of partials) {
      bell += Math.sin(TAU * base * ratio * t) * amp * Math.exp(-t / tau);
    }
    bell *= Math.min(1, t / 0.002) * 0.45;
    const air = hp(noise(), 7000, 0.7).high * Math.exp(-t / 0.3) * 0.1;
    out[i] = Math.tanh((thump + bell + air) * 1.2);
  }
  return finish(reverb(out, 0.9, 0.3, 0.84), 0.9);
};

/** Cut flash: bright noise burst, falling zap and a short low thump; exactly the last 6 frames long. */
const flash = () => {
  const out = buf(6 / FPS);
  const noise = noiseGen(81);
  const hp = svf();
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (TAU * (160 + 2400 * Math.exp(-t / 0.035))) / SR;
    const zap = Math.sin(ph) * Math.exp(-t / 0.05) * 0.8;
    const air = hp(noise(), 3500, 0.7).high * Math.exp(-t / 0.05) * 0.8;
    const thump = Math.sin(TAU * 55 * t) * Math.exp(-t / 0.06) * 0.5;
    out[i] = Math.tanh((zap + air + thump) * Math.min(1, t / 0.001) * 1.3);
  }
  return finish(out, 0.85, 70);
};

// ── write them ───────────────────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
console.log(`Writing sound effects to ${OUT}`);
writeWav("hit.wav", hit());
writeWav("whoosh-in.wav", whooshIn());
writeWav("whoosh.wav", whoosh());
writeWav("swish.wav", swish());
writeWav("riser.wav", riser());
writeWav("explode.wav", explode());
writeWav("brand.wav", brand());
writeWav("flash.wav", flash());
