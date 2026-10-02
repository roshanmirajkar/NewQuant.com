/**
 * Sanity check for the letter explosion: every letter must be off-screen before the lime iris
 * starts (blast at frame 180, iris at 270). Run:  node scripts/check-physics.ts
 */
import { lastVisibleFrame, makeLaunch, simulate } from "../src/lib/physics.ts";

const W = 1080;
const H = 1920;
const BLAST = 180;
const IRIS = 270;
const MARGIN = 220; // generous: biggest glyph is ~300px, and it spins
const BUDGET = IRIS - BLAST - 4; // want them gone ≥ 4 frames before the iris

// Same shape as the real stack: 3 lines, ~(6, 10, 9) letters, left→right across ~888px.
const lineY = [729, 991, 1217];
const lineLetters = [6, 10, 9];

let worst = 0;
let worstDesc = "";
const trials = 3000;
// Average share of letters still on the canvas N frames after the blast (pacing report).
const sample = [0, 10, 20, 30, 40, 50, 60, 70, 80];
const visibleCount = sample.map(() => 0);
let letterCount = 0;
for (let t = 0; t < trials; t++) {
  for (let li = 0; li < 3; li++) {
    for (let gi = 0; gi < lineLetters[li]; gi++) {
      const home = { x: 96 + (888 * (gi + 0.5)) / lineLetters[li], y: lineY[li] };
      const launch = makeLaunch({
        seed: `trial:${t}:${li}:${gi}`,
        x: home.x,
        y: home.y,
        cx: W / 2,
        cy: H / 2,
        maxDist: 571,
      });
      letterCount++;
      sample.forEach((n, si) => {
        const o = simulate(launch, n);
        const x = home.x + o.x;
        const y = home.y + o.y;
        if (x > 0 && x < W && y > 0 && y < H) visibleCount[si]++;
      });
      const last = lastVisibleFrame(launch, home, { width: W, height: H }, MARGIN);
      if (last > worst) {
        worst = last;
        worstDesc = `trial ${t} line ${li} glyph ${gi} (delay ${launch.delay}, vy ${launch.vy.toFixed(1)})`;
      }
    }
  }
}
console.log(
  "letters on canvas by frame:",
  sample
    .map((n, si) => `${BLAST + n}: ${Math.round((100 * visibleCount[si]) / letterCount)}%`)
    .join("   "),
);
const goneAt = BLAST + worst + 1;
console.log(`worst-case letter leaves the canvas at frame ${goneAt} (budget: ${BLAST + BUDGET + 1}) — ${worstDesc}`);
if (worst > BUDGET) {
  console.error("FAIL: some letters would still be on screen when the iris starts");
  process.exit(1);
}
console.log("OK: all letters are gone before the wipe.");
