#!/usr/bin/env python3
"""Animated group-chat overlay on chroma-key green, for CapCut.

Renders output/laptop-chat-greenscreen.mp4 (1920x1080, 30 fps, H.264) and
output/laptop-chat.gif (960x540). Edit the CONFIG section, then run:

    python3 output/laptop_chat_overlay.py

Or put the chat straight onto the footage (see the on-video settings in CONFIG):

    python3 output/laptop_chat_overlay.py onvideo
    python3 output/laptop_chat_overlay.py onvideo preview 42.5   # one still frame to check placement

Needs Python 3 with Pillow, and ffmpeg on PATH.
"""
import os
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ============================== CONFIG ==============================
WIDTH, HEIGHT, FPS = 1920, 1080, 30
HOLD_END = 2.0                     # seconds to hold the final frame after the last animation
BACKGROUND = (0x00, 0xB1, 0x40)    # chroma-key green #00B140

COLUMN_WIDTH = 700                 # chat column, centered horizontally
TOP_MARGIN = 80                    # first bubble starts this far from the top
BOTTOM_MARGIN = 80                 # if the chat grows past this, it scrolls up
MAX_BUBBLE_WIDTH = 600             # text bubbles wrap at this width

ME_BUBBLE = (0x0A, 0x84, 0xFF)     # my bubbles: blue #0A84FF
ME_TEXT = (255, 255, 255)
OTHER_BUBBLE = (0xE9, 0xE9, 0xEB)  # other people: light gray #E9E9EB
OTHER_TEXT = (0, 0, 0)
CARD_BG = (255, 255, 255)
CARD_HEADING = (215, 25, 35)       # red heading on the shared-post card
LABEL_BG = (0, 0, 0, 140)          # pill behind name labels / status text
LABEL_TEXT = (255, 255, 255)

FONT_DIR = "/usr/share/fonts/opentype/inter/"   # Inter; change if your fonts live elsewhere
POP_DURATION = 0.3                 # bubble pop-in time

# Each message: who ("me" or a name), when it pops in, and either "text" or "card".
# typing_from: when the "... is typing" bubble appears before an incoming message (None = no indicator).
# status: [time, text] steps shown under that message.
MESSAGES = [
    {"from": "me", "at": 1.0, "card": {
        "source": "Campus Updates · shared post",
        "heading": "BREAKING ANNOUNCEMENT",
        "body": "Classes are suspended tomorrow due to an emergency! "
                "Please share this information immediately!"}},
    {"from": "me", "at": 2.3, "text": "GUYS! No classes tomorrow! Look!",
     "status": [[2.3, "Sent"], [2.8, "Delivered"], [3.4, "Seen by 7"],
                [5.4, "Seen by 19"], [7.2, "Seen by 34"]]},
    {"from": "Dio", "at": 5.0, "typing_from": 4.0, "text": "Totoo ba?"},
    {"from": "Dio", "at": 6.2, "typing_from": 5.6, "text": "YES! Finally! Walang pasok tomorrow!"},
    {"from": "Carlo", "at": 9.0, "typing_from": 7.5,
     "text": "Wait, suspended? So di ko na need mag-prepare for the presentation?"},
]

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
MP4_NAME = "laptop-chat-greenscreen.mp4"
GIF_NAME = "laptop-chat.gif"
GIF_WIDTH, GIF_FPS = 960, 15

# --- On-video version (python3 output/laptop_chat_overlay.py onvideo) ---
# Puts the same chat straight onto your footage instead of green.
SOURCE_VIDEO = "/root/.claude/uploads/95f8ab45-ab44-5021-a0e3-b24db9a917b6/eb1c584d-document_6066468132518635596.mp4"
CHAT_START = 33.0                  # time in the source video where the chat's 0.0 s is
SLOW_FROM, SLOW_TO = 33.0, 37.2    # this part of the source is slowed down so the whole chat fits (None, None = no slow-down)
ONVIDEO_COLUMN_X = 1330            # left edge of the chat column, in 1920x1080 units (scaled to the video's size)
ONVIDEO_COLUMN_WIDTH = 560
ONVIDEO_MAX_BUBBLE_WIDTH = 545
ONVIDEO_NAME = "laptop-scene-with-chat.mp4"
# ====================================================================
import sys
ON_VIDEO = len(sys.argv) > 1 and sys.argv[1] == "onvideo"
if ON_VIDEO:
    COLUMN_WIDTH, MAX_BUBBLE_WIDTH, BACKGROUND = ONVIDEO_COLUMN_WIDTH, ONVIDEO_MAX_BUBBLE_WIDTH, None

