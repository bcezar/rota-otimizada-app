from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SIZE = 1024
SCALE = 3
NAVY = "#172D68"
BLUE = "#2674E8"
GREEN = "#08A87A"
PAPER = "#F7FAFE"
MAP = "#E7EDF5"
WHITE = "#FFFFFF"


def cubic(p0, p1, p2, p3, steps=30):
    points = []
    for index in range(steps + 1):
        t = index / steps
        u = 1 - t
        points.append((
            u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1],
        ))
    return points


def scaled(points):
    return [(round(x * SCALE), round(y * SCALE)) for x, y in points]


def draw_pin(draw, cx, top, radius, color, hole_color, outline=None):
    tip = (cx, top + radius * 2.16)
    left = (cx - radius, top + radius)
    right = (cx + radius, top + radius)
    points = cubic(tip, (cx - radius * 0.18, top + radius * 1.93), (cx - radius, top + radius * 1.42), left)
    arc = [
        (cx + radius * math.cos(math.radians(angle)),
         top + radius + radius * math.sin(math.radians(angle)))
        for angle in range(180, 361, 4)
    ]
    points += arc[1:]
    points += cubic(right, (cx + radius, top + radius * 1.42), (cx + radius * 0.18, top + radius * 1.93), tip)[1:]
    draw.polygon(scaled(points), fill=color)
    if outline:
        draw.line(scaled(points + points[:1]), fill=outline, width=8 * SCALE, joint="curve")
    hole_radius = radius * 0.34
    center_y = top + radius * 0.82
    draw.ellipse((round((cx-hole_radius)*SCALE), round((center_y-hole_radius)*SCALE),
                  round((cx+hole_radius)*SCALE), round((center_y+hole_radius)*SCALE)), fill=hole_color)


def draw_symbol(image, *, include_map=False, mono=False):
    draw = ImageDraw.Draw(image)
    if include_map:
        map_color = (231, 237, 245, 190)
        routes = [
            [(20, 180), (205, 240), (300, 360), (175, 470), (42, 580)],
            [(338, 0), (370, 145), (280, 270), (420, 400), (300, 530), (452, 660), (300, 820), (365, 1024)],
            [(720, 0), (660, 155), (790, 270), (645, 405), (815, 525), (675, 650), (875, 790), (790, 1024)],
            [(0, 810), (175, 735), (330, 865), (515, 760), (710, 850), (1024, 720)],
            [(0, 360), (160, 315), (310, 385), (468, 310), (625, 375), (780, 300), (1024, 365)],
        ]
        for route in routes:
            draw.line(scaled(route), fill=map_color, width=8*SCALE, joint="curve")

    line_color = WHITE if mono else NAVY
    route_segments = [
        ((220, 698), (300, 682), (342, 790), (423, 790)),
        ((423, 790), (502, 790), (557, 640), (598, 568)),
        ((598, 568), (644, 500), (520, 462), (563, 380)),
        ((563, 380), (632, 306), (702, 425), (780, 358)),
    ]
    visible_route = []
    for segment in route_segments:
        visible_route.extend(cubic(*segment, steps=32)[:-1])
    visible_route.append(route_segments[-1][-1])
    draw.line(scaled(visible_route), fill=line_color, width=36*SCALE, joint="curve")
    for x, y in (route_segments[0][0], route_segments[-1][-1]):
        r = 21*SCALE
        draw.ellipse((round(x*SCALE-r), round(y*SCALE-r), round(x*SCALE+r), round(y*SCALE+r)), fill=line_color)

    node_fill = WHITE if mono else PAPER
    node_outline = WHITE if mono else NAVY
    for cx, cy, radius in ((423, 790, 38), (598, 568, 38), (563, 380, 36)):
        r = radius*SCALE
        draw.ellipse((round(cx*SCALE-r), round(cy*SCALE-r), round(cx*SCALE+r), round(cy*SCALE+r)),
                     fill=node_outline)
        inner = (radius-11)*SCALE
        draw.ellipse((round(cx*SCALE-inner), round(cy*SCALE-inner), round(cx*SCALE+inner), round(cy*SCALE+inner)),
                     fill=node_fill)

    start = BLUE if not mono else WHITE
    end = GREEN if not mono else WHITE
    pin_hole = PAPER if include_map else (0, 0, 0, 0)
    draw_pin(draw, 220, 500, 92, start, pin_hole)
    draw_pin(draw, 780, 180, 82, end, pin_hole)


def save_icon():
    image = Image.new("RGBA", (SIZE*SCALE, SIZE*SCALE), PAPER)
    draw_symbol(image, include_map=True)
    image.resize((SIZE, SIZE), Image.Resampling.LANCZOS).convert("RGB").save(ASSETS / "icon.png", quality=95)


def save_splash():
    image = Image.new("RGBA", (SIZE*SCALE, SIZE*SCALE), (0, 0, 0, 0))
    draw_symbol(image, include_map=True)
    image.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(ASSETS / "splash-icon.png")


def save_android_foreground():
    source = Image.new("RGBA", (SIZE*SCALE, SIZE*SCALE), (0, 0, 0, 0))
    draw_symbol(source, include_map=False)
    source = source.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    # Keep the mark inside Android's adaptive-icon safe area.
    scaled_source = source.resize((740, 740), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(scaled_source, ((SIZE-740)//2, (SIZE-740)//2))
    canvas.resize((512, 512), Image.Resampling.LANCZOS).save(ASSETS / "android-icon-foreground.png")


def save_android_monochrome():
    image = Image.new("RGBA", (SIZE*SCALE, SIZE*SCALE), (0, 0, 0, 0))
    draw_symbol(image, include_map=False, mono=True)
    image.resize((432, 432), Image.Resampling.LANCZOS).save(ASSETS / "android-icon-monochrome.png")


def save_favicon():
    image = Image.new("RGBA", (SIZE*SCALE, SIZE*SCALE), PAPER)
    draw_symbol(image, include_map=False)
    image.resize((48, 48), Image.Resampling.LANCZOS).save(ASSETS / "favicon.png")


if __name__ == "__main__":
    save_icon()
    save_splash()
    save_android_foreground()
    save_android_monochrome()
    save_favicon()
