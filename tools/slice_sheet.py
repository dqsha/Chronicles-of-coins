#!/usr/bin/env python3
"""Нарезка листа из Gemini (розовый фон #FF00FF) на отдельные спрайты с прозрачностью.
Использование: python3 tools/slice_sheet.py лист.png 4 out/prefix [--clean-lines] [--merge-dist 60]
Спрайты сохраняются как out/prefix-1.webp ... слева направо."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def bgmask(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (r > 190) & (b > 170) & (g < 150) & (np.minimum(r, b) - g > 110)

def clean_lines(a):
    """Убирает тонкие чёрные линии-разделители и линию земли, которые иногда рисует Gemini."""
    a = a.copy(); H, W = a.shape[:2]; bg = bgmask(a); pink = np.array([255, 40, 250])
    rows = np.where((~bg).mean(axis=1) > 0.7)[0]
    cols = np.where((~bg).mean(axis=0) > 0.7)[0]
    if len(rows):
        y0, y1 = rows.min(), rows.max()
        for x in range(W):
            src = a[y0 - 1, x] if y0 > 0 else pink
            for y in range(y0, y1 + 1):
                a[y, x] = src if not bgmask(src[None, None, :])[0, 0] else pink
    for x in cols:
        a[:, x] = pink
    return a

def main():
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    src, n, prefix = args[0], int(args[1]), args[2]
    clean = '--clean-lines' in sys.argv
    im = Image.open(src).convert('RGB'); a = np.array(im).astype(int)
    if clean: a = clean_lines(a)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    pk = np.minimum(r, b) - g
    alpha = np.clip((150 - pk) / 70.0, 0, 1)
    alpha = np.where(alpha > 0.55, 1.0, np.where(alpha < 0.25, 0.0, alpha))
    fg = ndi.binary_opening(alpha > 0.5, iterations=1)
    lab = None
    for d in (2, 3, 5, 8, 12):
        lab, cnt = ndi.label(ndi.binary_dilation(fg, iterations=d))
        areas = ndi.sum(fg, lab, range(1, cnt + 1))
        big = [i + 1 for i, ar in enumerate(areas) if ar >= 0.08 * areas.max()]
        if len(big) <= n: break
    if len(big) != n:
        print('ОШИБКА: найдено крупных частей', len(big), 'а нужно', n); sys.exit(1)
    # мелкие обломки (дым, искры) присоединяем к ближайшей крупной части
    dist = [ndi.distance_transform_edt(lab != k) for k in big]
    owner = np.zeros(lab.shape, int)
    smalls = [i + 1 for i in range(cnt) if (i + 1) not in big]
    for k, bk in enumerate(big): owner[lab == bk] = k + 1
    for sidx in smalls:
        m = lab == sidx
        ys, xs = np.where(m); cy, cx = int(ys.mean()), int(xs.mean())
        best = min(range(len(big)), key=lambda k: dist[k][cy, cx])
        owner[m] = best + 1
    order = sorted(range(1, n + 1), key=lambda k: np.where(owner == k)[1].mean())
    # снятие розовой каймы: вычитаем вклад фона, затем срезаем самый внешний слой
    bgc = np.array([255, 40, 250]); af = np.maximum(alpha, 0.001)[..., None]
    rgb = np.clip((a - (1 - af) * bgc) / af, 0, 255)
    edge = (alpha > 0) & (alpha < 1)
    purple = (pk > 70) & edge
    alpha = np.where(purple, 0, alpha)
    if '--nopink' in sys.argv:  # свечение у оружия смешивается с розовым фоном: срезаем ярко-розовые пиксели
        import colorsys
        mx = rgb.max(axis=2); mn = rgb.min(axis=2); v = mx / 255.0
        sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
        rr, gg, bb = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        hue = np.degrees(np.arctan2(np.sqrt(3) * (gg - bb), 2 * rr - gg - bb)) % 360
        halo = (hue > 295) & (hue < 350) & (sat > 0.18) & (v > 0.72) & (rr > gg + 25) & (bb > gg + 25)
        halo = ndi.binary_dilation(halo, iterations=1) & (alpha < 1.0) | halo
        alpha = np.where(halo, 0, alpha)
        alpha = np.where(ndi.binary_opening(alpha > 0.5, iterations=1), alpha, 0)
    for idx, k in enumerate(order, 1):
        m = owner == k
        al = alpha * m
        ys, xs = np.where(al > 0)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        out = np.dstack([rgb, al * 255])[y0:y1, x0:x1].astype(np.uint8)
        Image.fromarray(out, 'RGBA').save('%s-%d.webp' % (prefix, idx), lossless=True, method=6)
        print('%s-%d.webp %dx%d' % (prefix, idx, x1 - x0, y1 - y0))

main()