SS = 2  # supersampling for smooth edges
COL_X = ONVIDEO_COLUMN_X if ON_VIDEO else (WIDTH - COLUMN_WIDTH) // 2
GAP_SAME, GAP_NEW = 6, 18          # gap within a sender's group / between groups
NAME_H, STATUS_H = 34, 34
SHADOW_PAD = 24


def font(style, size):
    return ImageFont.truetype(os.path.join(FONT_DIR, f"Inter-{style}.otf"), size)


F_TEXT, F_NAME, F_SMALL = font("Regular", 30), font("Medium", 22), font("Regular", 21)
F_CARD_SRC, F_CARD_HEAD, F_CARD_BODY = font("Regular", 22), font("Bold", 31), font("Regular", 27)


def wrap(text, fnt, maxw):
    lines, cur = [], ""
    for word in text.split():
        trial = (cur + " " + word).strip()
        if fnt.getlength(trial) <= maxw or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    lines.append(cur)
    return lines


def big(fnt):
    return ImageFont.truetype(fnt.path, fnt.size * SS)


def add_tail(d, w, h, color, side):
    """Small curved tail at the bottom corner; w = x of the bubble edge it hangs off (supersampled px)."""
    def quad(p0, p1, p2, n=12):
        return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
                 (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])
                for t in (i / n for i in range(n + 1))]
    s = SS
    if side == "R":
        x = w
        pts = quad((x - 4 * s, h - 30 * s), (x - 2 * s, h - 6 * s), (x + 10 * s, h)) + \
              quad((x + 10 * s, h), (x - 8 * s, h + 1 * s), (x - 24 * s, h - 6 * s))
    else:
        x = w
        pts = quad((x + 4 * s, h - 30 * s), (x + 2 * s, h - 6 * s), (x - 10 * s, h)) + \
              quad((x - 10 * s, h), (x + 8 * s, h + 1 * s), (x + 24 * s, h - 6 * s))
    d.polygon(pts, fill=color)


