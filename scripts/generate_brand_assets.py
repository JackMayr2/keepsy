#!/usr/bin/env python3

from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / "assets" / "images"


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = hex_color.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def blend_stops(colors: Iterable[tuple[int, int, int, int]], t: float) -> tuple[int, int, int, int]:
    stops = list(colors)
    if t <= 0:
        return stops[0]
    if t >= 1:
        return stops[-1]
    scaled = t * (len(stops) - 1)
    idx = int(scaled)
    frac = scaled - idx
    start = stops[idx]
    end = stops[min(idx + 1, len(stops) - 1)]
    return tuple(lerp(start[i], end[i], frac) for i in range(4))


def diagonal_gradient(size: int, colors: list[str]) -> Image.Image:
    converted = [rgba(color) for color in colors]
    gradient = Image.new("RGBA", (size, size))
    px = gradient.load()
    denom = max(1, (size - 1) * 2)
    for y in range(size):
        for x in range(size):
            t = (x + y) / denom
            px[x, y] = blend_stops(converted, t)
    return gradient


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    return mask


def add_blurred_ellipse(
    canvas: Image.Image,
    box: tuple[int, int, int, int],
    color: tuple[int, int, int, int],
    blur: int,
) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse(box, fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(layer)


def add_rotated_rounded_rect(
    canvas: Image.Image,
    center: tuple[int, int],
    size: tuple[int, int],
    radius: int,
    angle: float,
    fill: tuple[int, int, int, int],
) -> None:
    shape = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shape)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=fill)
    rotated = shape.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    x = int(center[0] - rotated.size[0] / 2)
    y = int(center[1] - rotated.size[1] / 2)
    canvas.alpha_composite(rotated, dest=(x, y))


def create_full_icon(size: int) -> Image.Image:
    icon = diagonal_gradient(size, ["#6962FF", "#B66BFF", "#FF7AB4"])
    icon.putalpha(rounded_mask(size, round(size * 0.254)))

    add_blurred_ellipse(
        icon,
        (
            round(size * 0.03),
            round(size * 0.56),
            round(size * 0.52),
            round(size * 0.98),
        ),
        rgba("#7FE4FF", 140),
        round(size * 0.082),
    )
    add_blurred_ellipse(
        icon,
        (
            round(size * 0.05),
            round(size * 0.04),
            round(size * 0.63),
            round(size * 0.28),
        ),
        rgba("#FFFFFF", 110),
        round(size * 0.05),
    )

    glass = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glass_draw = ImageDraw.Draw(glass)
    pad = round(size * 0.212)
    glass_draw.rounded_rectangle(
        (pad, pad, size - pad, size - pad),
        radius=round(size * 0.19),
        fill=rgba("#FFFFFF", 20),
        outline=rgba("#FFFFFF", 52),
        width=max(4, round(size * 0.008)),
    )
    icon.alpha_composite(glass)

    mark = create_foreground_mark(size)
    icon.alpha_composite(mark)
    return icon


def create_background_only(size: int) -> Image.Image:
    background = diagonal_gradient(size, ["#6962FF", "#B66BFF", "#FF7AB4"])
    add_blurred_ellipse(
        background,
        (
            round(size * 0.02),
            round(size * 0.56),
            round(size * 0.55),
            round(size * 0.98),
        ),
        rgba("#7FE4FF", 132),
        round(size * 0.09),
    )
    add_blurred_ellipse(
        background,
        (
            round(size * 0.03),
            round(size * 0.05),
            round(size * 0.66),
            round(size * 0.28),
        ),
        rgba("#FFFFFF", 84),
        round(size * 0.06),
    )
    return background


def create_foreground_mark(size: int, monochrome: bool = False) -> Image.Image:
    mark = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(mark)

    white = rgba("#FFFFFF")
    gold = white if monochrome else rgba("#FFD96E")
    glow = rgba("#FFF3BF", 185) if not monochrome else rgba("#FFFFFF")

    stem_box = (
        round(size * 0.365),
        round(size * 0.246),
        round(size * 0.449),
        round(size * 0.754),
    )
    draw.rounded_rectangle(stem_box, radius=round(size * 0.042), fill=white)
    add_rotated_rounded_rect(
        mark,
        center=(round(size * 0.566), round(size * 0.335)),
        size=(round(size * 0.264), round(size * 0.08)),
        radius=round(size * 0.04),
        angle=-39.5,
        fill=white,
    )
    add_rotated_rounded_rect(
        mark,
        center=(round(size * 0.574), round(size * 0.56)),
        size=(round(size * 0.276), round(size * 0.08)),
        radius=round(size * 0.04),
        angle=39.5,
        fill=white,
    )

    orb_center = (round(size * 0.652), round(size * 0.285))
    orb_radius = round(size * 0.055)
    draw.ellipse(
        (
            orb_center[0] - orb_radius,
            orb_center[1] - orb_radius,
            orb_center[0] + orb_radius,
            orb_center[1] + orb_radius,
        ),
        fill=gold,
    )
    inner_radius = round(orb_radius * 0.45)
    draw.ellipse(
        (
            orb_center[0] - inner_radius,
            orb_center[1] - inner_radius,
            orb_center[0] + inner_radius,
            orb_center[1] + inner_radius,
        ),
        fill=glow,
    )
    return mark


def resize_and_save(image: Image.Image, output: Path, size: int) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    image.resize((size, size), Image.Resampling.LANCZOS).save(output)


def main() -> None:
    resize_and_save(create_full_icon(1024), IMAGE_DIR / "icon.png", 1024)
    resize_and_save(create_full_icon(1024), IMAGE_DIR / "splash-icon.png", 512)
    resize_and_save(create_full_icon(1024), IMAGE_DIR / "favicon.png", 256)
    resize_and_save(create_background_only(1024), IMAGE_DIR / "android-icon-background.png", 1024)
    resize_and_save(create_foreground_mark(1024), IMAGE_DIR / "android-icon-foreground.png", 1024)
    resize_and_save(create_foreground_mark(1024, monochrome=True), IMAGE_DIR / "android-icon-monochrome.png", 1024)
    print(f"Generated Keepsy brand assets in {IMAGE_DIR}")


if __name__ == "__main__":
    main()
