#!/usr/bin/env python3
"""Инструменты для пиксель-арта из Hugging Face: картинки 1024 = сетка 128x128 (пиксель 8x8).
native(path)   -> массив 128x128 RGBA (фон #FF00FF станет прозрачным при keyed=True)
upscale(arr,k) -> увеличение без размытия
fix_blade(arr) -> убирает лишние чёрные пиксели на контуре меча
hold(char, weapon, grip_xy, fist_box) -> вкладывает оружие в руку (кулак рисуется поверх рукояти)
"""
from PIL import Image
import numpy as np

def native(path, keyed=True):
    a = np.array(Image.open(path).convert("RGBA"))[4::8, 4::8].copy()
    if keyed:
        m = (a[..., 0] > 240) & (a[..., 1] < 10) & (a[..., 2] > 240)
        a[m] = (0, 0, 0, 0)
    return a

def upscale(a, k=8):
    return np.kron(a, np.ones((k, k, 1), dtype=a.dtype))

def save(a, path, k=8, bg=None):
    im = Image.fromarray(upscale(a, k))
    if bg:
        b = Image.new("RGBA", im.size, bg); b.alpha_composite(im); im = b
    im.save(path)

def _blk(p):
    return p[3] > 0 and p[0] < 40 and p[1] < 40 and p[2] < 40

def fix_blade(a):
    """Контур лезвия: если чёрных подряд >1 по горизонтали с левой стороны, оставляем 1 внутренний."""
    a = a.copy(); H, W = a.shape[:2]
    for y in range(H):
        for x in range(1, W - 1):
            if _blk(a[y, x]) and a[y, x - 1][3] == 0 and _blk(a[y, x + 1]):
                # внешний пиксель двойного контура слева: убираем только если ниже/выше контур одинарный
                single = any(a[yy, x][3] == 0 and _blk(a[yy, x - 0 + 1]) for yy in (y - 1, y + 1) if 0 <= yy < H)
                if single:
                    a[y, x] = (0, 0, 0, 0)
    return a

def bbox(a):
    ys, xs = np.where(a[..., 3] > 0)
    return xs.min(), ys.min(), xs.max(), ys.max()

def shrink(a, h):
    """Уменьшить спрайт до высоты h строк, цвет блока = самый частый (пиксельная чистота)."""
    x0, y0, x1, y1 = bbox(a); c = a[y0:y1 + 1, x0:x1 + 1]
    H, W = c.shape[:2]; f = h / H; nw = max(1, round(W * f))
    out = np.zeros((h, nw, 4), np.uint8)
    for j in range(h):
        for i in range(nw):
            blk = c[int(j / f):max(int(j / f) + 1, int((j + 1) / f)), int(i / f):max(int(i / f) + 1, int((i + 1) / f))].reshape(-1, 4)
            vis = blk[blk[:, 3] > 0]
            if len(vis) * 2 < len(blk): continue
            vals, cnt = np.unique(vis, axis=0, return_counts=True)
            dark = [v for v in vals if v[0] < 40 and v[1] < 40 and v[2] < 40]
            out[j, i] = dark[0] if dark and len(vis) >= 1 and any(_blk(v) for v in vis) and len(dark) else vals[cnt.argmax()]
    return out

def hold(char, weapon, grip, fist):
    """grip=(x,y): куда ставим центр рукояти оружия (x центр, y низ перекрестия).
    fist=(x0,y0,x1,y1): область кулака; её пиксели из персонажа рисуются поверх оружия."""
    out = char.copy(); wx0, wy0, wx1, wy1 = bbox(weapon)
    w = weapon[wy0:wy1 + 1, wx0:wx1 + 1]
    ox = grip[0] - w.shape[1] // 2; oy = grip[1]
    for j in range(w.shape[0]):
        for i in range(w.shape[1]):
            if w[j, i][3] and 0 <= oy + j < out.shape[0] and 0 <= ox + i < out.shape[1]:
                out[oy + j, ox + i] = w[j, i]
    x0, y0, x1, y1 = fist
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if char[y, x][3]: out[y, x] = char[y, x]
    return out
