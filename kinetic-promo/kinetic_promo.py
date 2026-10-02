#!/usr/bin/env python3
"""
Kinetic typography promo: 1080x1920, 30 fps, 360 frames (12 s). Same storyboard as the
Remotion version in this folder, but rendered with numpy + Pillow and piped straight into
ffmpeg. Frames only ever exist in memory.

    python3 kinetic_promo.py

Dependencies: numpy, Pillow, and an `ffmpeg` binary on PATH. Nothing else.

Storyboard
    0-45    "STOP" slams in (scale 3 -> 1, spring overshoot) with a +-6px camera shake
    45-90   STOP splits along its centre line; lime "SCROLLING" is revealed in the gap
    90-180  three lines slide in from alternating sides, 8 frames apart, word-by-word mask reveal
    180-270 every letter gets a seeded velocity/spin and falls off-screen under gravity
    270-330 lime circle wipes out from the centre, black "YOUR BRAND" fades up 20px
    330-360 hold, then a 6-frame white flash
"""
from __future__ import annotations

import math
import shutil
import subprocess
import sys
import time
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# --------------------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------------------
W, H, FPS, N = 1080, 1920, 30, 360
SS = 2  # supersampling factor for text and shape edges
CX, CY = W / 2, H / 2

HERE = Path(__file__).resolve().parent
OUT = HERE / "out" / "kinetic_py.mp4"
SHEET = HERE / "out" / "kinetic_py_contact.png"
PREVIEW_PCTS = (0.25, 0.50, 0.90)

COPY = {
    "hook": "STOP",
    "reveal": "SCROLLING",
    "lines": ("THIS IS", "WHAT MOTION", "LOOKS LIKE"),
    "brand": "YOUR BRAND",
}
BG = (0, 0, 0)
WHITE = (255, 255, 255)
LIME = (198, 255, 0)  # #C6FF00
BLACK = (0, 0, 0)

SAFE_W = 880  # widest any text block may be (>=100px side margins before push-ins)
STACK_GAP = 64  # px between stacked lines
SLIDE = 700  # px a line travels in from the side
GRAIN_SIGMA = 2.2  # luma grain, 8-bit levels

# Frame numbers straight from the storyboard.
T = SimpleNamespace(
    split=45, split_len=22, reveal_close=80,
    lines=90, line_stagger=8, word_stagger=3, mask_len=12,
    explode=180, wipe=270, wipe_len=26, brand=288, brand_len=18,
    flash_len=6,
)
FLASH_START = N - T.flash_len  # 354..359

# Letter physics (px and px/frame at 30 fps, Euler: vy += g; y += vy; every frame).
GRAVITY = 1.35
VX_MAX = 18.0
VY_UP = (8.0, 28.0)
SPIN = (3.0, 14.0)  # deg/frame
DELAY_MAX = 5  # random per-letter start delay, frames
LINE_RIPPLE = 4  # extra frames per line so the burst rolls top to bottom

rng = np.random.default_rng(7)  # the only source of randomness in this file


# --------------------------------------------------------------------------------------
# Timing: one progress helper + a handful of easings
# --------------------------------------------------------------------------------------
def clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else 1.0 if x > 1.0 else x


def prog(frame: float, start: float, dur: float) -> float:
    """0..1 progress of an animation that starts on `start` and lasts `dur` frames."""
    return clamp01((frame - start) / dur)


def _spring(frames: float, damping: float = 10.0, mass: float = 0.6, stiffness: float = 100.0) -> float:
    """Closed-form underdamped spring 0 -> 1 (overshoots to ~1.07). `frames` since it started."""
    if frames <= 0:
        return 0.0
    t = frames / FPS
    w0 = math.sqrt(stiffness / mass)
    z = damping / (2.0 * math.sqrt(stiffness * mass))
    wd = w0 * math.sqrt(1.0 - z * z)
    return 1.0 - math.exp(-z * w0 * t) * (math.cos(wd * t) + (z * w0 / wd) * math.sin(wd * t))


ease = SimpleNamespace(
    out_expo=lambda t: 1.0 if t >= 1.0 else 1.0 - 2.0 ** (-10.0 * t),
    in_out_cubic=lambda t: 4.0 * t**3 if t < 0.5 else 1.0 - (-2.0 * t + 2.0) ** 3 / 2.0,
    spring=_spring,  # takes frames-since-start, not 0..1
)

