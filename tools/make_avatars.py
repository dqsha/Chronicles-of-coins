#!/usr/bin/env python3
"""Делает портреты (голова и плечи, квадрат) из полноростовых героев: assets/hero/*.webp -> assets/avatar/*.webp"""
import os, glob
import numpy as np
from PIL import Image
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(root + '/assets/avatar', exist_ok=True)
for f in sorted(glob.glob(root + '/assets/hero/*.webp')):
    im = Image.open(f).convert('RGBA'); a = np.array(im)[..., 3]
    H, W = a.shape
    ys, xs = np.where(a > 40); y0, y1 = ys.min(), ys.max()
    h = y1 - y0
    top = a[y0:y0 + int(h * 0.20)]            # область головы
    hx = np.where((top > 40).any(axis=0))[0]
    cx = (hx.min() + hx.max()) / 2; hw = hx.max() - hx.min()
    side = int(max(hw * 1.55, h * 0.30))        # голова + плечи
    left = int(round(cx - side / 2)); topy = int(y0 - side * 0.06)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(im, (-left, -topy))
    out = canvas.resize((128, 128), Image.LANCZOS)
    out.save(root + '/assets/avatar/' + os.path.basename(f), 'WEBP', quality=92, method=6)
    print(os.path.basename(f), side)
