#!/usr/bin/env node
/**
 * Synthesises the placeholder sound-design one-shots into public/sfx/.
 * Plain Node, no dependencies, 48 kHz / 16-bit PCM WAV (Remotion's native rate).
 *
 *   npm run sfx
 *
 * Swap any file for a stock SFX with the same filename and the matching cue in
 * src/SoundDesign.tsx keeps its timing.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sfx");
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- DSP toolkit

/** Small seeded PRNG (mulberry32): the files come out identical on every run. */
const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const lerp = (a, b, u) => a + (b - a) * u;
/** Exponential sweep from a to b (equal pitch intervals per unit of u). */
const expo = (a, b, u) => a * Math.pow(b / a, u);

/** Zero-delay-feedback state-variable filter: stays stable while the cutoff sweeps. */
class Svf {
  s1 = 0;
  s2 = 0;
  run(x, cutoff, q) {
    const g = Math.tan((Math.PI * Math.min(cutoff, SR * 0.45)) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - this.s2;
    const v1 = a1 * this.s1 + a2 * v3;
    const v2 = this.s2 + a2 * this.s1 + a3 * v3;
    this.s1 = 2 * v1 - this.s1;
    this.s2 = 2 * v2 - this.s2;
    // band is scaled to unity gain at the centre frequency
    return { low: v2, band: k * v1, high: x - k * v1 - v2 };
  }
}

/** Pink-ish noise (Paul Kellet's filter): a softer, more natural wind than white. */
class Pink {
  b0 = 0; b1 = 0; b2 = 0; b3 = 0; b4 = 0; b5 = 0; b6 = 0;
  next(white) {
    this.b0 = 0.99886 * this.b0 + white * 0.0555179;
    this.b1 = 0.99332 * this.b1 + white * 0.0750759;
    this.b2 = 0.969 * this.b2 + white * 0.153852;
    this.b3 = 0.8665 * this.b3 + white * 0.3104856;
    this.b4 = 0.55 * this.b4 + white * 0.5329522;
    this.b5 = -0.7616 * this.b5 - white * 0.016898;
    const out =
      this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362;
    this.b6 = white * 0.115926;
    return out * 0.11;
  }
}

const buffer = (seconds, channels) =>
  Array.from({ length: channels }, () => new Float32Array(Math.ceil(seconds * SR)));

const writeWav = (name, channels) => {
  const n = channels[0].length;
  const nch = channels.length;
  const data = n * nch * 2;
  const buf = Buffer.alloc(44 + data);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + data, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(nch, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * nch * 2, 28);
  buf.writeUInt16LE(nch * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(data, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nch; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      buf.writeInt16LE(Math.round(s * 32767), o);
      o += 2;
    }
  }
  writeFileSync(join(OUT, name), buf);
};

/** Normalise to a peak level, de-click both ends, write to disk. */
const finish = (name, channels, { peak = 0.89, fadeOut = 0.008 } = {}) => {
  let max = 0;
  for (const ch of channels) for (const s of ch) max = Math.max(max, Math.abs(s));
  const gain = max > 0 ? peak / max : 1;
  const n = channels[0].length;
  const fadeInSamples = Math.floor(0.0005 * SR);
  const fadeOutSamples = Math.floor(fadeOut * SR);
  for (const ch of channels) {
    for (let i = 0; i < n; i++) {
      let g = gain;
      if (i < fadeInSamples) g *= i / fadeInSamples;
      if (i >= n - fadeOutSamples) g *= (n - 1 - i) / fadeOutSamples;
      ch[i] *= g;
    }
  }
  writeWav(name, channels);
  console.log(
    `  ${name.padEnd(18)} ${(n / SR).toFixed(2)} s  ${channels.length === 2 ? "stereo" : "mono  "}  peak ${peak}`,
  );
};

// -------------------------------------------------------------------- sounds

/**
 * Filtered-noise whoosh. `from` -> `to` is the band-pass sweep in Hz, `skew`
 * places the loudest moment (1 = middle, >1 = late, <1 = early) and `pan`
 * moves the sound across the stereo field.
 */
const whoosh = ({ seconds, from, to, q, skew, pan, seed, air }) => {
  const [L, R] = buffer(seconds, 2);
  const rand = rng(seed);
  const pink = new Pink();
  const band = new Svf();
  const hiss = new Svf();
  const n = L.length;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const white = rand() * 2 - 1;
    const cutoff = expo(from, to, u);
    const body = band.run(pink.next(white), cutoff, q).band * 3.2;
    const high = hiss.run(white, Math.min(cutoff * 2, 12000), 0.7).high * air;
    const env = Math.pow(Math.sin(Math.PI * Math.pow(u, skew)), 1.5);
    const y = (body + high) * env;
    const angle = ((lerp(pan[0], pan[1], u) + 1) * Math.PI) / 4; // equal-power pan
    L[i] = y * Math.cos(angle);
    R[i] = y * Math.sin(angle);
  }
  return [L, R];
};

