from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

ANTON = '/usr/share/fonts/truetype/google-fonts/ofl/anton/Anton-Regular.ttf'
ROBOTO = '/usr/share/fonts/truetype/google-fonts/ofl/roboto/Roboto[wdth,wght].ttf'
R = '/home/claude/avivihavivi/r/'
W = '/home/claude/work/'


def font(size, kind='anton'):
    if kind == 'anton':
        return ImageFont.truetype(ANTON, size)
    f = ImageFont.truetype(ROBOTO, size)
    try:
        f.set_variation_by_axes([75, 800])  # condensed, extra bold
    except Exception:
        pass
    return f


def load(n):
    return Image.open(R + n + '.jpg').convert('RGB')


def face_espn(name):
    return Image.open(W + f'face_{name}.webp').convert('RGBA')


def face_local(slug, tol=28, crop=(70, 5, 250, 185)):
    """Embedded 320px site headshot on white: knock out the white background by flood fill from the edges."""
    im = Image.open(W + f'pics/{slug}.webp').convert('RGB')
    a = np.asarray(im).astype(int)
    h, w, _ = a.shape
    white = (a.min(axis=2) > 255 - tol)
    mask = np.zeros((h, w), bool)
    from collections import deque
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if white[y, x] and not mask[y, x]:
                mask[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if white[y, x] and not mask[y, x]:
                mask[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and white[yy, xx] and not mask[yy, xx]:
                mask[yy, xx] = True; q.append((yy, xx))
    alpha = Image.fromarray(((~mask) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))
    out = im.convert('RGBA'); out.putalpha(alpha)
    # crop to roughly match the ESPN framing (head + top of shoulders)
    return out.crop(crop).resize((150, 150), Image.LANCZOS)


def bg_fill(img, box, sample_x=None, top_frac=0.55):
    """Repaint box with a vertical gradient sampled from the box's left/right inner edge columns."""
    x0, y0, x1, y1 = box
    a = np.asarray(img).astype(float)
    cols = [x0 + 2, x1 - 3] if sample_x is None else sample_x
    prof = np.mean([a[y0:y1, c] for c in cols], axis=0)  # (h,3)
    hcut = int((y1 - y0) * top_frac)
    # smooth and freeze below cut (shoulders usually reach edges there)
    for i in range(hcut, y1 - y0):
        prof[i] = prof[hcut - 1] + (prof[hcut - 1] - prof[max(0, hcut - 15)]) * min(1, (i - hcut) / 30) * 0.5
    prof = np.clip(prof, 0, 255)
    block = np.repeat(prof[:, None, :], x1 - x0, axis=1).astype('uint8')
    img.paste(Image.fromarray(block), (x0, y0))


def solid(img, box, color):
    ImageDraw.Draw(img).rectangle([box[0], box[1], box[2] - 1, box[3] - 1], fill=color)


def sample(img, xy):
    return img.getpixel(xy)


def text_center(img, box, txt, size, color=(0, 0, 0), kind='anton', dy=0):
    d = ImageDraw.Draw(img)
    f = font(size, kind)
    l, t, r, b = d.textbbox((0, 0), txt, font=f)
    cx = (box[0] + box[2]) / 2 - (l + r) / 2
    cy = (box[1] + box[3]) / 2 - (t + b) / 2 + dy
    d.text((cx, cy), txt, font=f, fill=color)


def name_line(img, box, letter, lcolor, name, size, ncolor=(255, 255, 255), kind='anton', align='center', gap=4, dy=0):
    d = ImageDraw.Draw(img)
    f = font(size, kind)
    lb = d.textbbox((0, 0), letter, font=f)
    nb = d.textbbox((0, 0), name, font=f)
    wl = lb[2] - lb[0]; wn = nb[2] - nb[0]
    tot = wl + gap + wn
    if align == 'center':
        x = (box[0] + box[2]) / 2 - tot / 2
    else:
        x = box[0]
    cy = (box[1] + box[3]) / 2 - (nb[1] + nb[3]) / 2 + dy
    d.text((x - lb[0], cy), letter, font=f, fill=lcolor)
    d.text((x + wl + gap - nb[0], cy), name, font=f, fill=ncolor)


def put_face(img, inner, face, scale=1.12, top_off=0.02, xshift=0):
    x0, y0, x1, y1 = inner
    w = x1 - x0; h = y1 - y0
    fw = int(w * scale)
    f = face.resize((fw, fw), Image.LANCZOS)
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    layer.paste(f, (x0 + (w - fw) // 2 + xshift, y0 + int(h * top_off)), f)
    clip = Image.new('L', img.size, 0)
    ImageDraw.Draw(clip).rectangle([x0, y0, x1 - 1, y1 - 1], fill=255)
    a = Image.fromarray(np.minimum(np.asarray(layer.split()[3]), np.asarray(clip)))
    layer.putalpha(a)
    base = img.convert('RGBA'); base.alpha_composite(layer)
    img.paste(base.convert('RGB'))


def shift_units(img, units, new_unit_img, bg, extra_slots=None, extend_to=None):
    """units: ordered list of (x0,y0,x1,y1) boxes. Moves unit i -> slot i+1, new unit into slot 0.
    extra_slots: boxes for the overflow (on an extended canvas). bg: fill colour for cleared slots."""
    src = img.copy()
    crops = [src.crop(u) for u in units]
    if extend_to:
        big = Image.new('RGB', (img.width, extend_to), bg)
        big.paste(img, (0, 0)); img = big
    slots = list(units) + list(extra_slots or [])
    for u in units:
        solid(img, u, bg)
    def place(c, s):
        sx = s[0] + ((s[2] - s[0]) - c.width) // 2
        sy = s[1] + ((s[3] - s[1]) - c.height) // 2
        img.paste(c, (sx, sy))
    place(new_unit_img, slots[0])
    for i, c in enumerate(crops):
        place(c, slots[i + 1])
    return img


from PIL import ImageChops

def erase_text(img, box, k=13):
    """Remove bright text from a dark strip: min-filter then blur."""
    reg = img.crop(box)
    clean = reg.filter(ImageFilter.MinFilter(k)).filter(ImageFilter.GaussianBlur(3))
    img.paste(clean, box[:2])


def shift(img, tiles, names, new_tile, new_name, extra_tiles=(), extra_names=(), extend_to=None, bg=(8, 8, 8)):
    """tiles/names: ordered slot boxes (all tiles equal size; names = text strip under each tile).
    Moves every unit one slot later; the newest fight goes into slot 0."""
    src = img.copy()
    tcrops = [src.crop(t) for t in tiles]
    ncrops = [isolate_name(src.crop(n)) for n in names]
    if extend_to:
        big = Image.new('RGB', (img.width, extend_to), bg)
        big.paste(img, (0, 0)); img = big
    T = list(tiles) + list(extra_tiles); N = list(names) + list(extra_names)
    for n in names:
        iso = np.asarray(_iso_old(src.crop(n))).max(axis=2).max(axis=0)
        cols = np.where(iso > 60)[0]
        if len(cols):
            l = max(0, cols[0] - 4); r = min(n[2] - n[0], cols[-1] + 5)
            erase_text(img, (n[0] + l, n[1], n[0] + r, n[3]))
    def ptile(c, box):
        img.paste(c.resize((box[2]-box[0], box[3]-box[1]), Image.LANCZOS) if c.size != (box[2]-box[0], box[3]-box[1]) else c, box[:2])
    def pname(c, box):
        bw, bh = box[2]-box[0], box[3]-box[1]
        cx = box[0] + (bw - c.width)//2; cy = box[1] + (bh - c.height)//2
        reg = img.crop((cx, cy, cx + c.width, cy + c.height))
        img.paste(ImageChops.lighter(reg, c), (cx, cy))
    ptile(new_tile, T[0]); pname(new_name, N[0])
    for i in range(len(tcrops)):
        ptile(tcrops[i], T[i+1]); pname(ncrops[i], N[i+1])
    return img


def build_tile(img, tile, inner, label, label_fill, face, method, msize, face_scale=1.12, face_top=0.02, bgcols=None, xshift=0):
    """Make a new tile image from the template tile at `tile` (coords in img)."""
    t = img.crop(tile).copy()
    ox, oy = tile[:2]
    inn = (inner[0]-ox, inner[1]-oy, inner[2]-ox, inner[3]-oy)
    lab = (label[0]-ox, label[1]-oy, label[2]-ox, label[3]-oy)
    labimg = t.crop(lab)
    bg_fill(t, inn, sample_x=bgcols)
    put_face(t, inn, face, scale=face_scale, top_off=face_top, xshift=xshift)
    t.paste(labimg, lab[:2])
    return t, lab


def name_strip(size_wh, bgc, letter, lcolor, name, fsize, kind='anton', gap=4, dy=0):
    s = Image.new('RGB', size_wh, (0, 0, 0))
    name_line(s, (0, 0) + size_wh, letter, lcolor, name, fsize, kind=kind, gap=gap, dy=dy)
    return s


def isolate_name(c, thr=90, gap=11):
    """Keep only the text cluster around the strip's centre (drop neighbours' name fragments)."""
    a = np.asarray(c).astype(int)
    bright = (a.max(axis=2) > thr)
    col = bright.any(axis=0)
    w = len(col); mid = w // 2
    # find nearest bright column to centre
    idx = np.where(col)[0]
    if len(idx) == 0:
        return c
    start = idx[np.argmin(abs(idx - mid))]
    l = start; dark = 0
    while l > 0:
        if col[l - 1]: dark = 0
        else:
            dark += 1
            if dark >= gap: break
        l -= 1
    r = start; dark = 0
    while r < w - 1:
        if col[r + 1]: dark = 0
        else:
            dark += 1
            if dark >= gap: break
        r += 1
    out = np.zeros_like(a)
    out[:, l:r + 1] = a[:, l:r + 1]
    return Image.fromarray(out.astype('uint8'))


_iso_old = isolate_name
def isolate_name(c, thr=90, gap=11):
    out = _iso_old(c, thr, gap)
    a = np.asarray(out).astype(int)
    bright = a.max(axis=2) > thr
    col = bright.any(axis=0)
    idx = np.where(col)[0]
    if len(idx) == 0:
        return out
    # split into segments separated by >=4 dark columns
    segs = []; s = idx[0]; p = idx[0]
    for i in idx[1:]:
        if i - p > 4:
            segs.append((s, p)); s = i
        p = i
    segs.append((s, p))
    def white_narrow(seg):
        l, r = seg
        if r - l > 16: return False
        if not (l <= 3 or r >= a.shape[1] - 4): return False
        px = a[:, l:r + 1][bright[:, l:r + 1]]
        sat = (px.max(axis=1) - px.min(axis=1)).mean()
        return sat < 60
    for seg in (segs[0], segs[-1]) if len(segs) > 1 else ():
        if white_narrow(seg):
            a[:, seg[0]:seg[1] + 1] = 0
    return Image.fromarray(a.astype('uint8'))


def erase_interp(img, box, blur=2):
    """Fill box by vertical interpolation between the rows just above and below it (for light/gradient backgrounds)."""
    x0, y0, x1, y1 = box
    a = np.asarray(img).astype(float)
    top = a[max(0, y0 - 2):y0, x0:x1].mean(axis=0)
    bot = a[y1:min(a.shape[0], y1 + 2), x0:x1].mean(axis=0) if y1 + 1 < a.shape[0] else top
    h = y1 - y0
    t = np.linspace(0, 1, h)[:, None, None]
    blk = (top[None] * (1 - t) + bot[None] * t).clip(0, 255).astype('uint8')
    im = Image.fromarray(blk)
    if blur: im = im.filter(ImageFilter.GaussianBlur(blur))
    img.paste(im, (x0, y0))


def draw_name(img, box, letter, lc, name, size=17, stroke=2, gap=4, ncolor=(255, 255, 255), dy=0):
    d = ImageDraw.Draw(img); f = font(size)
    lb = d.textbbox((0, 0), letter, font=f); nb = d.textbbox((0, 0), name, font=f)
    tot = (lb[2] - lb[0]) + gap + (nb[2] - nb[0])
    x = (box[0] + box[2]) / 2 - tot / 2; y = (box[1] + box[3]) / 2 - (nb[1] + nb[3]) / 2 + dy
    d.text((x - lb[0], y), letter, font=f, fill=lc, stroke_width=stroke, stroke_fill=(15, 5, 5))
    d.text((x + (lb[2] - lb[0]) + gap - nb[0], y), name, font=f, fill=ncolor, stroke_width=stroke, stroke_fill=(10, 10, 10))


_iso2 = isolate_name
def isolate_name(c, thr=90, gap=11):
    out = _iso2(c, thr, gap)
    a = np.asarray(out).astype(int)
    mx = a.max(axis=2); sat = mx - a.min(axis=2)
    keep = (mx > 195) | ((sat > 90) & (mx > 110))
    m = Image.fromarray((keep * 255).astype('uint8')).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    k = np.asarray(m).astype(float)[..., None] / 255
    return Image.fromarray((a * k).astype('uint8'))


def erase_mask(img, box, k=11):
    """Erase only text-like pixels (bright white or saturated letters) inside box, filling from a min-filtered copy."""
    reg = img.crop(box)
    a = np.asarray(reg).astype(int)
    mx = a.max(axis=2); sat = mx - a.min(axis=2)
    keep = (mx > 170) | ((sat > 70) & (mx > 80))
    m = Image.fromarray((keep * 255).astype('uint8')).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(1))
    clean = reg.filter(ImageFilter.MinFilter(k)).filter(ImageFilter.GaussianBlur(2))
    img.paste(Image.composite(clean, reg, m), box[:2])


def table_insert(slug, IY, BH, band_src_y, cols, size, yoff, out, x_clear=(None, None), w=400):
    """Insert a shaded row of height BH at y=IY, copying the shading band from band_src_y. cols: [(x,text,color)]."""
    img = load(slug)
    new = Image.new('RGB', (img.width, img.height + BH), (255, 255, 255))
    new.paste(img.crop((0, 0, img.width, IY)), (0, 0))
    new.paste(img.crop((0, IY, img.width, img.height)), (0, IY + BH))
    band = img.crop((0, band_src_y, img.width, band_src_y + BH))
    new.paste(band, (0, IY))
    d = ImageDraw.Draw(new)
    xc0 = x_clear[0] if x_clear[0] is not None else 30
    xc1 = x_clear[1] if x_clear[1] is not None else img.width - 20
    d.rectangle([xc0, IY + 2, xc1, IY + BH - 3], fill=band.getpixel((xc1 - 2, BH // 2)))
    f = ImageFont.truetype(ROBOTO, size); f.set_variation_by_axes([w, 100])
    b = d.textbbox((0, 0), 'Hd', font=f)
    for x, t, c in cols:
        d.text((x, IY + yoff - (b[1] + b[3]) / 2), t, font=f, fill=c)
    new.save(out, quality=95)
    return new


def grey_rgba(f):
    return Image.merge('RGBA', (*f.convert('L').convert('RGB').split(), f.split()[3]))


def rebuild(slug, TW, TH, slots, tmpl_i, inner, label, face, method, names, name_dy, name_h, fsize,
            new_slot, ext_h, lab_fill=(250, 250, 248), lab_txt=(10, 10, 10), lab_size=17, lab_inset=3,
            face_scale=1.1, face_top=0.0, bgcols=None, stroke=0, ncolor=(240, 240, 240), name_pad=14,
            gap=4, erase_above=0, out=None, mirror=True, dark=0.6, lab_dy=0, order=None, top_fill=0):
    """Generic: shift tiles one slot later, new tile at slot 0, redraw every name in Anton."""
    img = load(slug)
    src = img.copy(); crops = [src.crop((x, y, x + TW, y + TH)) for x, y in slots]
    tx, ty = slots[tmpl_i]
    t, lab = build_tile(img, (tx, ty, tx + TW, ty + TH), inner, label, None, face, method, 0,
                        face_scale=face_scale, face_top=face_top, bgcols=bgcols)
    if top_fill:
        bg_fill(t, (0, 0, TW, top_fill), sample_x=[1, TW - 2], top_frac=1.0)
    li = (lab[0] + lab_inset, lab[1] + lab_inset, lab[2] - lab_inset, lab[3] - lab_inset)
    solid(t, li, lab_fill); text_center(t, li, method, lab_size, lab_txt, dy=lab_dy)
    H = img.height
    if ext_h:
        if mirror:
            ext = img.crop((0, H - ext_h, img.width, H)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(16))
            ext = Image.eval(ext, lambda v: int(v * dark))
        else:
            ext = Image.new('RGB', (img.width, ext_h), (8, 8, 8))
        out_img = Image.new('RGB', (img.width, H + ext_h)); out_img.paste(img, (0, 0)); out_img.paste(ext, (0, H))
        seam = out_img.crop((0, H - 10, img.width, H + 10)).filter(ImageFilter.GaussianBlur(5)); out_img.paste(seam, (0, H - 10))
    else:
        out_img = img
    W2, H2 = out_img.size
    for x, y in (order or slots):
        erase_mask(out_img, (max(0, x - name_pad), min(H2 - 1, y + TH + name_dy), min(W2, x + TW + name_pad), min(H2, y + TH + name_dy + name_h)))
        if erase_above:
            erase_text(out_img, (x - 2, y - erase_above, x + TW + 2, y - 1), k=21)
    allslots = order or (list(slots) + [new_slot])
    out_img.paste(t, allslots[0])
    for i, c in enumerate(crops):
        out_img.paste(c, allslots[i + 1])
    for (x, y), (l, lc, n) in zip(allslots, names):
        draw_name(out_img, (x - name_pad, y + TH + name_dy, x + TW + name_pad, y + TH + name_dy + name_h), l, lc, n,
                  size=fsize, stroke=stroke, gap=gap, ncolor=ncolor)
    out_img.save(out or f'{W}out_{slug}.jpg', quality=92)
    return out_img

G_ = (45, 200, 60); R_ = (220, 35, 35)


def inpaint_text(img, box, r=5):
    """Remove bright/saturated text inside box using OpenCV inpainting (works on textured backgrounds)."""
    import cv2
    reg = np.asarray(img.crop(box)).copy()
    a = reg.astype(int); mx = a.max(axis=2); sat = mx - a.min(axis=2)
    m = ((mx > 200) | ((sat > 90) & (mx > 110)) & ~((a[..., 0] > 150) & (a[..., 1] > 90) & (a[..., 1] < 170) & (a[..., 2] < 140) & (sat < 110)))
    m = cv2.dilate(m.astype('uint8') * 255, np.ones((5, 5), np.uint8))
    out = cv2.inpaint(reg[..., ::-1].copy(), m, r, cv2.INPAINT_TELEA)[..., ::-1]
    img.paste(Image.fromarray(out), box[:2])
