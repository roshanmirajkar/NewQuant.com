"""How $1,000 grows with compound vs. simple interest over 30 years (25 s explainer).

Render (horizontal, then vertical):

    manim -qh --fps 60 compound.py CompoundStory
    manim -qh --fps 60 -r 1080,1920 compound.py CompoundStory

Needs the "Inter" font installed (``fonts-inter`` on Debian/Ubuntu). No LaTeX needed:
all text, including the live number labels, is drawn with ``Text(font="Inter")``.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from manim import *

# --- style ---------------------------------------------------------------------------
BG = "#0B0F19"
GOLD = "#F5B700"
BLUE = "#3B82F6"
INK = "#F8FAFC"  # primary text
MUTED = "#8B93A7"  # axes, ticks, captions
FONT = "Inter"

# --- the maths -----------------------------------------------------------------------
PRINCIPAL = 1_000
RATE = 0.07
YEARS = 30
GAP_START = 20  # the shaded gap begins where the curves have clearly pulled apart


def simple(years: float) -> float:
    return PRINCIPAL * (1 + RATE * years)


def compound(years: float) -> float:
    return PRINCIPAL * (1 + RATE) ** years


# --- timeline (seconds). Every self.play / self.wait below reads from here. -----------
_NOMINAL = {
    "title_write": 1.6,
    "title_hold": 0.4,
    "title_shrink": 0.9,
    "axes": 1.6,
    "simple_in": 0.7,
    "compound_in": 0.7,
    "race": 6.0,  # both dots travel 0 -> 30 years together
    "race_hold": 0.4,
    "gap_fill": 0.9,
    "gap_brace": 0.9,
    "gap_hold": 0.8,
    "indicate": 1.2,
    "zoom": 2.6,
    "zoom_hold": 0.8,
    "reset": 0.9,
    "end_write": 0.9,
    "end_circumscribe": 1.5,
    "end_hold": 0.5,
    "end_black": 1.0,
    "end_tail": 0.7,
}
assert round(sum(_NOMINAL.values()), 6) == 25.0, f"timeline is {sum(_NOMINAL.values()):.2f}s, not 25s"

# Manim sizes an animation with np.arange(0, run_time, 1/fps), so float error can add a
# frame (0.9 s at 60 fps -> 55 frames, not 54). Shave a hair off so each beat is exactly
# run_time * fps frames and the video really is 25.00 s.
T = {beat: seconds - 1e-6 for beat, seconds in _NOMINAL.items()}


# --- layouts -------------------------------------------------------------------------
@dataclass(frozen=True)
class Layout:
    """All the numbers that differ between the 16:9 and 9:16 renders."""

    frame_width: float
    frame_height: float
    title_text: str
    title_size: int
    title_shrink: float
    corner_buff: float
    caption_size: int
    origin: tuple[float, float]  # where (0 years, $0) sits on screen
    x_len: float
    y_len: float
    tick_size: int
    axis_title_size: int
    legend_size: int
    label_size: int
    gap_size: int
    gap_label_rotated: bool
    zoom_scale: float
    zoom_dx: float  # zoom centre, to the right of the gap's midpoint
    end_size: int


LANDSCAPE = Layout(
    frame_width=8 * 16 / 9,
    frame_height=8.0,
    title_text="The 8th Wonder of the World",
    title_size=60,
    title_shrink=0.42,
    corner_buff=0.4,
    caption_size=20,
    origin=(-4.9, -2.7),
    x_len=7.6,
    y_len=5.4,
    tick_size=20,
    axis_title_size=22,
    legend_size=22,
    label_size=26,
    gap_size=22,
    gap_label_rotated=False,
    zoom_scale=0.5,
    zoom_dx=1.6,
    end_size=84,
)

PORTRAIT = Layout(
    frame_width=8.0,
    frame_height=8 * 16 / 9,
    title_text="The 8th Wonder\nof the World",
    title_size=54,
    title_shrink=0.5,
    corner_buff=0.6,
    caption_size=20,
    origin=(-1.85, -4.9),
    x_len=4.2,
    y_len=9.4,
    tick_size=20,
    axis_title_size=22,
    legend_size=20,
    label_size=26,
    gap_size=22,
    gap_label_rotated=True,
    zoom_scale=0.55,
    zoom_dx=0.5,
    end_size=84,
)


# --- helpers -------------------------------------------------------------------------
def label_text(string: str, size: int, color: str = INK, **kwargs) -> Text:
    return Text(string, font=FONT, font_size=size, color=color, **kwargs)


class MoneyLabel(DecimalNumber):
    """A live ``DecimalNumber`` drawn with Inter via Pango, so no LaTeX is required.

    The stock class builds each glyph separately (as LaTeX); here the whole "$7,612"
    string is one ``Text`` so the baseline and kerning stay right as the digits change.
    """

    def __init__(self, number: float = 0, **kwargs):
        kwargs.setdefault("num_decimal_places", 0)
        super().__init__(number, mob_class=Text, **kwargs)

    def _set_submobjects_from_number(self, number: float) -> None:
        self.number = number
        self.submobjects = []
        text = Text(
            "$" + self._get_num_string(number),
            font=FONT,
            weight=BOLD,
            font_size=self._font_size,
        )
        self.add(*text.submobjects)
        self.move_to(ORIGIN)
        self.initial_height = self.height  # keeps DecimalNumber.font_size consistent


@dataclass
class Series:
    """One growth curve: a tracker, the line drawn so far, its dot and its live label."""

    name: str
    fn: callable
    color: str
    side: int  # +1: label sits above-right of the dot, -1: below-right
    years: ValueTracker
    line: Mobject
    dot: Dot
    label: MoneyLabel
    legend: VGroup


class CompoundStory(MovingCameraScene):
    def __init__(self, *args, **kwargs):
        # Manim keeps a 16:9 frame even for -r 1080,1920, which would squash the picture.
        # Pick the layout from the pixel aspect and set the frame to match *before* the
        # camera is built. Both layouts use ~135 px per unit, so type is the same size.
        self.layout = PORTRAIT if config.pixel_height > config.pixel_width else LANDSCAPE
        config.frame_width = self.layout.frame_width
        config.frame_height = self.layout.frame_height
        config.background_color = BG
        super().__init__(*args, **kwargs)

    def construct(self):
        self.title_card()
        self.draw_axes()
        self.introduce_simple()
        self.introduce_compound()
        self.race()
        self.reveal_gap()
        self.zoom_to_endpoint()
        self.end_card()

    # -- 1. title ----------------------------------------------------------------------
    def title_card(self):
        L = self.layout
        title = label_text(
            L.title_text,
            L.title_size,
            weight=BOLD,
            t2c={"8th Wonder": GOLD},
            line_spacing=0.9,
        )
        self.play(Write(title), run_time=T["title_write"])
        self.wait(T["title_hold"])
        self.play(
            title.animate.scale(L.title_shrink).to_corner(UL, buff=L.corner_buff),
            run_time=T["title_shrink"],
        )
        self.title = title

    # -- 2. axes -----------------------------------------------------------------------
    def draw_axes(self):
        L = self.layout
        axes = Axes(
            x_range=[0, YEARS, 5],
            y_range=[0, 10_000, 2_500],
            x_length=L.x_len,
            y_length=L.y_len,
            tips=False,
            axis_config={
                "color": MUTED,
                "stroke_width": 3,
                "include_numbers": False,
                "tick_size": 0.08,
            },
        )
        axes.shift(np.array([*L.origin, 0]) - axes.c2p(0, 0))

        x_ticks = VGroup(
            *(
                label_text(str(x), L.tick_size, MUTED).next_to(axes.c2p(x, 0), DOWN, buff=0.22)
                for x in range(0, YEARS + 1, 5)
            )
        )
        y_ticks = VGroup(
            *(
                label_text(f"${y:,}", L.tick_size, MUTED).next_to(axes.c2p(0, y), LEFT, buff=0.22)
                for y in range(0, 10_001, 2_500)
            )
        )
        x_title = label_text("Years", L.axis_title_size, INK).next_to(x_ticks, DOWN, buff=0.25)
        x_title.set_x(axes.c2p(YEARS / 2, 0)[0])
        y_title = label_text("Value ($)", L.axis_title_size, INK).rotate(PI / 2)
        y_title.next_to(y_ticks, LEFT, buff=0.25).set_y(axes.c2p(0, 5_000)[1])

        caption = label_text(
            f"${PRINCIPAL:,} at {RATE:.0%} a year, {YEARS} years", L.caption_size, MUTED
        )
        caption.next_to(self.title, DOWN, buff=0.12, aligned_edge=LEFT)

        self.axes = axes
        self.chart_labels = VGroup(x_ticks, y_ticks, x_title, y_title, caption)
        self.play(
            Create(axes),
            Write(x_title),
            Write(y_title),
            FadeIn(x_ticks, y_ticks, caption),
            run_time=T["axes"],
        )

    # -- 3 & 4. the two curves ---------------------------------------------------------
    def make_series(self, name, fn, color, side, legend_row) -> Series:
        L, axes = self.layout, self.axes
        years = ValueTracker(0)

        def head():  # screen position of the dot
            return axes.c2p(years.get_value(), fn(years.get_value()))

        line = always_redraw(
            lambda: axes.plot(
                fn,
                x_range=[0, max(years.get_value(), 0.1), 0.1],
                color=color,
                stroke_width=6,
            )
        )
        dot = Dot(head(), radius=0.1, color=color).set_stroke(BG, width=3)
        label = MoneyLabel(fn(0), font_size=L.label_size, color=color)
        self.place_label(label, head(), side)

        swatch = Line(ORIGIN, RIGHT * 0.45, color=color, stroke_width=6)
        words = label_text(f"{name} interest · {RATE:.0%}", L.legend_size, color)
        legend = VGroup(swatch, words).arrange(RIGHT, buff=0.18)
        top_left = axes.c2p(0, 10_000) + RIGHT * 0.25 + DOWN * (0.3 + 0.42 * legend_row)
        legend.move_to(top_left, aligned_edge=UL)

        return Series(name, fn, color, side, years, line, dot, label, legend)

    @staticmethod
    def place_label(label: MoneyLabel, point, side: int) -> None:
        """Left edge just right of the dot; above it for +1, below it for -1."""
        x = point[0] + 0.22 + label.width / 2
        y = point[1] + side * (0.07 + label.height / 2)
        label.move_to([x, y, 0])

    def go_live(self, s: Series) -> None:
        """Hand the dot and label over to the tracker (after their intro FadeIn)."""
        axes = self.axes
        s.dot.add_updater(lambda d: d.move_to(axes.c2p(s.years.get_value(), s.fn(s.years.get_value()))))

        def follow(label):
            y = s.years.get_value()
            label.set_value(s.fn(y))
            self.place_label(label, axes.c2p(y, s.fn(y)), s.side)

        s.label.add_updater(follow)

    def introduce_simple(self):
        self.simple_s = s = self.make_series("Simple", simple, BLUE, side=-1, legend_row=1)
        self.add(s.line)
        self.play(FadeIn(s.dot, scale=0.5), FadeIn(s.label), FadeIn(s.legend), run_time=T["simple_in"])
        self.go_live(s)

    def introduce_compound(self):
        self.compound_s = s = self.make_series("Compound", compound, GOLD, side=+1, legend_row=0)
        self.add(s.line)
        self.play(FadeIn(s.dot, scale=0.5), FadeIn(s.label), FadeIn(s.legend), run_time=T["compound_in"])
        self.go_live(s)

    def race(self):
        a, b = self.simple_s, self.compound_s
        self.play(
            a.years.animate.set_value(YEARS),
            b.years.animate.set_value(YEARS),
            run_time=T["race"],
            rate_func=linear,
        )
        # Freeze everything at 30 years so the later beats can fade / flash / zoom it.
        for m in (a.line, a.dot, a.label, b.line, b.dot, b.label):
            m.clear_updaters()
        self.wait(T["race_hold"])

    # -- 5. the gap --------------------------------------------------------------------
    def reveal_gap(self):
        L, axes = self.layout, self.axes
        xs = np.linspace(GAP_START, YEARS, 80)
        upper = [axes.c2p(x, compound(x)) for x in xs]
        lower = [axes.c2p(x, simple(x)) for x in xs[::-1]]
        fill = Polygon(*upper, *lower, stroke_width=0, fill_color=GOLD, fill_opacity=0.28)
        fill.set_z_index(-1)  # tint sits behind the curves

        end_simple = axes.c2p(YEARS, simple(YEARS))
        end_compound = axes.c2p(YEARS, compound(YEARS))
        brace = Brace(Line(end_simple, end_compound), direction=RIGHT, color=GOLD, buff=0.15)
        text = label_text("The compounding gap", L.gap_size, GOLD, weight=BOLD)
        if L.gap_label_rotated:
            text.rotate(PI / 2)
        text.next_to(brace.get_tip(), RIGHT, buff=0.15)

        self.gap = VGroup(fill, brace, text)
        self.play(FadeIn(fill), run_time=T["gap_fill"])
        self.play(Create(brace), Write(text), run_time=T["gap_brace"])
        self.wait(T["gap_hold"])

    # -- 6. flash the final values and zoom --------------------------------------------
    def zoom_to_endpoint(self):
        L, axes = self.layout, self.axes
        a, b = self.simple_s, self.compound_s
        self.play(
            Indicate(a.label, color=INK, scale_factor=1.2),
            Indicate(b.label, color=INK, scale_factor=1.2),
            run_time=T["indicate"],
        )
        frame = self.camera.frame
        frame.save_state()
        mid = (axes.c2p(YEARS, simple(YEARS)) + axes.c2p(YEARS, compound(YEARS))) / 2
        self.play(
            frame.animate.scale(L.zoom_scale).move_to(mid + RIGHT * L.zoom_dx),
            run_time=T["zoom"],
        )
        self.wait(T["zoom_hold"])

    # -- 7. end card -------------------------------------------------------------------
    def end_card(self):
        L = self.layout
        frame = self.camera.frame
        self.play(
            FadeOut(*[m for m in self.mobjects if m is not frame]),
            Restore(frame),
            run_time=T["reset"],
        )
        end = label_text("Start early.", L.end_size, weight=BOLD, t2c={"early": GOLD})
        self.play(Write(end), run_time=T["end_write"])
        self.play(Circumscribe(end, color=GOLD, buff=0.35), run_time=T["end_circumscribe"])
        self.wait(T["end_hold"])
        black = Rectangle(
            width=L.frame_width * 1.1,
            height=L.frame_height * 1.1,
            fill_color=BLACK,
            fill_opacity=1,
            stroke_width=0,
        )
        self.play(FadeIn(black), run_time=T["end_black"])
        self.wait(T["end_tail"])
