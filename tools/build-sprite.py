"""Recover a crisp sprite from the upscaled errante plate and write the sheet plus its metadata."""

from pathlib import Path
import statistics

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-src" / "errante.png"
SHEET = ROOT / "assets" / "sprites" / "errante.png"
META = ROOT / "js" / "art" / "errante.sprite.js"

FRAMES = ("calm", "breathe", "hurt", "down")
OUTLINE = (20, 16, 14, 255)
HURT = (208, 64, 43)
MAX_COLORS = 32


def channel_median(colors):
    return tuple(int(statistics.median(channel)) for channel in zip(*colors))


def luminance(color):
    return color[0] * 0.3 + color[1] * 0.59 + color[2] * 0.11


def is_background(color):
    red, green, blue = color[:3]
    return min(red, green, blue) >= 220 and max(red, green, blue) - min(red, green, blue) <= 18


def grid_score(pixels, width, height, pitch, origin_x, origin_y):
    margin = max(1, pitch // 5)
    total = 0
    count = 0
    for top in range(origin_y, height - pitch, pitch * 3):
        for left in range(origin_x, width - pitch, pitch * 3):
            values = []
            for y in range(top + margin, top + pitch - margin, 2):
                for x in range(left + margin, left + pitch - margin, 2):
                    values.append(luminance(pixels[x, y]))
            if len(values) < 4:
                continue
            mean = sum(values) / len(values)
            total += sum((value - mean) ** 2 for value in values) / len(values)
            count += 1
    return total / max(1, count)


def detect_grid(pixels, width, height):
    best = None
    for pitch in range(7, 10):
        for origin_x in range(pitch):
            for origin_y in range(pitch):
                score = grid_score(pixels, width, height, pitch, origin_x, origin_y)
                if best is None or score < best[0]:
                    best = (score, pitch, origin_x, origin_y)
    return best[1:]


def downsample(source):
    width, height = source.size
    pixels = source.load()
    pitch, origin_x, origin_y = detect_grid(pixels, width, height)
    columns = (width - origin_x) // pitch
    rows = (height - origin_y) // pitch
    image = Image.new("RGBA", (columns, rows))
    out = image.load()
    margin = max(1, pitch // 5)
    for row in range(rows):
        for column in range(columns):
            left = origin_x + column * pitch
            top = origin_y + row * pitch
            samples = [
                pixels[x, y]
                for y in range(top + margin, top + pitch - margin)
                for x in range(left + margin, left + pitch - margin)
            ]
            red, green, blue = channel_median(samples)
            out[column, row] = (red, green, blue, 255)
    return image, pitch


def clear_background(image):
    width, height = image.size
    pixels = image.load()
    seen = [[False] * width for _ in range(height)]
    stack = []
    for x in range(width):
        stack.append((x, 0))
        stack.append((x, height - 1))
    for y in range(height):
        stack.append((0, y))
        stack.append((width - 1, y))
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= width or y >= height or seen[y][x]:
            continue
        seen[y][x] = True
        if not is_background(pixels[x, y]):
            continue
        pixels[x, y] = (0, 0, 0, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))


def nearest(color, palette):
    best = palette[0]
    best_distance = None
    for entry in palette:
        distance = sum((color[i] - entry[i]) ** 2 for i in range(3))
        if best_distance is None or distance < best_distance:
            best = entry
            best_distance = distance
    return best


def lock_palette(image):
    colors = []
    pixels = image.load()
    width, height = image.size
    for y in range(height):
        for x in range(width):
            color = pixels[x, y]
            if color[3] == 0 or luminance(color) < 28:
                continue
            colors.append(color[:3])
    blob = Image.new("RGB", (len(colors) or 1, 1))
    if colors:
        blob.putdata(colors)
    count = min(MAX_COLORS - 1, max(1, len(set(colors))))
    reduced = blob.quantize(colors=count, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    raw = reduced.getpalette()
    palette = [tuple(raw[i : i + 3]) for i in range(0, count * 3, 3)]
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                pixels[x, y] = (0, 0, 0, 0)
                continue
            if luminance((red, green, blue)) < 28:
                pixels[x, y] = OUTLINE
                continue
            mapped = nearest((red, green, blue), palette)
            pixels[x, y] = (*mapped, 255)
    opaque = {
        pixels[x, y][:3]
        for y in range(height)
        for x in range(width)
        if pixels[x, y][3] == 255
    }
    if len(opaque) > MAX_COLORS:
        raise SystemExit(f"la paleta quedó en {len(opaque)} colores")
    partial = [
        pixels[x, y][3]
        for y in range(height)
        for x in range(width)
        if pixels[x, y][3] not in (0, 255)
    ]
    if partial:
        raise SystemExit("quedó transparencia parcial")


def content_bounds(image):
    pixels = image.load()
    width, height = image.size
    xs = [x for y in range(height) for x in range(width) if pixels[x, y][3]]
    ys = [y for y in range(height) for x in range(width) if pixels[x, y][3]]
    return min(xs), min(ys), max(xs), max(ys)


def frame_image(image):
    left, top, right, bottom = content_bounds(image)
    cropped = image.crop((left, top, right + 1, bottom + 1))
    framed = Image.new("RGBA", (cropped.width + 2, cropped.height + 1), (0, 0, 0, 0))
    framed.paste(cropped, (1, 1))
    return framed


def shift_breathe(image, neck):
    clone = image.copy()
    source = image.load()
    target = clone.load()
    width, _height = image.size
    for y in range(neck - 1, 0, -1):
        for x in range(width):
            target[x, y] = source[x, y - 1]
    for x in range(width):
        target[x, 0] = (0, 0, 0, 0)
    return clone


def tint(image, paint):
    clone = image.copy()
    pixels = clone.load()
    width, height = clone.size
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0 or luminance((red, green, blue)) < 28:
                continue
            pixels[x, y] = tuple(int(channel * 0.55 + target * 0.45) for channel, target in zip((red, green, blue), paint)) + (255,)
    return clone


def desaturate(image):
    clone = image.copy()
    pixels = clone.load()
    width, height = clone.size
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue
            gray = int(luminance((red, green, blue)))
            mixed = tuple(int((channel * 0.3 + gray * 0.7) * 0.8) for channel in (red, green, blue))
            pixels[x, y] = (*mixed, 255)
    return clone


def portrait_box(image):
    pixels = image.load()
    width, height = image.size
    limit = max(1, int(height * 0.4))
    xs = [x for y in range(limit) for x in range(width) if pixels[x, y][3]]
    ys = [y for y in range(limit) for x in range(width) if pixels[x, y][3]]
    return {
        "x": min(xs),
        "y": min(ys),
        "w": max(xs) - min(xs) + 1,
        "h": max(ys) - min(ys) + 1,
    }


def feet_anchor(image):
    pixels = image.load()
    width, height = image.size
    row = height - 1
    xs = [x for x in range(width) if pixels[x, row][3]]
    return {"x": int(round(sum(xs) / len(xs))), "y": row}


def write_meta(frame_w, frame_h, portrait, feet, neck):
    frames = ", ".join(f'"{name}"' for name in FRAMES)
    META.write_text(
        "\n".join(
            [
                "// Generated by tools/build-sprite.py. Do not edit by hand.",
                "export const SPRITE = {",
                '  src: "assets/sprites/errante.png",',
                f"  frameW: {frame_w},",
                f"  frameH: {frame_h},",
                f"  frames: [{frames}],",
                f"  portrait: {{ x: {portrait['x']}, y: {portrait['y']}, w: {portrait['w']}, h: {portrait['h']} }},",
                f"  feet: {{ x: {feet['x']}, y: {feet['y']} }},",
                f"  neck: {neck},",
                "};",
                "",
            ]
        ),
        encoding="utf-8",
    )


def main():
    source = Image.open(SOURCE).convert("RGB")
    sampled, pitch = downsample(source)
    clear_background(sampled)
    lock_palette(sampled)
    calm = frame_image(sampled)
    neck = max(2, int(calm.height * 0.34))
    frames = [
        calm,
        shift_breathe(calm, neck),
        tint(calm, HURT),
        desaturate(calm),
    ]
    sheet = Image.new("RGBA", (calm.width * len(frames), calm.height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.paste(frame, (index * calm.width, 0))
    SHEET.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(SHEET)
    portrait = portrait_box(calm)
    feet = feet_anchor(calm)
    write_meta(calm.width, calm.height, portrait, feet, neck)
    print(f"pitch {pitch}, frame {calm.width}x{calm.height}, portrait {portrait}, feet {feet}, neck {neck}")


if __name__ == "__main__":
    main()