IMPACT = next(f for f in range(1, 60) if ease.spring(f) >= 1.0)  # first frame at full scale


# --------------------------------------------------------------------------------------
# Fonts and cached text masks
# --------------------------------------------------------------------------------------
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "DejaVuSans-Bold.ttf",
]


def find_font() -> str:
    for cand in FONT_CANDIDATES:
        try:
            ImageFont.truetype(cand, 20)
            return cand
        except OSError:
            continue
    sys.exit("No bold sans-serif font found (tried Liberation Sans Bold, DejaVuSans-Bold, ...)")


FONT = find_font()


class Text:
    """A string rendered once at SS x resolution as an alpha mask.

    Geometry is in 1x px relative to the *baseline-left origin* of the string, so words on
    one line share an exact baseline no matter how tall their individual ink is.
    """

    _cache: dict = {}

    def __init__(self, s: str, size: float):
        self.s, self.size = s, size
        self.font2 = ImageFont.truetype(FONT, int(round(size * SS)))
        l, t, r, b = self.font2.getbbox(s, anchor="ls")
        pad = 2 * SS
        img = Image.new("L", (r - l + 2 * pad, b - t + 2 * pad), 0)
        ImageDraw.Draw(img).text((pad - l, pad - t), s, font=self.font2, fill=255, anchor="ls")
        self.img = img
        self.ox, self.oy = (l - pad) / SS, (t - pad) / SS  # mask top-left vs origin
        self.w, self.h = img.width / SS, img.height / SS
        self.adv = self.font2.getlength(s) / SS
        self.cap = -self.font2.getbbox("H", anchor="ls")[1] / SS
        self._scaled: dict = {}

    @classmethod
    def get(cls, s: str, size: float) -> "Text":
        key = (s, round(size, 3))
        if key not in cls._cache:
            cls._cache[key] = cls(s, size)
        return cls._cache[key]

    def alpha(self, scale: float) -> np.ndarray:
        """Alpha mask at `scale` (1.0 = native 1x), LANCZOS-downsampled from the SS x master."""
        nw, nh = max(1, round(self.w * scale)), max(1, round(self.h * scale))
        key = (nw, nh)
        if key not in self._scaled:
            if len(self._scaled) > 160:
                self._scaled.clear()
            self._scaled[key] = np.asarray(self.img.resize((nw, nh), Image.LANCZOS))
        return self._scaled[key]


def fit_size(s: str, width: float, max_size: float) -> float:
    probe = ImageFont.truetype(FONT, 200)
    return min(max_size, 200.0 * width / probe.getlength(s))


# --------------------------------------------------------------------------------------
# Compositing primitives (all vectorised, region-limited)
# --------------------------------------------------------------------------------------
def blit(buf, alpha, x, y, color, opacity=1.0, clip=None):
    """Alpha-blend `color` through `alpha` (uint8 HxW) with its top-left at (x, y)."""
    h, w = alpha.shape
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, W), min(y + h, H)
    if clip is not None:
        x0, y0, x1, y1 = max(x0, clip[0]), max(y0, clip[1]), min(x1, clip[2]), min(y1, clip[3])
    if x0 >= x1 or y0 >= y1 or opacity <= 0:
        return
    a = alpha[y0 - y : y1 - y, x0 - x : x1 - x].astype(np.float32) * (opacity / 255.0)
    region = buf[y0:y1, x0:x1]
    region[:] = (region + (np.asarray(color, np.float32) - region) * a[..., None] + 0.5).astype(np.uint8)


def draw_text(buf, t: Text, ax, ay, scale=1.0, color=WHITE, opacity=1.0, dx=0.0, dy=0.0,
              clip=None, reveal=None):
    """Draw `t` with its baseline-left origin at (ax, ay), scaled about the screen centre.

    reveal=(p, from_left): show only the leading p fraction of the mask (a clip-path inset).
    """
    x = CX + (ax + t.ox - CX) * scale + dx
    y = CY + (ay + t.oy - CY) * scale + dy
    alpha = t.alpha(scale)
    xi, yi = int(round(x)), int(round(y))
    if reveal is not None:
        p, from_left = reveal
        k = int(round(alpha.shape[1] * p))
        if k <= 0:
            return
        if from_left:
            alpha = alpha[:, :k]
        else:
            alpha = alpha[:, alpha.shape[1] - k :]
            xi += t.alpha(scale).shape[1] - k
    blit(buf, alpha, xi, yi, color, opacity, clip)