/**
 * Heavy impact: pitch-dropping kick with a long sub tail + noise crack + low
 * thump, saturated. The sub tail rides the kick's own phase: a separate 36 Hz
 * oscillator next to the kick's 38 Hz tail would beat (a 2 Hz wobble that cancels
 * the low end at ~0.6 s).
 */
const heavyHit = () => {
  const [m] = buffer(1.2, 1);
  const rand = rng(31);
  const crackFilter = new Svf();
  const thumpFilter = new Svf();
  let phase = 0;
  for (let i = 0; i < m.length; i++) {
    const t = i / SR;
    phase += (2 * Math.PI * (38 + 140 * Math.exp(-t / 0.045))) / SR;
    const body = Math.sin(phase) * (Math.exp(-t / 0.3) + 0.45 * Math.exp(-t / 0.55));
    const white = rand() * 2 - 1;
    const crack = crackFilter.run(white, 1800, 0.7).high * Math.exp(-t / 0.014) * 0.9;
    const thump = thumpFilter.run(white, 260, 0.8).low * Math.exp(-t / 0.22) * 1.2;
    m[i] = Math.tanh(1.7 * (body + crack + thump));
  }
  return [m];
};

/** Light snap: a band-passed noise click over a short high ping. */
const tick = () => {
  const [m] = buffer(0.22, 1);
  const rand = rng(41);
  const band = new Svf();
  for (let i = 0; i < m.length; i++) {
    const t = i / SR;
    const snap = band.run(rand() * 2 - 1, 3200, 2.5).band * Math.exp(-t / 0.009) * 2.2;
    const ping = Math.sin(2 * Math.PI * 1500 * t) * Math.exp(-t / 0.022) * 0.5;
    m[i] = Math.tanh(snap + ping);
  }
  return [m];
};

/** Explosion: sub boom + closing low-pass noise burst + rumble + debris crackle. */
const explosion = () => {
  const seconds = 1.9;
  const [L, R] = buffer(seconds, 2);
  const n = L.length;
  const rand = rng(51);
  const crackle = new Float32Array(n);
  for (let k = 0; k < 70; k++) {
    const at = Math.floor((0.03 + Math.pow(rand(), 1.7) * 1.3) * SR);
    const amp = rand() * 0.5 * Math.exp(-at / SR / 0.7);
    const len = Math.floor(0.004 * SR);
    for (let j = 0; j < len && at + j < n; j++) {
      crackle[at + j] += (rand() * 2 - 1) * amp * (1 - j / len);
    }
  }
  const channels = [L, R].map((out, c) => ({
    out,
    rand: rng(60 + c),
    burst: new Svf(),
    rumble: new Svf(),
    pink: new Pink(),
  }));
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const u = Math.min(1, t / 1.4);
    phase += (2 * Math.PI * (26 + 100 * Math.exp(-t / 0.09))) / SR;
    const boom = Math.sin(phase) * Math.exp(-t / 0.5);
    for (const ch of channels) {
      const white = ch.rand() * 2 - 1;
      const burst =
        ch.burst.run(white, expo(9000, 160, u), 0.9).low *
        (1 - Math.exp(-t / 0.0025)) *
        Math.exp(-t / 0.36) *
        2.4;
      const rumble = ch.rumble.run(ch.pink.next(white), 110, 0.8).low * Math.exp(-t / 0.9) * 1.6;
      ch.out[i] = Math.tanh(1.4 * (boom * 0.9 + burst + rumble + crackle[i] * 2));
    }
  }
  return [L, R];
};

