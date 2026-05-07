#!/usr/bin/env python3
"""Build the homepage overview demo video.
Brand cards + product title cards interleaved with footage from the 4 product demos.
~50-60 sec, silent (most users autoplay muted).
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import subprocess, shutil

ROOT = Path(__file__).parent
TMP = ROOT / "_tmp"
TMP.mkdir(exist_ok=True)
W, H = 1920, 1080
FPS = 30

# Brand
BG = (14, 10, 26)
INK = (245, 243, 255)
DIM = (167, 139, 250)
ACC = (168, 85, 247)
MAG = (232, 121, 249)
GRAD = [(0.0, (124, 58, 237)), (0.5, (168, 85, 247)), (1.0, (232, 121, 249))]

FONT_DIR = Path.home() / "Library/Fonts/Easyworks"
SG = str(FONT_DIR / "SpaceGrotesk[wght].ttf")
INTER = str(FONT_DIR / "Inter[opsz,wght].ttf")


def font(path, size, weight=600):
    f = ImageFont.truetype(path, size)
    try:
        f.set_variation_by_axes([weight] if 'SpaceGrotesk' in path else [0, weight])
    except Exception:
        pass
    return f


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def grad_color(t):
    for i in range(len(GRAD) - 1):
        p0, c0 = GRAD[i]
        p1, c1 = GRAD[i + 1]
        if p0 <= t <= p1:
            return lerp(c0, c1, (t - p0) / max(1e-9, p1 - p0))
    return GRAD[-1][1]


def gradient_text(text, fnt, w_avail):
    bbox = fnt.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pad = 20
    img = Image.new("RGBA", (tw + pad * 2, th + pad * 2), (0, 0, 0, 0))
    mask = Image.new("L", (tw + pad * 2, th + pad * 2), 0)
    ImageDraw.Draw(mask).text((-bbox[0] + pad, -bbox[1] + pad), text, font=fnt, fill=255)
    grad = Image.new("RGB", (tw + pad * 2, th + pad * 2))
    px = grad.load()
    for x in range(grad.width):
        c = grad_color(x / max(1, grad.width - 1))
        for y in range(grad.height):
            px[x, y] = c
    img.paste(grad, (0, 0), mask)
    return img


def add_glow(img, cx, cy, rad, color, alpha=0.5):
    w, h = img.size
    layer = Image.new("RGB", (w, h), (0, 0, 0))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).ellipse((cx - rad, cy - rad, cx + rad, cy + rad), fill=int(255 * alpha))
    mask = mask.filter(ImageFilter.GaussianBlur(radius=int(rad * 0.4)))
    overlay = Image.new("RGB", (w, h), color)
    base = Image.new("RGB", (w, h), (0, 0, 0))
    base.paste(overlay, (0, 0), mask)
    return Image.eval(Image.blend(img, base, 0.0), lambda v: v) if False else _screen(img, base)


def _screen(a, b):
    from PIL import ImageChops
    return ImageChops.screen(a, b)


def base_canvas():
    img = Image.new("RGB", (W, H), BG)
    img = add_glow(img, W * 0.78, H * 0.20, 700, ACC, 0.55)
    img = add_glow(img, W * 0.20, H * 0.80, 600, MAG, 0.40)
    img = add_glow(img, W * 0.50, H * 1.05, 550, (124, 58, 237), 0.35)
    return img


def card_intro():
    img = base_canvas()
    d = ImageDraw.Draw(img)
    # EASYWORKS·AI tracked
    f_big = font(SG, 130, 500)
    main, accent = "EASYWORKS", "·AI"
    sp = 26
    main_w = sum(f_big.getlength(c) for c in main) + sp * (len(main) - 1)
    accent_grad = gradient_text(accent, f_big, W)
    total = main_w + 28 + accent_grad.width - 40
    cx = (W - total) // 2
    bbox = f_big.getbbox(main)
    cy = H // 2 - 60
    x = cx
    for ch in main:
        d.text((x, cy), ch, font=f_big, fill=INK)
        x += f_big.getlength(ch) + sp
    img.paste(accent_grad, (int(x - sp + 28 - 20), int(cy - 20)), accent_grad)
    # tagline
    f_t = font(SG, 56, 500)
    tagline = "Less doing.  More done."
    tw = sum(f_t.getlength(c) for c in tagline)
    d.text(((W - tw) // 2, cy + 200), tagline, font=f_t, fill=DIM)
    return img


def card_brand():
    img = base_canvas()
    d = ImageDraw.Draw(img)
    f_eyebrow = font(SG, 36, 500)
    f_h = font(SG, 110, 700)
    f_b = font(SG, 44, 500)
    # eyebrow
    eye = "BC-BASED  ·  IN-PERSON"
    eyw = sum(f_eyebrow.getlength(c) for c in eye) + 2 * (len(eye) - 1)
    x = (W - eyw) // 2
    for ch in eye:
        d.text((x, H // 2 - 220), ch, font=f_eyebrow, fill=ACC)
        x += f_eyebrow.getlength(ch) + 2
    # headline
    line1 = "The local AI company"
    line2_a = "that "
    line2_b = "actually shows up."
    for i, line in enumerate([line1]):
        bbox = f_h.getbbox(line)
        d.text(((W - (bbox[2] - bbox[0])) // 2, H // 2 - 110 + i * 130), line, font=f_h, fill=INK)
    # second line — mixed color
    aw = f_h.getlength(line2_a)
    bw = f_h.getlength(line2_b)
    sx = (W - (aw + bw)) // 2
    d.text((sx, H // 2 + 30), line2_a, font=f_h, fill=INK)
    g = gradient_text(line2_b, f_h, W)
    img.paste(g, (int(sx + aw - 20), int(H // 2 + 30 - 20)), g)
    # tagline
    tagline = "We come to you. We sit with you. We pick up the phone."
    tw = sum(f_b.getlength(c) for c in tagline)
    d.text(((W - tw) // 2, H // 2 + 230), tagline, font=f_b, fill=DIM)
    return img


def card_product(name, tagline, price):
    img = base_canvas()
    d = ImageDraw.Draw(img)
    f_eyebrow = font(SG, 36, 500)
    f_h = font(SG, 140, 700)
    f_t = font(SG, 50, 500)
    f_p = font(SG, 36, 500)
    # eyebrow
    eye = "ENGINE"
    eyw = f_eyebrow.getlength(eye) * 1.3
    d.text(((W - eyw) // 2, H // 2 - 250), eye, font=f_eyebrow, fill=ACC, spacing=4)
    # name (gradient)
    g = gradient_text(name, f_h, W)
    img.paste(g, (int((W - g.width) // 2), int(H // 2 - 130)), g)
    # tagline
    tw = sum(f_t.getlength(c) for c in tagline)
    d.text(((W - tw) // 2, H // 2 + 60), tagline, font=f_t, fill=INK)
    # price
    pw = sum(f_p.getlength(c) for c in price)
    d.text(((W - pw) // 2, H // 2 + 170), price, font=f_p, fill=DIM)
    return img


def card_outro():
    img = base_canvas()
    d = ImageDraw.Draw(img)
    f_h = font(SG, 130, 700)
    f_url = font(SG, 56, 500)
    f_phone = font(SG, 44, 500)
    h = "We come see you."
    bbox = f_h.getbbox(h)
    d.text(((W - (bbox[2] - bbox[0])) // 2, H // 2 - 120), h, font=f_h, fill=INK)
    # URL gradient
    url_grad = gradient_text("easyworks.ai", f_url, W)
    img.paste(url_grad, (int((W - url_grad.width) // 2), int(H // 2 + 60)), url_grad)
    # phone
    p = "+1 (604) 265-7660"
    pw = sum(f_phone.getlength(c) for c in p)
    d.text(((W - pw) // 2, H // 2 + 170), p, font=f_phone, fill=DIM)
    return img


# ---------- generate PNGs ----------
print("Rendering title cards...")
card_intro().save(TMP / "00_intro.png")
card_brand().save(TMP / "01_brand.png")
card_product("Content Engine", "Posts, reels, photos, videos — on autopilot.", "$1,279 setup  ·  $997/mo").save(TMP / "02_content.png")
card_product("SEO Engine", "Found on Google when it matters.", "$1,279 setup  ·  $997/mo").save(TMP / "04_seo.png")
card_product("AI Suite", "Never miss a call. Never lose a lead.", "$997 setup  ·  $497/mo").save(TMP / "06_ai.png")
card_product("Voice → Report", "Your dictation, returned as a finished report.", "$997 setup  ·  $497/mo").save(TMP / "08_voice.png")
card_outro().save(TMP / "10_outro.png")

# ---------- ffmpeg: render each card to a 2.5-3 sec clip with fade ----------
def png_to_clip(png, out, dur=2.6):
    cmd = ["ffmpeg", "-y", "-loop", "1", "-i", str(png), "-t", str(dur),
           "-vf", f"scale={W}:{H},fade=in:0:8,fade=out:{int(FPS*(dur-0.3))}:8,format=yuv420p",
           "-r", str(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "20",
           "-pix_fmt", "yuv420p", "-an", str(out)]
    subprocess.run(cmd, check=True, capture_output=True)


def trim_demo(src, out, start=2, dur=6):
    """Trim segment from a product demo; strip audio."""
    cmd = ["ffmpeg", "-y", "-ss", str(start), "-t", str(dur), "-i", str(src),
           "-vf", f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=0e0a1a,fade=in:0:6,fade=out:{int(FPS*(dur-0.25))}:6,format=yuv420p",
           "-r", str(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "20",
           "-pix_fmt", "yuv420p", "-an", str(out)]
    subprocess.run(cmd, check=True, capture_output=True)


print("Rendering intro/brand/outro card clips...")
png_to_clip(TMP / "00_intro.png", TMP / "00_intro.mp4", dur=3.0)
png_to_clip(TMP / "01_brand.png", TMP / "01_brand.mp4", dur=3.5)
png_to_clip(TMP / "10_outro.png", TMP / "10_outro.mp4", dur=4.0)
print("Rendering product cards + demo trims...")
for slug, card_idx, demo_idx, demo_file in [
    ("content", "02", "03", "content-engine-demo.mp4"),
    ("seo",     "04", "05", "seo-engine-demo.mp4"),
    ("ai",      "06", "07", "ai-suite-demo.mp4"),
    ("voice",   "08", "09", "voice-report-demo.mp4"),
]:
    png_to_clip(TMP / f"{card_idx}_{slug}.png", TMP / f"{card_idx}_{slug}.mp4", dur=2.5)
    trim_demo(ROOT / demo_file, TMP / f"{demo_idx}_{slug}_demo.mp4", start=3, dur=6)

# ---------- concat all ----------
order = ["00_intro", "01_brand",
         "02_content", "03_content_demo",
         "04_seo", "05_seo_demo",
         "06_ai", "07_ai_demo",
         "08_voice", "09_voice_demo",
         "10_outro"]

# Use concat demuxer
listfile = TMP / "list.txt"
with listfile.open("w") as f:
    for name in order:
        f.write(f"file '{(TMP / (name + '.mp4')).resolve()}'\n")

out = ROOT / "easyworks-overview.mp4"
print(f"Concatenating → {out.name}")
subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listfile),
                "-c:v", "libx264", "-preset", "medium", "-crf", "21",
                "-pix_fmt", "yuv420p", "-r", str(FPS), "-an", str(out)],
               check=True, capture_output=True)

shutil.rmtree(TMP)
print("Done. File:", out)
subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration,size", "-of", "default=noprint_wrappers=1", str(out)])