def centred_origin(t: Text):
    """Origin that puts the middle of the ink box on the screen centre."""
    return CX - (t.ox + t.w / 2), CY - (t.oy + t.h / 2)


def fill_rect(buf, x0, y0, x1, y1, color, opacity=1.0):
    x0, y0, x1, y1 = max(int(x0), 0), max(int(y0), 0), min(int(x1), W), min(int(y1), H)
    if x0 < x1 and y0 < y1 and opacity > 0:
        reg = buf[y0:y1, x0:x1]
        reg[:] = (reg + (np.asarray(color, np.float32) - reg) * opacity + 0.5).astype(np.uint8)


FULL_R = math.hypot(W / 2, H / 2) + 8


def circle_alpha(radius: float) -> np.ndarray:
    """Anti-aliased filled circle: drawn at SS x, LANCZOS-downsampled."""
    m = Image.new("L", (W * SS, H * SS), 0)
    r = radius * SS
    ImageDraw.Draw(m).ellipse([CX * SS - r, CY * SS - r, CX * SS + r, CY * SS + r], fill=255)
    return np.asarray(m.resize((W, H), Image.LANCZOS))


# --------------------------------------------------------------------------------------
# Static assets, built once before the frame loop
# --------------------------------------------------------------------------------------
hook = Text.get(COPY["hook"], fit_size(COPY["hook"], SAFE_W, 640))
reveal = Text.get(COPY["reveal"], fit_size(COPY["reveal"], SAFE_W, 420))
brand = Text.get(COPY["brand"], fit_size(COPY["brand"], SAFE_W, 380))
HOOK_O, REVEAL_O, BRAND_O = centred_origin(hook), centred_origin(reveal), centred_origin(brand)


def build_lines():
    sizes = [fit_size(s, SAFE_W, 360) for s in COPY["lines"]]
    whole = [Text.get(s, z) for s, z in zip(COPY["lines"], sizes)]
    total = sum(t.cap for t in whole) + STACK_GAP * (len(whole) - 1)
    y = CY - total / 2  # top of the block; every line box is exactly cap-height tall
    lines = []
    for i, (s, t) in enumerate(zip(COPY["lines"], whole)):
        base = y + t.cap
        y = base + STACK_GAP
        x0 = CX - t.adv / 2
        words, letters, cursor = [], [], 0
        for word in s.split(" "):
            start = s.index(word, cursor)
            cursor = start + len(word)
            xw = x0 + t.font2.getlength(s[:start]) / SS
            wt = Text.get(word, sizes[i])
            words.append((wt, xw))
            for k, ch in enumerate(word):
                lx = xw + (wt.font2.getlength(word[: k + 1]) - wt.font2.getlength(ch)) / SS
                letters.append((Text.get(ch, sizes[i]), lx))
        lines.append(SimpleNamespace(base=base, words=words, letters=letters,
                                     color=LIME if i == 1 else WHITE, from_left=(i % 2 == 0)))
    return lines


LINES = build_lines()
LETTERS = [(t, lx, ln.base, ln.color, i) for i, ln in enumerate(LINES) for (t, lx) in ln.letters]
L = len(LETTERS)

# Seeded randomness, all drawn up front from the one generator.
SHAKE = rng.uniform(-1.0, 1.0, (N, 2))
DELAY = rng.integers(0, DELAY_MAX + 1, L) + np.array([li for *_, li in LETTERS]) * LINE_RIPPLE
VX = rng.uniform(-VX_MAX, VX_MAX, L)
VY0 = -rng.uniform(*VY_UP, L)
SPINS = rng.choice([-1.0, 1.0], L) * rng.uniform(*SPIN, L)
GRAIN_POOL = np.rint(rng.normal(0.0, GRAIN_SIGMA, (H + 64, W + 64))).astype(np.int16)
GRAIN_OFF = rng.integers(0, 64, (N, 2))

