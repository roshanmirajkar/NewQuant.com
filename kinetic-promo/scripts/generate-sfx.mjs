/**
 * Synthesises the placeholder sound design into public/sfx/*.wav.
 *
 *   npm run sfx
 *
 * No dependencies, fully deterministic (seeded noise), 44.1kHz 16-bit stereo.
 * Every file is one "slot" in src/sfx.ts. Replace a placeholder with a licensed
 * sample by dropping a file of the same name into public/sfx/ (and removing its
 * entry below so the script stops overwriting it).
 *
 * Timing contract with the video (30fps):
 *   01 slam-whoosh      crests 0.20s in     -> cue starts 7 frames before impact (frame 0),
 *                                              so it crests 1 frame before the hit
 *   06 wipe-riser       peaks at its end    -> ends on the brand-hit cue
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SR = 44100;
const OUT = fileURLToPath(new URL("../public/sfx/", import.meta.url));
mkdirSync(OUT, { recursive: true });

// ---------- primitives ----------------------------------------------------

const rng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const white = (r) => r() * 2 - 1;

/** Zavalishin TPT state-variable filter: stable at any cutoff, cutoff can be modulated per sample. */
class SVF {
  constructor() {
    this.s1 = 0;
    this.s2 = 0;
  }
  process(x, fc, q) {
    const g = Math.tan((Math.PI * Math.min(fc, SR * 0.45)) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - this.s2;
    const v1 = a1 * this.s1 + a2 * v3;
    const v2 = this.s2 + a2 * this.s1 + a3 * v3;
    this.s1 = 2 * v1 - this.s1;
    this.s2 = 2 * v2 - this.s2;
    return { low: v2, band: v1, high: x - k * v1 - v2 };
  }
}

/** exponential interpolation a -> b, x in [0, 1] */
const expo = (a, b, x) => a * Math.pow(b / a, Math.min(1, Math.max(0, x)));
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const TAU = Math.PI * 2;

/** Renders `sec` seconds. `voice(ch)` returns a per-sample fn (t, i) -> value, one instance per channel. */
const render = (sec, voice) =>
  [0, 1].map((ch) => {
    const out = new Float32Array(Math.round(sec * SR));
    const fn = voice(ch);
    for (let i = 0; i < out.length; i++) {
      out[i] = fn(i / SR, i);
    }
    return out;
  });

const softClip = (x, drive = 1.5) => Math.tanh(x * drive) / Math.tanh(drive);

const save = (name, channels, peak = 0.92) => {
  const n = channels[0].length;
  let max = 0;
  for (const c of channels) for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(c[i]));
  const gain = max > 0 ? peak / max : 1;
  const fade = 64; // samples, so neither end can click
  const data = Buffer.alloc(44 + n * 4);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + n * 4, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); // PCM
  data.writeUInt16LE(2, 22); // stereo
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const edge = Math.min(1, i / fade, (n - 1 - i) / fade);
    for (let ch = 0; ch < 2; ch++) {
      const v = Math.max(-1, Math.min(1, channels[ch][i] * gain * edge));
      data.writeInt16LE(Math.round(v * 32767), 44 + (i * 2 + ch) * 2);
    }
  }
  writeFileSync(OUT + name, data);
  console.log(`${name.padEnd(30)} ${(n / SR).toFixed(2)}s  ${(data.length / 1024).toFixed(0)} KB`);
};

// ---------- the sounds ----------------------------------------------------