def bubble_image(content_w, content_h, fill, side, tail, outline=None, radius=26):
    """Returns (RGBA image with tail room, x offset of bubble body inside it)."""
    tx = 12  # room for the tail
    W, H = (content_w + tx) * SS, content_h * SS
    im = Image.new("RGBA", (W, H + 2 * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    bx = 0 if side == "R" else tx * SS
    d.rounded_rectangle([bx, 0, bx + content_w * SS - 1, H - 1], radius=radius * SS,
                        fill=fill, outline=outline, width=(2 * SS if outline else 0))
    if tail:
        sub = Image.new("RGBA", im.size, (0, 0, 0, 0))
        add_tail(ImageDraw.Draw(sub), content_w * SS if side == "R" else bx, H, fill, side)
        im = Image.alpha_composite(sub, im) if outline else Image.alpha_composite(im, sub)
    return im, bx // SS


def text_bubble(text, me, tail):
    lines = wrap(text, F_TEXT, MAX_BUBBLE_WIDTH - 48)
    lh, padx, pady = 40, 24, 16
    w = int(max(F_TEXT.getlength(l) for l in lines)) + 2 * padx
    h = len(lines) * lh + 2 * pady - 8
    im, bx = bubble_image(w, h, ME_BUBBLE if me else OTHER_BUBBLE, "R" if me else "L", tail,
                          radius=min(26, h // 2))
    d = ImageDraw.Draw(im)
    for i, l in enumerate(lines):
        d.text(((bx + padx) * SS, (pady + i * lh) * SS), l, font=big(F_TEXT),
               fill=ME_TEXT if me else OTHER_TEXT)
    return im.resize((im.width // SS, im.height // SS), Image.LANCZOS)


def card_bubble(card, me, tail):
    w, padx = min(560, MAX_BUBBLE_WIDTH - 20), 24
    body = wrap(card["body"], F_CARD_BODY, w - 2 * padx)
    h = 20 + 30 + 14 + 40 + 10 + len(body) * 37 + 18
    im, bx = bubble_image(w, h, CARD_BG, "R" if me else "L", tail,
                          outline=(210, 210, 215), radius=24)
    d = ImageDraw.Draw(im)
    X = lambda v: (bx + v) * SS
    y = 20
    d.ellipse([X(padx), (y + 4) * SS, X(padx + 22), (y + 26) * SS], fill=CARD_HEADING)
    d.text((X(padx + 32), y * SS), card["source"], font=big(F_CARD_SRC), fill=(110, 110, 115))
    y += 30 + 14
    d.line([X(padx), (y - 6) * SS, X(w - padx), (y - 6) * SS], fill=(228, 228, 232), width=2 * SS)
    d.text((X(padx), y * SS), card["heading"], font=big(F_CARD_HEAD), fill=CARD_HEADING)
    y += 40 + 10
    for l in body:
        d.text((X(padx), y * SS), l, font=big(F_CARD_BODY), fill=(20, 20, 20))
        y += 37
    return im.resize((im.width // SS, im.height // SS), Image.LANCZOS)


def typing_bubble(t, tail=True):
    w, h = 96, 56
    im, bx = bubble_image(w, h, OTHER_BUBBLE, "L", tail, radius=28)
    d = ImageDraw.Draw(im)
    import math
    for i in range(3):
        ph = (math.sin(2 * math.pi * (t * 1.6 - i * 0.18)) + 1) / 2   # pulsing, staggered
        r = (6 + 2.5 * ph) * SS
        g = int(150 - 60 * ph)
        cx, cy = (bx + 26 + i * 22) * SS, (h // 2) * SS
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(g, g, g))
    return im.resize((im.width // SS, im.height // SS), Image.LANCZOS)


def pill(text, fnt):
    w, h = int(fnt.getlength(text)) + 22, fnt.size + 12
    im = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, w * SS - 1, h * SS - 1], radius=h * SS // 2, fill=LABEL_BG)
    d.text((w * SS / 2, h * SS / 2), text, font=big(fnt), fill=LABEL_TEXT, anchor="mm")
    return im.resize((w, h), Image.LANCZOS)


def shadow(im, blur=9, off=4, alpha=95):
    out = Image.new("RGBA", (im.width + 2 * SHADOW_PAD, im.height + 2 * SHADOW_PAD), (0, 0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 255))
    sh.putalpha(im.split()[3].point(lambda v: v * alpha // 255))
    out.paste(sh, (SHADOW_PAD, SHADOW_PAD + off), sh)
    out = out.filter(ImageFilter.GaussianBlur(blur))
    out.alpha_composite(im, (SHADOW_PAD, SHADOW_PAD))
    return out


def ease_out_back(x):
    x = max(0.0, min(1.0, x))
    c1 = 1.4
    return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2


def ease_out(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


# ---------- build layout ----------
items = []
for i, m in enumerate(MESSAGES):
    me = m["from"] == "me"
    prev_from = MESSAGES[i - 1]["from"] if i else None
    next_from = MESSAGES[i + 1]["from"] if i + 1 < len(MESSAGES) else None
    first, last = prev_from != m["from"], next_from != m["from"]
    img = card_bubble(m["card"], me, last) if "card" in m else text_bubble(m["text"], me, last)
    items.append(dict(m=m, me=me, first=first, last=last, img=shadow(img),
                      name=None if me or not first else shadow(pill(m["from"], F_NAME), 5, 2, 60),
                      h=img.height))

y = TOP_MARGIN
for i, it in enumerate(items):
    y += 0 if i == 0 else (GAP_NEW if it["first"] else GAP_SAME)
    if it["name"] is not None:
        it["name_y"] = y
        y += NAME_H
    it["y"] = y
    y += it["h"]
    if it["m"].get("status"):
        it["status_y"] = y + 6
        y += STATUS_H
    it["bottom"] = y

STATUS_PILLS = {s: shadow(pill(s, F_SMALL), 5, 2, 60)
                for it in items for _, s in it["m"].get("status", [])}
last_event = max(m["at"] for m in MESSAGES) + POP_DURATION
DURATION = last_event + HOLD_END
N_FRAMES = int(round(DURATION * FPS))


def paste_scaled(canvas, img, x, y, s, a, anchor_right):
    """Paste img (which has SHADOW_PAD around it) so its content's top-left sits at (x, y),
    scaled by s around the content's bottom corner on the sender's side."""
    cw, ch = img.width - 2 * SHADOW_PAD, img.height - 2 * SHADOW_PAD
    ax_img = SHADOW_PAD + (cw if anchor_right else 0)     # anchor inside the image
    ay_img = SHADOW_PAD + ch
    ax, ay = x + (cw if anchor_right else 0), y + ch        # anchor on the canvas
    w, h = max(1, round(img.width * s)), max(1, round(img.height * s))
    im = img.resize((w, h), Image.BILINEAR) if abs(s - 1) > 1e-3 else img.copy()
    if a < 1:
        im.putalpha(im.split()[3].point(lambda v: int(v * a)))
    canvas.alpha_composite(im, (round(ax - ax_img * s), round(ay - ay_img * s)))


def render(t):
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0) if BACKGROUND is None else BACKGROUND + (255,))
    # scroll up if content (visible so far) would pass the bottom margin
    visible_bottom = TOP_MARGIN
    for it in items:
        start = it["m"].get("typing_from") or it["m"]["at"]
        if t >= start:
            visible_bottom = it["bottom"]
    target = max(0, visible_bottom - (HEIGHT - BOTTOM_MARGIN))
    scroll = target  # layout only grows downward; keep it simple and stable

    for it in items:
        m = it["m"]
        body_w = it["img"].width - 2 * SHADOW_PAD
        x = COL_X + COLUMN_WIDTH - body_w if it["me"] else COL_X
        y = it["y"] - scroll
        typing_from = m.get("typing_from")
        shown_from = typing_from if typing_from is not None else m["at"]
        if t < shown_from:
            continue
        if it["name"] is not None:
            a = ease_out((t - shown_from) / POP_DURATION)
            nm = it["name"].copy()
            nm.putalpha(nm.split()[3].point(lambda v: int(v * a)))
            canvas.alpha_composite(nm, (x + 14 - SHADOW_PAD, it["name_y"] - scroll - SHADOW_PAD + 2))
        if typing_from is not None and t < m["at"]:
            p = (t - typing_from) / POP_DURATION
            tb = shadow(typing_bubble(t))
            paste_scaled(canvas, tb, COL_X, y, 0.6 + 0.4 * ease_out_back(p), ease_out(p), False)
            continue
        p = (t - m["at"]) / POP_DURATION
        paste_scaled(canvas, it["img"], x, y, 0.6 + 0.4 * ease_out_back(p), ease_out(p), it["me"])
        if m.get("status"):
            cur = None
            for st, s in m["status"]:
                if t >= st:
                    cur = s
            if cur:
                sp = STATUS_PILLS[cur]
                canvas.alpha_composite(sp, (COL_X + COLUMN_WIDTH - (sp.width - 2 * SHADOW_PAD) - 4 - SHADOW_PAD,
                                            it["status_y"] - scroll - SHADOW_PAD))
    return canvas if BACKGROUND is None else canvas.convert("RGB")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    mp4 = os.path.join(OUTPUT_DIR, MP4_NAME)
    gif = os.path.join(OUTPUT_DIR, GIF_NAME)
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS), "-i", "-",
         "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
         "-movflags", "+faststart", mp4], stdin=subprocess.PIPE)
    for k in range(N_FRAMES):
        enc.stdin.write(render(k / FPS).tobytes())
    enc.stdin.close()
    enc.wait()
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", mp4, "-filter_complex",
         f"fps={GIF_FPS},scale={GIF_WIDTH}:-1:flags=lanczos,split[a][b];"
         "[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a",
         "-loop", "0", gif], check=True)
    print(f"{N_FRAMES} frames, {DURATION:.2f} s\n{mp4}\n{gif}")


def main_onvideo(preview_at=None):
    """Slow SLOW_FROM..SLOW_TO so the chat fits, then overlay the chat (transparent) on the footage."""
    info = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                           "stream=width,height,r_frame_rate:format=duration", "-of", "default=nw=1",
                           SOURCE_VIDEO], capture_output=True, text=True, check=True).stdout
    kv = dict(l.split("=", 1) for l in info.split())
    vw, vh, vdur = int(kv["width"]), int(kv["height"]), float(kv["duration"])
    num, den = kv["r_frame_rate"].split("/"); vfps = round(int(num) / int(den))
    chat_end = CHAT_START + DURATION
    if SLOW_FROM is not None:
        factor = max(1.0, (chat_end - SLOW_FROM) / (min(SLOW_TO, vdur) - SLOW_FROM))
        tempo, chain = 1 / factor, []
        while tempo < 0.5:
            chain.append("atempo=0.5"); tempo /= 0.5
        chain.append(f"atempo={tempo:.6f}")
        slow_to = min(SLOW_TO, vdur)
        tail = vdur - slow_to > 0.05          # is there footage after the slowed part?
        n = 3 if tail else 2
        vf = (f"[0:v]fps={vfps},split={n}" + "".join(f"[v{i}]" for i in range(n)) + ";"
              f"[v0]trim=0:{SLOW_FROM},setpts=PTS-STARTPTS[a0];"
              f"[v1]trim={SLOW_FROM}:{slow_to},setpts=(PTS-STARTPTS)*{factor:.6f},"
              f"minterpolate=fps={vfps}:mi_mode=mci:mc_mode=aobmc:vsbmc=1[a1];"
              + (f"[v2]trim={slow_to},setpts=PTS-STARTPTS[a2];" if tail else "")
              + "".join(f"[a{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[base];"
              f"[0:a]asplit={n}" + "".join(f"[s{i}]" for i in range(n)) + ";"
              f"[s0]atrim=0:{SLOW_FROM},asetpts=PTS-STARTPTS[b0];"
              f"[s1]atrim={SLOW_FROM}:{slow_to},asetpts=PTS-STARTPTS,{','.join(chain)}[b1];"
              + (f"[s2]atrim={slow_to},asetpts=PTS-STARTPTS[b2];" if tail else "")
              + "".join(f"[b{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1[aud];")
        total = vdur + (slow_to - SLOW_FROM) * (factor - 1)
    else:
        vf, total = f"[0:v]fps={vfps}[base];[0:a]anull[aud];", vdur
    if preview_at is not None:   # one composited still, for checking position
        out = os.path.join(OUTPUT_DIR, "preview-laptop-scene.png")
        frame = render(preview_at - CHAT_START).resize((vw, vh), Image.LANCZOS)
        tmp = os.path.join(OUTPUT_DIR, "_frame.png"); frame.save(tmp)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", SOURCE_VIDEO, "-i", tmp, "-filter_complex",
                        vf + f"[aud]anullsink;[base]trim=start={preview_at},setpts=PTS-STARTPTS[b];[b][1:v]overlay[o]",
                        "-map", "[o]", "-frames:v", "1", out], check=True)
        os.remove(tmp); print(out); return
    out = os.path.join(OUTPUT_DIR, ONVIDEO_NAME)
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-i", SOURCE_VIDEO,
         "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS),
         "-i", "-", "-filter_complex",
         vf + f"[1:v]setpts=PTS-STARTPTS+{CHAT_START}/TB,scale={vw}:{vh}:flags=lanczos,fps={vfps}[chat];"
              "[base][chat]overlay=0:0:eof_action=pass:format=auto,format=yuv420p[v]",
         "-map", "[v]", "-map", "[aud]", "-t", f"{total:.3f}",
         "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-r", str(vfps),
         "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    for k in range(N_FRAMES):
        enc.stdin.write(render(k / FPS).tobytes())
    enc.stdin.close(); enc.wait()
    print(f"{out}  ({total:.2f} s, chat {CHAT_START:.2f}-{chat_end:.2f} s)")


if __name__ == "__main__":
    if ON_VIDEO:
        main_onvideo(float(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[2] == "preview" else None)
    elif len(sys.argv) > 2 and sys.argv[1] == "frame":   # debug: python3 laptop_chat_overlay.py frame 6.5 out.png
        render(float(sys.argv[2])).save(sys.argv[3] if len(sys.argv) > 3 else "frame.png")
    else:
        main()