# Letter trajectories for every frame since the explosion, per letter: velocity and
# acceleration accumulated frame by frame (cumsum == the Euler loop).
FALL_FRAMES = N - T.explode
_k = np.arange(FALL_FRAMES)[None, :]
_air = (_k > DELAY[:, None]).astype(np.float64)  # 1 once the letter has let go
FALL_VY = VY0[:, None] + GRAVITY * np.cumsum(_air, axis=1)  # vy += g per airborne frame
FALL_Y = np.cumsum(FALL_VY * _air, axis=1)  # y += vy
FALL_X = np.cumsum(VX[:, None] * _air, axis=1)
FALL_ROT = np.cumsum(SPINS[:, None] * _air, axis=1)

PUSH_END = 1.05  # slow push-in on the stack, held through the explosion


# --------------------------------------------------------------------------------------
# Scenes
# --------------------------------------------------------------------------------------
def scene_stop(buf, f):
    """Frames 0-90."""
    if f < T.split:
        sp = ease.spring(f)
        scale = (3.0 - 2.0 * sp) * (1.0 + 0.04 * prog(f, IMPACT + 10, T.split - IMPACT - 10))
        draw_text(buf, hook, *HOOK_O, scale=scale, color=WHITE, opacity=clamp01(f / 3.0))
        return

    off = 1150.0 * ease.in_out_cubic(prog(f, T.split, T.split_len))

    # thin accent "laser" along the cut: drawn first (behind everything) and gone within 8
    # frames, so it never reads as a strike-through across the revealed word
    width = W * ease.out_expo(prog(f, T.split, 3))
    fill_rect(buf, CX - width / 2, CY - 3, CX + width / 2, CY + 3, LIME, 1.0 - prog(f, T.split + 3, 5))

    # SCROLLING lives in the gap: band opens with the halves, closes again at the end.
    band = min(off, reveal.cap / 2 * 1.15 * (1.0 - ease.in_out_cubic(prog(f, T.reveal_close, 10))))
    r_scale = (0.9 + 0.1 * ease.out_expo(prog(f, T.split, 20))) * (1.0 + 0.04 * prog(f, T.split + 20, 25))
    draw_text(buf, reveal, *REVEAL_O, scale=r_scale, color=LIME,
              clip=(0, int(CY - band), W, int(math.ceil(CY + band))))

    s = 1.04
    draw_text(buf, hook, *HOOK_O, scale=s, color=WHITE, dy=-off, clip=(0, -10**6, W, int(round(CY - off))))
    draw_text(buf, hook, *HOOK_O, scale=s, color=WHITE, dy=off, clip=(0, int(round(CY + off)), W, 10**6))


def scene_stack(buf, f):
    """Frames 90-270."""
    push = 1.0 + (PUSH_END - 1.0) * prog(f, T.lines, T.explode - T.lines)
    if f < T.explode:
        for i, ln in enumerate(LINES):
            start = T.lines + i * T.line_stagger
            dx = (-SLIDE if ln.from_left else SLIDE) * (1.0 - ease.out_expo(prog(f, start, 16)))
            for w, (wt, xw) in enumerate(ln.words):
                p = ease.out_expo(prog(f, start + w * T.word_stagger, T.mask_len))
                draw_text(buf, wt, xw, ln.base, scale=push, color=ln.color, dx=dx,
                          reveal=(p, ln.from_left))
        return

    k = f - T.explode
    for j, (t, lx, base, color, _li) in enumerate(LETTERS):
        # ink centre at rest (scaled by the held push-in), then the physics offset
        cx = CX + (lx + t.ox + t.w / 2 - CX) * push + FALL_X[j, k]
        cy = CY + (base + t.oy + t.h / 2 - CY) * push + FALL_Y[j, k]
        rimg = t.img.rotate(-FALL_ROT[j, k], resample=Image.BICUBIC, expand=True)  # clockwise
        nw, nh = max(1, round(rimg.width / SS * push)), max(1, round(rimg.height / SS * push))
        if cy - nh / 2 > H or cx + nw / 2 < 0 or cx - nw / 2 > W:
            continue
        alpha = np.asarray(rimg.resize((nw, nh), Image.LANCZOS))
        blit(buf, alpha, int(round(cx - nw / 2)), int(round(cy - nh / 2)), color)