const sounds = {
  // Rising whoosh, crests 0.20s in (6 frames) and drops away fast, so it has
  // cleared out by the time the hit transient lands one frame later.
  "01_slam-whoosh.wav": () =>
    render(0.4, (ch) => {
      const r = rng(100 + ch);
      const f = new SVF();
      return (t) => {
        const fc = t < 0.2 ? expo(250, 4500, t / 0.2) : expo(4500, 1800, (t - 0.2) / 0.2);
        const env = t < 0.2 ? Math.pow(t / 0.2, 2.2) : Math.exp(-(t - 0.2) / 0.02);
        return f.process(white(r), fc, 1.6).band * env * 2.2;
      };
    }),

  // Heavy impact: pitch-dropping sub, body, noise slap, click.
  "02_slam-hit.wav": () =>
    render(1.3, (ch) => {
      const r = rng(200 + ch);
      const lp = new SVF();
      const hp = new SVF();
      let phase = 0;
      return (t) => {
        phase += (TAU * (42 + 110 * Math.exp(-t / 0.06))) / SR;
        const sub = Math.sin(phase) * Math.exp(-t / 0.3);
        const body = Math.sin(TAU * 95 * t) * Math.exp(-t / 0.12) * 0.4;
        const slap = lp.process(white(r), 3000, 0.8).low * Math.exp(-t / 0.045) * 0.9;
        const crack = hp.process(white(r), 2200, 0.8).high * Math.exp(-t / 0.02) * 0.4;
        const click = t < 0.004 ? white(r) * (1 - t / 0.004) * 0.8 : 0;
        return softClip(sub + body + slap + crack + click, 1.6);
      };
    }),

  // Crack, then a two-way tear: one sweep falling, one rising, plus a short thump.
  "03_split-zip.wav": () =>
    render(0.6, (ch) => {
      const r = rng(300 + ch);
      const hp = new SVF();
      const down = new SVF();
      const up = new SVF();
      let phase = 0;
      return (t) => {
        const crack = hp.process(white(r), 2500, 0.8).high * Math.exp(-t / 0.012);
        const attack = clamp01(t / 0.01);
        const zipDown =
          down.process(white(r), expo(7000, 500, t / 0.35), 2.2).band * attack * Math.exp(-t / 0.12) * 1.6;
        const zipUp =
          up.process(white(r), expo(400, 6000, t / 0.25), 2.2).band * attack * Math.exp(-t / 0.1) * 0.7;
        phase += (TAU * (70 + 60 * Math.exp(-t / 0.03))) / SR;
        const thump = Math.sin(phase) * Math.exp(-t / 0.07) * 0.6;
        return softClip(crack * 0.8 + zipDown + zipUp + thump, 1.3);
      };
    }),

  // Used three times (90f / 98f / 106f): side whoosh into a soft thud.
  "04_line-whoosh-thud.wav": () =>
    render(0.45, (ch) => {
      const r = rng(400 + ch);
      const f = new SVF();
      let phase = 0;
      return (t) => {
        const fc = t < 0.16 ? expo(800, 3500, t / 0.16) : expo(3500, 900, (t - 0.16) / 0.25);
        const env = Math.sin(Math.PI * clamp01(t / 0.3)) ** 2;
        const whoosh = f.process(white(r), fc, 1.8).band * env * 1.8;
        let thud = 0;
        if (t >= 0.17) {
          const u = t - 0.17;
          phase += (TAU * (50 + 45 * Math.exp(-u / 0.03))) / SR;
          thud = Math.sin(phase) * Math.exp(-u / 0.05) * 0.8;
        }
        return whoosh + thud;
      };
    }),

  // Burst, sub thump, scattered debris ticks, long falling tail.
  "05_explode-debris.wav": () => {
    const events = [];
    const er = rng(555);
    for (let t0 = 0.02; t0 < 1.7; ) {
      events.push({ t0, amp: 0.25 + er() * 0.75, f: 1500 + er() * 3500 });
      t0 += -Math.log(1 - er()) / (170 * Math.exp(-t0 / 0.7));
    }
    return render(2.0, (ch) => {
      const r = rng(500 + ch);
      const burst = new SVF();
      const tail = new SVF();
      let phase = 0;
      return (t) => {
        const b = burst.process(white(r), expo(9000, 1200, t / 0.6), 0.9).low * Math.exp(-t / 0.1);
        phase += (TAU * (38 + 90 * Math.exp(-t / 0.09))) / SR;
        const thump = Math.sin(phase) * Math.exp(-t / 0.35);
        let debris = 0;
        for (const e of events) {
          const u = t - e.t0;
          if (u > 0 && u < 0.05) debris += Math.sin(TAU * e.f * u) * Math.exp(-u / 0.004) * e.amp * 0.22;
        }
        const fall =
          tail.process(white(r), expo(4000, 250, t / 1.8), 2).band *
          clamp01(t / 0.02) *
          Math.exp(-t / 0.7) *
          1.3;
        return softClip(b * 1.1 + thump + debris + fall, 1.5);
      };
    });
  },

  // 0.9s riser; amplitude and pitch both climb, peaking on the final sample.
  "06_wipe-riser.wav": () =>
    render(0.9, (ch) => {
      const r = rng(600 + ch);
      const f = new SVF();
      let phase = 0;
      return (t) => {
        const x = t / 0.9;
        const noise = f.process(white(r), expo(200, 9000, x), 1.4).band * Math.pow(x, 2.5) * 2.2;
        phase += (TAU * expo(180, 1400, x)) / SR;
        const tone = Math.sin(phase) * Math.pow(x, 2) * 0.25;
        return noise + tone;
      };
    }),

  // Soft boom plus a bright, short chime: the sign-off landing.
  "07_brand-hit.wav": () =>
    render(1.8, (ch) => {
      const r = rng(700 + ch);
      const lp = new SVF();
      let phase = 0;
      const partials = [
        { f: 784, a: 0.5, tau: 0.9 },
        { f: 1175, a: 0.35, tau: 0.7 },
        { f: 1568, a: 0.25, tau: 0.5 },
        { f: 2349, a: 0.12, tau: 0.35 },
      ];
      return (t) => {
        phase += (TAU * (55 + 60 * Math.exp(-t / 0.05))) / SR;
        const boom = Math.sin(phase) * Math.exp(-t / 0.45) * 0.9;
        const puff = lp.process(white(r), 2000, 0.8).low * Math.exp(-t / 0.03) * 0.5;
        let chime = 0;
        for (const p of partials) chime += Math.sin(TAU * p.f * t) * p.a * Math.exp(-t / p.tau);
        chime *= clamp01(t / 0.002) * 0.35;
        return softClip(boom + puff + chime, 1.3);
      };
    }),

  // Shutter-style white-noise burst with a bright blip, under the 6-frame flash.
  "08_flash-cut.wav": () =>
    render(0.5, (ch) => {
      const r = rng(800 + ch);
      const hp = new SVF();
      let phase = 0;
      return (t) => {
        const burst = hp.process(white(r), 1500, 0.8).high * clamp01(t / 0.004) * Math.exp(-t / 0.1);
        phase += (TAU * expo(1200, 5200, t / 0.18)) / SR;
        const blip = Math.sin(phase) * Math.exp(-t / 0.06) * 0.25;
        return burst + blip;
      };
    }),
};

for (const [name, build] of Object.entries(sounds)) {
  save(name, build());
}
