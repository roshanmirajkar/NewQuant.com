"""Layout QA for compound.py: stills at the busiest moments plus a geometric collision audit.

    manim -qh -s qa_frames.py ChartFrame            # full chart, all labels + brace visible
    manim -qh -s qa_frames.py ZoomFrame             # zoomed on the endpoint
    manim -qh -s -r 1080,1920 qa_frames.py ChartFrame   # ...and the vertical versions

The last frame of the real scene is pure black (the video fades to black), so ``-s`` on
CompoundStory itself shows nothing useful. These subclasses run the real beats, audit the
layout, and stop early so ``-s`` captures a meaningful frame.

The audit prints any text that overlaps other text, touches a curve / axis / dot / brace,
or is clipped by the camera frame. During the race the labels move, so they are checked at
a series of sample times, not just the final frame.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from manim import *

from compound import CompoundStory, YEARS

TEXT_GAP = 0.03  # min clear space between two pieces of text
CURVE_GAP = 0.07  # text to a curve's centre line (curve is ~0.06 thick)
AXIS_GAP = 0.05  # text to an axis line
DOT_GAP = 0.03  # text to the edge of a dot
EDGE_GAP = 0.15  # text to the camera frame edge
DOT_R = 0.115  # radius + halo


@dataclass
class Rect:
    l: float
    b: float
    r: float
    t: float

    @classmethod
    def of(cls, m: Mobject) -> "Rect":
        return cls(m.get_left()[0], m.get_bottom()[1], m.get_right()[0], m.get_top()[1])


def rect_gap(a: Rect, b: Rect) -> float:
    """Clear distance between two rects; negative when they overlap."""
    dx = max(b.l - a.r, a.l - b.r)
    dy = max(b.b - a.t, a.b - b.t)
    return max(dx, dy) if dx < 0 and dy < 0 else float(np.hypot(max(dx, 0), max(dy, 0)))


def points_gap(rect: Rect, pts: np.ndarray) -> float:
    dx = np.maximum.reduce([rect.l - pts[:, 0], np.zeros(len(pts)), pts[:, 0] - rect.r])
    dy = np.maximum.reduce([rect.b - pts[:, 1], np.zeros(len(pts)), pts[:, 1] - rect.t])
    return float(np.hypot(dx, dy).min())


class QAStory(CompoundStory):
    """The real story, plus an ``audit`` you can call at any point."""

    audit_log: list

    def texts(self) -> dict:
        items = {"title": self.title}
        x_ticks, y_ticks, x_title, y_title, caption = self.chart_labels
        items.update({f"x_tick[{i}]": m for i, m in enumerate(x_ticks)})
        items.update({f"y_tick[{i}]": m for i, m in enumerate(y_ticks)})
        items.update({"x_title": x_title, "y_title": y_title, "caption": caption})
        for s in (self.simple_s, self.compound_s):
            items[f"{s.name}_label"] = s.label
            items[f"{s.name}_legend"] = s.legend[1]
        if hasattr(self, "gap"):
            items["gap_label"] = self.gap[2]
        return items

    def obstacles(self) -> dict:
        ax = self.axes
        sample = lambda a, b: np.linspace(a, b, 200)  # noqa: E731
        xs, ys = ax.x_axis, ax.y_axis
        obs = {
            "x_axis": (np.array([a for a in sample(xs.get_start(), xs.get_end())]), AXIS_GAP),
            "y_axis": (np.array([a for a in sample(ys.get_start(), ys.get_end())]), AXIS_GAP),
        }
        for s in (self.simple_s, self.compound_s):
            obs[f"{s.name}_curve"] = (s.line.points, CURVE_GAP)
            obs[f"{s.name}_dot"] = (s.dot.get_center()[None, :], DOT_R + DOT_GAP)
        if hasattr(self, "gap"):
            obs["brace"] = (self.gap[1].points, 0.04)
        return obs

    def audit(self, tag: str, frame: Mobject | None = None) -> list:
        texts = {k: Rect.of(v) for k, v in self.texts().items()}
        problems = []

        names = list(texts)
        for i, a in enumerate(names):
            for b in names[i + 1 :]:
                gap = rect_gap(texts[a], texts[b])
                if gap < TEXT_GAP:
                    problems.append(f"text/text  {a} x {b}: gap {gap:+.3f}")

        for oname, (pts, need) in self.obstacles().items():
            for name, rect in texts.items():
                gap = points_gap(rect, pts)
                if gap < need:
                    problems.append(f"text/{oname}  {name}: gap {gap:+.3f} < {need:.3f}")

        if frame is not None:
            fr = Rect.of(frame)
            for name, r in texts.items():
                inside = r.l >= fr.l and r.r <= fr.r and r.b >= fr.b and r.t <= fr.t
                outside = r.r < fr.l or r.l > fr.r or r.t < fr.b or r.b > fr.t
                if outside:
                    continue
                if not inside:
                    problems.append(f"clipped    {name} straddles the frame edge")
                else:
                    edge = min(r.l - fr.l, fr.r - r.r, r.b - fr.b, fr.t - r.t)
                    if edge < EDGE_GAP:
                        problems.append(f"edge       {name}: {edge:.3f} from frame edge")

        self.audit_log.append((tag, problems))
        print(f"[audit] {tag}: " + ("OK" if not problems else f"{len(problems)} problem(s)"))
        for p in problems:
            print(f"        - {p}")
        return problems

    def setup(self):
        super().setup()
        self.audit_log = []

    # sample the labels at many moments of the race, not just the end
    def race(self):
        a, b = self.simple_s, self.compound_s
        for y in (0, 0.25, 0.5, 1, 2, 3, 5, 7.5, 10, 15, 20, 25, 28, 29.5, YEARS):
            a.years.set_value(y)
            b.years.set_value(y)
            self.update_mobjects(0)
            self.audit(f"race, year {y:g}", self.camera.frame)
        super().race()

    def reveal_gap(self):
        super().reveal_gap()
        self.audit("gap revealed (full chart)", self.camera.frame)


class ChartFrame(QAStory):
    """Stops once the whole chart is on screen (brace, gap label, both end values)."""

    def zoom_to_endpoint(self):
        pass

    def end_card(self):
        pass


class ZoomFrame(QAStory):
    """Stops on the zoomed endpoint shot."""

    def zoom_to_endpoint(self):
        super().zoom_to_endpoint()
        self.audit("zoomed endpoint", self.camera.frame)

    def end_card(self):
        pass