def scene_brand(buf, f):
    """Frames 270-360."""
    if f < T.wipe:
        return
    r = FULL_R * ease.in_out_cubic(prog(f, T.wipe, T.wipe_len))
    if r >= FULL_R:
        buf[:] = LIME
    else:
        a = circle_alpha(r)[..., None].astype(np.float32) / 255.0
        buf[:] = (buf + (np.asarray(LIME, np.float32) - buf) * a + 0.5).astype(np.uint8)
    p = ease.out_expo(prog(f, T.brand, T.brand_len))
    scale = 1.0 + 0.04 * prog(f, T.brand, N - T.brand)
    draw_text(buf, brand, *BRAND_O, scale=scale, color=BLACK, opacity=p, dy=20.0 * (1.0 - p))


# --------------------------------------------------------------------------------------
# Frame assembly and encode
# --------------------------------------------------------------------------------------
def render_frame(buf, f):
    buf[:] = BG
    if f < T.lines:
        scene_stop(buf, f)
    elif f < T.wipe:
        scene_stack(buf, f)
    scene_brand(buf, f)

    # camera shake: +-6px, linear decay over 10 frames from the slam impact
    since = f - IMPACT
    if 0 <= since < 10:
        amp = 6.0 * (1.0 - since / 10.0)
        sx, sy = int(round(SHAKE[f, 0] * amp)), int(round(SHAKE[f, 1] * amp))
        moved = np.empty_like(buf)
        moved[:] = BG
        moved[max(sy, 0) : H + min(sy, 0), max(sx, 0) : W + min(sx, 0)] = \
            buf[max(-sy, 0) : H + min(-sy, 0), max(-sx, 0) : W + min(-sx, 0)]
        buf = moved

    # film grain: a new random crop of the pre-rolled noise every frame
    gy, gx = GRAIN_OFF[f]
    noise = GRAIN_POOL[gy : gy + H, gx : gx + W, None]
    buf = np.clip(buf.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    # 6-frame white flash into the cut
    if f >= FLASH_START:
        a = ease.out_expo(prog(f, FLASH_START - 1, T.flash_len))
        buf = (buf + (255.0 - buf) * a + 0.5).astype(np.uint8)
    return buf


def contact_sheet(frames: dict[int, np.ndarray]) -> None:
    tw, th, gut = 432, 768, 16
    sheet = Image.new("RGB", (len(frames) * tw + (len(frames) + 1) * gut, th + 2 * gut + 18), (58, 58, 58))
    draw = ImageDraw.Draw(sheet)
    for i, (idx, arr) in enumerate(frames.items()):
        x = gut + i * (tw + gut)
        sheet.paste(Image.fromarray(arr).resize((tw, th), Image.LANCZOS), (x, gut))
        draw.text((x, gut + th + 4), f"frame {idx}  ({idx / N:.0%})", fill=(230, 230, 230))
    SHEET.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(SHEET)


def main() -> None:
    if shutil.which("ffmpeg") is None:
        sys.exit("ffmpeg not found on PATH")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(OUT),
    ]
    previews = {min(N - 1, int(N * p)): None for p in PREVIEW_PCTS}
    proc = subprocess.Popen(ffmpeg, stdin=subprocess.PIPE)
    scratch = np.empty((H, W, 3), np.uint8)
    t0 = time.perf_counter()
    try:
        for f in range(N):
            frame = np.ascontiguousarray(render_frame(scratch, f))
            if f in previews:
                previews[f] = frame.copy()
            proc.stdin.write(frame.data)
    except BrokenPipeError:
        pass
    finally:
        if proc.stdin:
            proc.stdin.close()
    code = proc.wait()
    elapsed = time.perf_counter() - t0
    if code != 0:
        sys.exit(f"ffmpeg failed with exit code {code}")

    contact_sheet(previews)
    print(f"Rendered {N} frames in {elapsed:.1f}s ({N / elapsed:.1f} fps incl. encode)")
    print(f"Video:         {OUT}  ({OUT.stat().st_size / 1e6:.1f} MB)")
    print(f"Contact sheet: {SHEET}")


if __name__ == "__main__":
    main()
