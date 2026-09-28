"""Makes NOREX-branded bot avatars from the club crest.

Usage:  python3 bot/icons/make_icon.py "STATS BOT" "#c8352c" stats
        python3 bot/icons/make_icon.py "MATCH BOT" "#e8c16a" match

Writes bot/icons/<slug>.png (1024x1024, Discord app icon) and <slug>-banner.png (1360x480, Discord bot banner).
Everything important sits inside the centre circle, because Discord crops avatars to a circle.
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).parent
INK = (11, 15, 22)
RED = (200, 53, 44)
WHITE = (255, 255, 255)


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def backdrop(w, h, accent, cx, cy, radius):
    """Radial glow in the accent colour over ink, with the crest's diagonal wing stripes."""
    img = Image.new("RGB", (w, h), INK)
    glow = Image.new("RGB", (w, h), INK)
    g = ImageDraw.Draw(glow)
    steps = 60
    for i in range(steps, 0, -1):
        t = i / steps
        r = radius * t
        g.ellipse([cx - r, cy - r, cx + r, cy + r], fill=mix(mix(accent, INK, 0.35), INK, t ** 0.8))
    img = Image.blend(img, glow, 1)
    stripes = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    s = ImageDraw.Draw(stripes)
    for x in range(-h, w + h, max(w, h) // 16):
        s.polygon([(x, h), (x + 14, h), (x + 14 + h * 0.47, 0), (x + h * 0.47, 0)], fill=(255, 255, 255, 12))
    img.paste(stripes, (0, 0), stripes)
    return img


def crest(height):
    c = Image.open(HERE / "crest-hires.png").convert("RGBA")
    return c.resize((round(c.width * height / c.height), height), Image.LANCZOS)


def shadowed(canvas, layer, xy, blur=18, offset=(0, 16), alpha=170):
    sh = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    sh.paste((0, 0, 0, alpha), (0, 0), layer)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(sh, (xy[0] + offset[0], xy[1] + offset[1]))
    canvas.alpha_composite(layer, xy)


def ribbon(draw, cx, y, text, font, accent, pad_x=46, height=112):
    """Banner like the crest's NOREX UNITED ribbon: ink panel, white keyline, accent tails."""
    tw = draw.textlength(text, font=font)
    w = tw + pad_x * 2
    x0, x1 = cx - w / 2, cx + w / 2
    tail = 44
    # tails
    for sgn, edge in ((-1, x0), (1, x1)):
        draw.polygon([(edge, y + 18), (edge + sgn * tail, y + 18), (edge + sgn * (tail - 22), y + height / 2 + 9),
                      (edge + sgn * tail, y + height), (edge, y + height)], fill=mix(accent, INK, 0.25), outline=WHITE, width=5)
    draw.rounded_rectangle([x0, y, x1, y + height - 12], radius=10, fill=INK, outline=WHITE, width=7)
    draw.text((cx, y + (height - 12) / 2 + 2), text, font=font, fill=WHITE, anchor="mm")


def stars(draw, cx, y, size, color, n=5, gap=1.9):
    def star(x, yy, r):
        pts = []
        for k in range(10):
            a = -math.pi / 2 + k * math.pi / 5
            rr = r if k % 2 == 0 else r * 0.45
            pts.append((x + math.cos(a) * rr, yy + math.sin(a) * rr))
        draw.polygon(pts, fill=color)
    for i in range(n):
        star(cx + (i - (n - 1) / 2) * size * gap, y, size)


def avatar(label, accent, out):
    S = 1024
    img = backdrop(S, S, accent, S / 2, S * 0.44, S * 0.62).convert("RGBA")
    d = ImageDraw.Draw(img)
    # keyline ring just inside Discord's circular crop
    m = 22
    d.ellipse([m, m, S - m, S - m], outline=accent, width=16)
    d.ellipse([m + 20, m + 20, S - m - 20, S - m - 20], outline=(255, 255, 255, 70), width=3)
    c = crest(610)
    shadowed(img, c, ((S - c.width) // 2, 105))
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(str(HERE / "Anton-Regular.ttf"), 84)
    ribbon(d, S / 2, 700, label, font, accent)
    stars(d, S / 2, 872, 22, WHITE, gap=2.4)
    img.convert("RGB").save(out, optimize=True)


def banner(label, accent, out):
    W, H = 1360, 480
    img = backdrop(W, H, accent, W * 0.2, H / 2, W * 0.55).convert("RGBA")
    c = crest(400)
    shadowed(img, c, (110, 40))
    d = ImageDraw.Draw(img)
    big = ImageFont.truetype(str(HERE / "Anton-Regular.ttf"), 150)
    small = ImageFont.truetype(str(HERE / "Anton-Regular.ttf"), 64)
    d.text((470, 150), "NOREX UNITED", font=big, fill=WHITE, anchor="lm")
    d.rectangle([472, 250, 472 + d.textlength(label, font=small) + 40, 330], fill=accent)
    d.text((492, 290), label, font=small, fill=WHITE, anchor="lm")
    stars(d, 520, 385, 13, WHITE, gap=2.2)
    img.convert("RGB").save(out, optimize=True)


if __name__ == "__main__":
    label = sys.argv[1] if len(sys.argv) > 1 else "STATS BOT"
    accent = hex_rgb(sys.argv[2]) if len(sys.argv) > 2 else RED
    slug = sys.argv[3] if len(sys.argv) > 3 else label.lower().split()[0]
    avatar(label, accent, HERE / f"{slug}.png")
    banner(label, accent, HERE / f"{slug}-banner.png")
    print(f"Wrote {slug}.png and {slug}-banner.png")
