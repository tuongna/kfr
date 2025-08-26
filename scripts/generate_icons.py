import os
from PIL import Image, ImageDraw, ImageFont

# === CONFIG ===
PRIMARY_COLOR = "#1976d2"
TEXT = "KfR"
TEXT_COLOR = "#ffffff"

PNG_SIZES = [72, 128, 144, 192, 512]
FAVICON_SIZES = [16, 32, 48]
APPLE_TOUCH_SIZE = 180
OUTPUT_DIR = "assets/icons"


def generate_icon(size, text=TEXT, bg=PRIMARY_COLOR, text_color=TEXT_COLOR):
    w = h = size
    base = Image.new("RGBA", (w, h), bg)
    draw = ImageDraw.Draw(base)

    max_w = int(w * 0.85)
    max_h = int(h * 0.85)

    # system font / default
    font_size = int(size * 0.9)
    try:
        font = ImageFont.truetype("Arial.ttf", font_size)  # Windows/macOS
    except Exception:
        try:
            font = ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)  # Linux
        except Exception:
            font = ImageFont.load_default()  # fallback

    # automatically reduce font size if text is too large
    while font_size > 5:
        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        if text_w <= max_w and text_h <= max_h:
            break
        font_size -= 2
        try:
            font = ImageFont.truetype("Arial Bold.ttf", font_size)
        except Exception:
            try:
                font = ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)
            except Exception:
                font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (w - text_w) / 2 - bbox[0]
    y = (h - text_h) / 2 - bbox[1]

    draw.text((x, y), text, font=font, fill=text_color)
    return base


def save_png_icons():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for size in PNG_SIZES:
        img = generate_icon(size)
        path = os.path.join(OUTPUT_DIR, f"icon-{size}.png")
        img.save(path, "PNG")
        print(f"Saved {path}")


def save_favicon():
    favicon_path = "favicon.ico"
    base = generate_icon(max(FAVICON_SIZES))
    base.save(favicon_path, format="ICO", sizes=[(s, s) for s in FAVICON_SIZES])
    print(f"Saved {favicon_path}")

    for s in FAVICON_SIZES:
        img = generate_icon(s)
        path = f"favicon-{s}.png"
        img.save(path, "PNG")
        print(f"Saved {path}")


def save_apple_touch_icon():
    img = generate_icon(APPLE_TOUCH_SIZE)
    path = "apple-touch-icon.png"
    img.save(path, "PNG")
    print(f"Saved {path}")


def save_manifest():
    manifest = {
        "name": "KfR Korean Learning",
        "short_name": "KfR",
        "start_url": "/",
        "display": "standalone",
        "background_color": PRIMARY_COLOR,
        "theme_color": PRIMARY_COLOR,
        "icons": [
            {"src": f"/{OUTPUT_DIR}/icon-72.png", "sizes": "72x72", "type": "image/png"},
            {"src": f"/{OUTPUT_DIR}/icon-128.png", "sizes": "128x128", "type": "image/png"},
            {"src": f"/{OUTPUT_DIR}/icon-144.png", "sizes": "144x144", "type": "image/png"},
            {"src": f"/{OUTPUT_DIR}/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": f"/{OUTPUT_DIR}/icon-512.png", "sizes": "512x512", "type": "image/png"},
        ],
    }
    with open("manifest.json", "w") as f:
        import json
        json.dump(manifest, f, indent=2)
    print("Saved manifest.json")


def main():
    save_png_icons()
    save_favicon()
    save_apple_touch_icon()
    save_manifest()


if __name__ == "__main__":
    main()