/** ~0.9 s swell: band-passed noise sweeping up and getting louder, plus a rising tone. */
const riser = () => {
  const seconds = 0.9;
  const [L, R] = buffer(seconds, 2);
  const n = L.length;
  const channels = [L, R].map((out, c) => ({
    out,
    rand: rng(70 + c),
    pink: new Pink(),
    band: new Svf(),
  }));
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const env = Math.pow(u, 2.2);
    phase += (2 * Math.PI * expo(150, 1500, Math.pow(u, 1.5))) / SR;
    const tone = Math.sin(phase) * 0.12;
    for (const ch of channels) {
      const white = ch.rand() * 2 - 1;
      const noise =
        ch.band.run(ch.pink.next(white), expo(220, 7500, Math.pow(u, 1.3)), 2) .band * 3.4;
      ch.out[i] = (noise + tone) * env;
    }
  }
  return [L, R];
};

/** Split: a crack and thud, with one sweep rising on the left, one falling on the right. */
const split = () => {
  const [L, R] = buffer(0.55, 2);
  const n = L.length;
  const rand = rng(81);
  const randUp = rng(82);
  const randDown = rng(83);
  const crackFilter = new Svf();
  const up = new Svf();
  const down = new Svf();
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const u = Math.min(1, t / 0.4);
    const attack = 1 - Math.exp(-t / 0.003);
    const decay = Math.exp(-t / 0.12);
    const crack = crackFilter.run(rand() * 2 - 1, 2500, 0.7).high * Math.exp(-t / 0.006) * 0.9;
    const thud = Math.sin(2 * Math.PI * 95 * t) * Math.exp(-t / 0.07) * 0.8;
    const rising = up.run(randUp() * 2 - 1, expo(500, 9000, u), 1.6).band * 2.4 * attack * decay;
    const falling = down.run(randDown() * 2 - 1, expo(9000, 500, u), 1.6).band * 2.4 * attack * decay;
    const center = crack + thud;
    L[i] = Math.tanh(center + rising);
    R[i] = Math.tanh(center + falling);
  }
  return [L, R];
};

/** Closing flash: bright noise crack with a decaying three-note shimmer. */
const flash = () => {
  const [L, R] = buffer(0.8, 2);
  const n = L.length;
  const channels = [L, R].map((out, c) => ({
    out,
    rand: rng(90 + c),
    hp: new Svf(),
    detune: 1 + (c === 0 ? -0.002 : 0.002),
  }));
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    for (const ch of channels) {
      const crack =
        ch.hp.run(ch.rand() * 2 - 1, 4200, 0.7).high *
        (1 - Math.exp(-t / 0.002)) *
        Math.exp(-t / 0.1) *
        1.4;
      let shimmer = 0;
      [2093, 3136, 4186].forEach((f, k) => {
        shimmer += Math.sin(2 * Math.PI * f * ch.detune * t) * [0.22, 0.16, 0.1][k];
      });
      shimmer *= Math.exp(-t / 0.3) * (1 - Math.exp(-t / 0.002));
      ch.out[i] = crack + shimmer;
    }
  }
  return [L, R];
};

// --------------------------------------------------------------------- render

console.log(`Writing sound design one-shots to ${OUT}`);

finish(
  "whoosh-in.wav",
  whoosh({ seconds: 0.32, from: 250, to: 7000, q: 1.6, skew: 2.4, pan: [0, 0], seed: 11, air: 0.5 }),
  { peak: 0.85, fadeOut: 0.012 },
);
finish("hit-heavy.wav", heavyHit(), { peak: 0.95, fadeOut: 0.05 });
finish("split.wav", split(), { peak: 0.9, fadeOut: 0.03 });
finish(
  "whoosh-left.wav",
  whoosh({ seconds: 0.42, from: 400, to: 4200, q: 1.3, skew: 1.1, pan: [-0.9, 0.9], seed: 21, air: 0.35 }),
  { peak: 0.8, fadeOut: 0.02 },
);
finish(
  "whoosh-right.wav",
  whoosh({ seconds: 0.42, from: 400, to: 4200, q: 1.3, skew: 1.1, pan: [0.9, -0.9], seed: 22, air: 0.35 }),
  { peak: 0.8, fadeOut: 0.02 },
);
finish("tick.wav", tick(), { peak: 0.75, fadeOut: 0.02 });
finish("explosion.wav", explosion(), { peak: 0.95, fadeOut: 0.12 });
finish("riser.wav", riser(), { peak: 0.85, fadeOut: 0.012 });
finish("flash.wav", flash(), { peak: 0.8, fadeOut: 0.1 });
