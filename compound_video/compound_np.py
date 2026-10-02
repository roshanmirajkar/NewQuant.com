#!/usr/bin/env python3
"""How $1,000 grows with compound vs. simple interest over 30 years: a 25 s explainer.

One self-contained file. Needs numpy, Pillow and an ffmpeg binary, nothing else.
Frames are composed in memory at 2x and piped as raw RGB to ffmpeg; nothing touches disk
except the final MP4 and a contact sheet of three preview frames.

    python3 compound_np.py [out.mp4]
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# ------------------------------------------------------------------ output / style ---
W, H, FPS, S = 1920, 1080, 60, 2  # S = supersample factor of the in-memory "world"
WW, WH = W * S, H * S
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "compound_np.mp4")
rng = np.random.default_rng(7)

BG = (11, 15, 25)  # #0B0F19
GOLD = (245, 183, 0)  # #F5B700
BLUE = (59, 130, 246)  # #3B82F6
INK = (248, 250, 252)
MUTED = (139, 147, 167)
WHITE = (255, 255, 255)

PRINCIPAL, RATE, YEARS, GAP_START = 1000, 0.07, 30, 20
simple = lambda t: PRINCIPAL * (1 + RATE * t)  # noqa: E731
compound = lambda t: PRINCIPAL * (1 + RATE) ** t  # noqa: E731

# ------------------------------------------------------------------------- timing ---
TIMELINE = [  # (beat, seconds); must total 25 s
    ("title_write", 1.6), ("title_hold", 0.4), ("title_shrink", 0.9), ("axes", 1.6),
    ("simple_in", 0.7), ("compound_in", 0.7), ("race", 6.0), ("race_hold", 0.4),
    ("gap_fill", 0.9), ("gap_brace", 0.9), ("gap_hold", 0.8), ("indicate", 1.2),
    ("zoom", 2.6), ("zoom_hold", 0.8), ("reset", 0.9), ("end_write", 0.9),
    ("end_circ", 1.5), ("end_hold", 0.5), ("end_black", 1.0), ("end_tail", 0.7),
]
START, DUR, _f = {}, {}, 0
for _name, _sec in TIMELINE:
    START[_name], DUR[_name] = _f, round(_sec * FPS)
    _f += DUR[_name]
N_FRAMES = _f
assert N_FRAMES == 25 * FPS, N_FRAMES

clamp01 = lambda x: 0.0 if x < 0 else 1.0 if x > 1 else float(x)  # noqa: E731


def prog(frame: int, beat: str) -> float:
    return clamp01((frame - START[beat]) / DUR[beat])


def ease_out_expo(t):
    return 1.0 if t >= 1 else 1 - 2 ** (-10 * t)


def ease_in_out_cubic(t):
    return 4 * t ** 3 if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def spring(t):  # 0 -> ~1 with a little overshoot
    return 0.0 if t <= 0 else 1 - np.exp(-6 * t) * np.cos(9 * t)


# ------------------------------------------------------------------------- layout ---
X0, Y0, XE, YTOP = 300.0, 900.0, 1380.0, 190.0  # chart origin / right end / top (1x px)
PY, PD = (XE - X0) / YEARS, (Y0 - YTOP) / 10_000  # px per year, px per dollar
pt = lambda yr, val: (X0 + yr * PY, Y0 - val * PD)  # noqa: E731
ZOOM = 2.0
w_ = lambda v: int(round(v * S))  # noqa: E731  1x px -> world px

# ------------------------------------------------------------------------- fonts ----
def _find(*paths):
    return next((p for p in paths if os.path.exists(p)), None)


FONT_BOLD = _find("/usr/share/fonts/opentype/inter/Inter-Bold.otf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
FONT_REG = _find("/usr/share/fonts/opentype/inter/Inter-Regular.otf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
assert FONT_BOLD and FONT_REG, "no usable system font"
_fonts, _masks = {}, {}


def font(bold: bool, px: int):
    return _fonts.setdefault((bold, px), ImageFont.truetype(FONT_BOLD if bold else FONT_REG, px))


def text_mask(s: str, px: int, bold=True, anchor="ls"):
    """Cached alpha mask (uint8) plus the offset of its top-left from the anchor point."""
    key = (s, px, bold, anchor)
    if key not in _masks:
        f = font(bold, px)
        l, t, r, b = f.getbbox(s, anchor=anchor)
        im = Image.new("L", (r - l + 4, b - t + 4), 0)
        ImageDraw.Draw(im).text((-l + 2, -t + 2), s, font=f, fill=255, anchor=anchor)
        _masks[key] = (np.asarray(im), l - 2, t - 2)
    return _masks[key]


def rich_text(segs, px: int):
    """RGBA image of coloured segments on one baseline (world px)."""
    f = font(True, px)
    widths = [f.getlength(s) for s, _ in segs]
    asc, desc = f.getmetrics()
    pad = 12
    im = Image.new("RGBA", (int(sum(widths)) + 2 * pad, asc + desc + 2 * pad), (0, 0, 0, 0))
    d, x = ImageDraw.Draw(im), pad
    for (s, col), wd in zip(segs, widths):
        d.text((x, asc + pad), s, font=f, fill=col + (255,), anchor="ls")
        x += wd
    return np.asarray(im)


# ----------------------------------------------------------------------- compositing
def blend(cv, m, color, x, y, op=1.0):
    """Alpha-blend a mask (uint8 0-255 or float 0-1) of one colour onto cv at world (x, y)."""
    h, w = m.shape[:2]
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, WW), min(y + h, WH)
    if x1 <= x0 or y1 <= y0 or op <= 0:
        return
    a = m[y0 - y:y1 - y, x0 - x:x1 - x].astype(np.float32) * (op / 255.0 if m.dtype == np.uint8 else op)
    reg = cv[y0:y1, x0:x1]
    reg[...] = np.clip(reg + (np.asarray(color, np.float32) - reg) * a[..., None] + 0.5, 0, 255)


def blend_rgba(cv, im, x, y, op=1.0):
    h, w = im.shape[:2]
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, WW), min(y + h, WH)
    if x1 <= x0 or y1 <= y0 or op <= 0:
        return
    sub = im[y0 - y:y1 - y, x0 - x:x1 - x]
    a = sub[..., 3:4].astype(np.float32) * (op / 255.0)
    reg = cv[y0:y1, x0:x1]
    reg[...] = np.clip(reg + (sub[..., :3].astype(np.float32) - reg) * a + 0.5, 0, 255)


def put_text(cv, s, px, color, X, Y, anchor="ls", bold=True, op=1.0):
    m, ox, oy = text_mask(s, w_(px), bold, anchor)
    blend(cv, m, color, w_(X) + ox, w_(Y) + oy, op)


def put_text_rot(cv, s, px, color, Xc, Yc, bold=False, op=1.0):
    m = np.rot90(text_mask(s, w_(px), bold, "mm")[0])  # reads bottom-to-top
    blend(cv, m, color, w_(Xc) - m.shape[1] // 2, w_(Yc) - m.shape[0] // 2, op)


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_col(a, b, t):
    return tuple(lerp(x, y, t) for x, y in zip(a, b))


# --------------------------------------------------------------------- static layers
def make_background():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.hypot((xx - W * 0.5) / (W * 0.62), (yy - H * 0.45) / (H * 0.8))
    k = np.clip(1 - d, 0, 1)[..., None] ** 1.6
    lo, hi = np.array(BG, np.float32), np.array((19, 27, 48), np.float32)
    img = lo + (hi - lo) * k + rng.normal(0, 0.6, (H, W, 1)).astype(np.float32)  # dither: no banding
    return np.repeat(np.repeat(np.clip(img, 0, 255).astype(np.uint8), S, 0), S, 1)


def line_mask(points, width_px, round_caps=True):
    """Antialias-by-supersampling stroke of a world-space polyline -> (mask, ox, oy)."""
    pts = np.asarray(points, np.float64)
    pad = int(width_px) + 4
    ox, oy = int(pts[:, 0].min()) - pad, int(pts[:, 1].min()) - pad
    w, h = int(pts[:, 0].max()) - ox + pad, int(pts[:, 1].max()) - oy + pad
    im = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(im)
    xy = [(float(x - ox), float(y - oy)) for x, y in pts]
    d.line(xy, fill=255, width=int(width_px), joint="curve")
    if round_caps:
        r = width_px / 2
        for x, y in (xy[0], xy[-1]):
            d.ellipse((x - r, y - r, x + r, y + r), fill=255)
    return np.asarray(im), ox, oy


def curve_points(fn, y0=0.0, y1=float(YEARS), step=0.05):
    yrs = np.arange(y0, y1 + 1e-9, step)
    return np.array([[w_(pt(t, fn(t))[0]), w_(pt(t, fn(t))[1])] for t in yrs], np.float64)


def brace_points(x, y1, y2, d=20.0, n=14):
    """A '}' brace whose tip points right, as a polyline (1x px)."""
    ym, a = (y1 + y2) / 2, np.linspace(0, np.pi / 2, n)
    seg = [
        np.c_[x - d + d * np.sin(a), y1 + d - d * np.cos(a)],  # top hook
        np.c_[x + d - d * np.cos(a), ym - d + d * np.sin(a)],  # into the tip
        np.c_[x + d - d * np.sin(a), ym + d - d * np.cos(a)],  # out of the tip
        np.c_[x - d + d * np.cos(a), y2 - d + d * np.sin(a)],  # bottom hook
    ]
    return np.vstack(seg)


BG_WORLD = make_background()
BG_1X = BG_WORLD[::S, ::S].copy()

# title (big, centred) and its shrunk resting place
TITLE = rich_text([("The ", INK), ("8th Wonder", GOLD), (" of the World", INK)], w_(96))
TH, TW = TITLE.shape[:2]
T_END = 0.42
T_END_POS = (w_(64), w_(44))  # world px of the shrunk title's top-left
T_SMALL = np.asarray(Image.fromarray(TITLE).resize((round(TW * T_END), round(TH * T_END)), Image.LANCZOS))
CAPTION_Y = 44 + TH * T_END / S + 28  # 1x px, baseline of the caption under the title

# axes strokes
X_AXIS = line_mask([(w_(X0) - 3, w_(Y0)), (w_(XE) + 3, w_(Y0))], w_(3), False)
Y_AXIS = line_mask([(w_(X0), w_(Y0) + 3), (w_(X0), w_(YTOP) - 3)], w_(3), False)
X_TICKS = [line_mask([(w_(pt(t, 0)[0]), w_(Y0)), (w_(pt(t, 0)[0]), w_(Y0) + w_(12))], w_(3), False) for t in range(0, YEARS + 1, 5)]
Y_TICKS = [line_mask([(w_(X0), w_(pt(0, v)[1])), (w_(X0) - w_(12), w_(pt(0, v)[1]))], w_(3), False) for v in range(0, 10_001, 2500)]
GRID = [w_(pt(0, v)[1]) for v in (2500, 5000, 7500, 10_000)]  # faint rows

# curves, fill, brace
CURVE_S = line_mask(curve_points(simple), w_(6))
CURVE_C = line_mask(curve_points(compound), w_(6))
_up = curve_points(compound, GAP_START)
_lo = curve_points(simple, GAP_START)[::-1]
_poly = np.vstack([_up, _lo])
_fx, _fy = int(_poly[:, 0].min()) - 4, int(_poly[:, 1].min()) - 4
_fim = Image.new("L", (int(_poly[:, 0].max()) - _fx + 4, int(_poly[:, 1].max()) - _fy + 4), 0)
ImageDraw.Draw(_fim).polygon([(x - _fx, y - _fy) for x, y in _poly], fill=255)
FILL = (np.asarray(_fim), _fx, _fy)

END_S, END_C = pt(YEARS, simple(YEARS)), pt(YEARS, compound(YEARS))
BRACE_X = XE + 38
BRACE = line_mask(brace_points(BRACE_X, END_C[1] + 14, END_S[1] - 14) * S, w_(4))
GAP_MID_Y = (END_C[1] + END_S[1]) / 2

# end card
END_TEXT = rich_text([("Start ", INK), ("early", GOLD), (".", INK)], w_(150))
ET_H, ET_W = END_TEXT.shape[:2]
_al = np.argwhere(END_TEXT[..., 3] > 40)
ET_X, ET_Y = (WW - ET_W) // 2, (WH - ET_H) // 2
ET_BOX = (ET_X + _al[:, 1].min() - w_(46), ET_Y + _al[:, 0].min() - w_(40), ET_X + _al[:, 1].max() + w_(46), ET_Y + _al[:, 0].max() + w_(40))
_bx = ET_BOX
PERIM = np.vstack([np.c_[np.linspace(_bx[0], _bx[2], 300), np.full(300, _bx[1])], np.c_[np.full(150, _bx[2]), np.linspace(_bx[1], _bx[3], 150)],
                   np.c_[np.linspace(_bx[2], _bx[0], 300), np.full(300, _bx[3])], np.c_[np.full(150, _bx[0]), np.linspace(_bx[3], _bx[1], 150)]])


# --------------------------------------------------------------------- scene pieces --
def draw_title(cv, f):
    wr, sh = prog(f, "title_write"), ease_in_out_cubic(prog(f, "title_shrink"))
    if sh == 0:
        img = TITLE.copy()  # write-on: a soft wipe left to right
        front = ease_in_out_cubic(wr) * (TW + 200)
        a = np.clip((front - np.arange(TW)) / 200, 0, 1)
        img[..., 3] = (img[..., 3] * a[None, :]).astype(np.uint8)
        blend_rgba(cv, img, (WW - TW) // 2, (WH - TH) // 2)
        return
    s = lerp(1.0, T_END, sh)
    sz = (round(TW * s), round(TH * s))
    img = np.asarray(Image.fromarray(TITLE).resize(sz, Image.LANCZOS))
    cx = lerp(WW / 2, T_END_POS[0] + TW * T_END / 2, sh)
    cy = lerp(WH / 2, T_END_POS[1] + TH * T_END / 2, sh)
    blend_rgba(cv, img, round(cx - sz[0] / 2), round(cy - sz[1] / 2))


def draw_axes(cv, p):
    e = ease_in_out_cubic(p)
    r = clamp01(e / 0.7)
    m, ox, oy = X_AXIS
    blend(cv, m[:, :int(m.shape[1] * r)], MUTED, ox, oy)
    for (tm, tx, ty), t in zip(X_TICKS, range(0, YEARS + 1, 5)):
        if (pt(t, 0)[0] - X0) / (XE - X0) <= r:
            blend(cv, tm, MUTED, tx, ty)
    m, ox, oy = Y_AXIS
    rows = int(m.shape[0] * r)
    blend(cv, m[m.shape[0] - rows:], MUTED, ox, oy + m.shape[0] - rows)
    for (tm, tx, ty), v in zip(Y_TICKS, range(0, 10_001, 2500)):
        if (Y0 - pt(0, v)[1]) / (Y0 - YTOP) <= r:
            blend(cv, tm, MUTED, tx, ty)
    for gy in GRID:  # faint gridlines fade in with the labels
        row = np.full((w_(1.5), w_(XE) - w_(X0)), 255, np.uint8)
        blend(cv, row, MUTED, w_(X0), gy - 1, 0.13 * clamp01((e - 0.5) / 0.5))
    la = ease_out_expo(clamp01((p - 0.4) / 0.6))
    for t in range(0, YEARS + 1, 5):
        put_text(cv, str(t), 28, MUTED, pt(t, 0)[0], Y0 + 22, "mt", False, la)
    for v in range(0, 10_001, 2500):
        put_text(cv, f"${v:,}", 28, MUTED, X0 - 20, pt(0, v)[1], "rm", False, la)
    put_text(cv, "Years", 32, INK, (X0 + XE) / 2, Y0 + 70, "mt", False, la)
    put_text_rot(cv, "Value ($)", 32, INK, 100, (Y0 + YTOP) / 2, False, la)
    put_text(cv, f"${PRINCIPAL:,} at {RATE:.0%} a year, {YEARS} years", 30, MUTED, 66, CAPTION_Y, "ls", False, la)


def draw_dot(cv, cx, cy, r, color, glow=0.0):
    X, Y, R = cx * S, cy * S, r * S
    if R <= 0:
        return
    if glow:
        sg = 20 * S
        n = int(sg * 3)
        gy, gx = np.mgrid[-n:n + 1, -n:n + 1].astype(np.float32)
        blend(cv, np.exp(-((gx - (X % 1)) ** 2 + (gy - (Y % 1)) ** 2) / (2 * sg ** 2)).astype(np.float32), color, int(X) - n, int(Y) - n, 0.30 * glow)
    n = int(R + 8)
    gy, gx = np.mgrid[-n:n + 1, -n:n + 1].astype(np.float32)
    d = np.hypot(gx - (X % 1), gy - (Y % 1))
    ox, oy = int(X) - n, int(Y) - n
    blend(cv, np.clip(R + 6 + 0.5 - d, 0, 1), BG, ox, oy, 0.9)  # dark halo separates dot from line
    blend(cv, np.clip(R + 0.5 - d, 0, 1), color, ox, oy)


def draw_series(cv, f, name, fn, color, side, intro, yrs, ind):
    p = prog(f, intro)
    if p <= 0:
        return
    x, y = pt(yrs, fn(yrs))
    draw_dot(cv, x, y, 9 * max(spring(p), 0), color, glow=ease_out_expo(p))
    txt = f"${fn(yrs):,.0f}"
    px = 44 * (1 + 0.25 * ind)
    col = lerp_col(color, WHITE, ind)
    m, ox, oy = text_mask(txt, w_(round(px)), True, "ls")
    m0, ox0, oy0 = text_mask(txt, w_(44), True, "ls")  # scale about the unscaled label centre
    bx = x + 24
    by = y - 12 if side > 0 else y + 12 + 33
    cxw, cyw = w_(bx) + ox0 + m0.shape[1] / 2, w_(by) + oy0 + m0.shape[0] / 2
    blend(cv, m, col, round(cxw - m.shape[1] / 2), round(cyw - m.shape[0] / 2), ease_out_expo(p))


def draw_legend(cv, f, name, color, row, intro):
    p = ease_out_expo(prog(f, intro))
    if p <= 0:
        return
    y = YTOP + 50 + 50 * row
    blend(cv, np.full((w_(6), w_(54)), 255, np.uint8), color, w_(X0 + 40), w_(y - 10), p)
    put_text(cv, f"{name} interest · {RATE:.0%}", 32, color, X0 + 108, y, "ls", False, p)


def draw_gap_labels(cv, f):
    p = ease_in_out_cubic(prog(f, "gap_brace"))
    if p <= 0:
        return
    m, ox, oy = BRACE
    rows = int(m.shape[0] * p)
    blend(cv, m[:rows], GOLD, ox, oy)
    put_text(cv, "The compounding gap", 38, GOLD, BRACE_X + 20 + 18, GAP_MID_Y + 13, "ls", True, clamp01((p - 0.3) / 0.7))


def circumscribe(cv, p):
    head = p * 1.35
    s0, s1 = max(head - 0.35, 0.0), min(head, 1.0)
    if s1 <= s0:
        return
    seg = PERIM[int(s0 * (len(PERIM) - 1)):int(s1 * (len(PERIM) - 1)) + 1]
    m, ox, oy = line_mask(seg, w_(5))
    blend(cv, m, GOLD, ox, oy)


# ------------------------------------------------------------------------ frame loop
class Stage:
    """Persistent world buffers so the curves are blended in incrementally, not redrawn."""

    def __init__(self):
        t = BG_WORLD.copy()
        blend_rgba(t, T_SMALL, *T_END_POS)
        self.p_title = t
        self.p0 = t.copy()
        draw_axes(self.p0, 1.0)  # everything static once the axes beat is done
        self.p = self.p0.copy()  # + curves as the race progresses
        self.q = None  # + gap fill, curves redrawn on top
        self.cols = 0

    def advance_race(self, yrs, done):
        ox = CURVE_S[1]
        w = CURVE_S[0].shape[1]
        cols = w if done else int(np.clip(w_(X0 + yrs / YEARS * (XE - X0)) - ox, 0, w))
        if cols > self.cols:
            for (m, mx, my), col in ((CURVE_S, BLUE), (CURVE_C, GOLD)):
                lo, hi = self.cols - (mx - ox), cols - (mx - ox)
                lo, hi = max(lo, 0), min(hi, m.shape[1])
                if hi > lo:
                    blend(self.p, m[:, lo:hi], col, mx + lo, my)
            self.cols = cols

    def build_q(self):
        q = self.p0.copy()
        blend(q, FILL[0], GOLD, FILL[1], FILL[2], 0.28)
        for (m, mx, my), col in ((CURVE_S, BLUE), (CURVE_C, GOLD)):
            blend(q, m, col, mx, my)
        self.q = q


def camera_box(cam):
    z = ZOOM ** cam
    fx, fy = END_S[0] + 150, (END_S[1] + END_C[1]) / 2
    cx, cy = lerp(W / 2, fx, cam) * S, lerp(H / 2, fy, cam) * S
    hw, hh = W * S / z / 2, H * S / z / 2
    cx, cy = float(np.clip(cx, hw, WW - hw)), float(np.clip(cy, hh, WH - hh))  # stay inside the buffer
    return (cx - hw, cy - hh, cx + hw, cy + hh)


def render_frame(stage, f):
    in_end = f >= START["end_write"]
    if in_end:
        cv = BG_WORLD.copy()
        wp = ease_in_out_cubic(prog(f, "end_write"))
        img = END_TEXT.copy()
        a = np.clip((wp * (ET_W + 200) - np.arange(ET_W)) / 200, 0, 1)
        img[..., 3] = (img[..., 3] * a[None, :]).astype(np.uint8)
        blend_rgba(cv, img, ET_X, ET_Y)
        circumscribe(cv, prog(f, "end_circ"))
        box = (0, 0, WW, WH)
        fade = 0.0
    else:
        yrs = YEARS * prog(f, "race")
        if f < START["axes"]:
            cv = BG_WORLD.copy()
            draw_title(cv, f)
        elif prog(f, "axes") < 1:
            cv = stage.p_title.copy()
            draw_axes(cv, prog(f, "axes"))
        else:
            gp = prog(f, "gap_fill")
            if gp == 0:
                stage.advance_race(yrs, prog(f, "race") >= 1)
                cv = stage.p.copy()
            else:
                if stage.q is None:
                    stage.build_q()
                cv = stage.q.copy()
                if gp < 1:  # FadeIn: cross-fade only inside the fill's bounding box
                    m, mx, my = FILL
                    sl = (slice(my, my + m.shape[0]), slice(mx, mx + m.shape[1]))
                    e = ease_in_out_cubic(gp)
                    cv[sl] = (stage.p[sl].astype(np.float32) * (1 - e) + stage.q[sl].astype(np.float32) * e + 0.5).astype(np.uint8)
            ind = np.sin(np.pi * prog(f, "indicate"))
            draw_legend(cv, f, "Compound", GOLD, 0, "compound_in")
            draw_legend(cv, f, "Simple", BLUE, 1, "simple_in")
            draw_series(cv, f, "Simple", simple, BLUE, -1, "simple_in", yrs, ind)
            draw_series(cv, f, "Compound", compound, GOLD, +1, "compound_in", yrs, ind)
            draw_gap_labels(cv, f)
        rs = prog(f, "reset")
        cam = ease_in_out_cubic(prog(f, "zoom")) if rs == 0 else 1 - ease_in_out_cubic(rs)
        box = camera_box(cam)
        fade = ease_in_out_cubic(rs)
    out = np.asarray(Image.fromarray(cv).resize((W, H), Image.LANCZOS, box=box))
    if fade > 0:
        out = (out * (1 - fade) + BG_1X * fade + 0.5).astype(np.uint8)
    k = prog(f, "end_black")
    if k > 0:
        out = (out * (1 - k) + 0.5).astype(np.uint8)
    return out


def main():
    ffmpeg = shutil.which("ffmpeg")
    assert ffmpeg, "ffmpeg binary not found"
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    cmd = [ffmpeg, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    previews = {int(N_FRAMES * q): None for q in (0.25, 0.5, 0.9)}
    stage, last_key, last = Stage(), None, None
    t0 = time.time()
    for f in range(N_FRAMES):
        key = tuple(prog(f, b) for b, _ in TIMELINE)
        if key != last_key:  # nothing moved since the previous frame: reuse its bytes
            last = render_frame(stage, f)
            last_key, raw = key, last.tobytes()
        proc.stdin.write(raw)
        if f in previews:
            previews[f] = last.copy()
        if f % 150 == 0:
            print(f"  frame {f}/{N_FRAMES}  {time.time() - t0:5.1f}s", flush=True)
    proc.stdin.close()
    err = proc.stderr.read().decode()
    assert proc.wait() == 0, err
    elapsed = time.time() - t0

    sheet = Image.new("RGB", (W, H), (30, 30, 30))
    for i, (f, arr) in enumerate(sorted(previews.items())):
        sheet.paste(Image.fromarray(arr).resize((W // 2, H // 2), Image.LANCZOS), ((i % 2) * W // 2, (i // 2) * H // 2))
    sheet_path = os.path.splitext(OUT)[0] + "_contact.png"
    sheet.save(sheet_path)
    print(f"render time: {elapsed:.1f}s  ({N_FRAMES} frames, {FPS} fps, {N_FRAMES / FPS:.2f}s)")
    print(f"output: {os.path.abspath(OUT)}")
    print(f"contact sheet (frames {sorted(previews)}): {os.path.abspath(sheet_path)}")


if __name__ == "__main__":
    main()
