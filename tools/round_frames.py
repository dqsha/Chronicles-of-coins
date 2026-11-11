"""Скругляет внешние углы пиксельных рамок, сохраняя текстуру: маска со сглаживанием + тёмная обводка по дуге.
Запуск: python3 tools/round_frames.py  -> assets/*-r.webp"""
from PIL import Image, ImageDraw, ImageFilter
import os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = lambda f: os.path.join(root, 'assets', f)
def edge_color(im):
    w, h = im.size; px = im.load(); cs = [px[w//2, 1], px[1, h//2], px[w//2, h-2], px[w-2, h//2]]
    return tuple(sum(c[i] for c in cs)//4 for i in range(3))
def round_frame(src, dst, r, ow):
    im = Image.open(A(src)).convert('RGBA'); w, h = im.size; S = 4
    m = Image.new('L', (w*S, h*S), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w*S-1, h*S-1], r*S, fill=255)
    mask = m.resize((w, h), Image.LANCZOS)
    # обводка: полоса шириной ow вдоль скруглённого края, только в углах (на прямых краях она уже нарисована)
    inner = Image.new('L', (w*S, h*S), 0); ImageDraw.Draw(inner).rounded_rectangle([ow*S, ow*S, w*S-1-ow*S, h*S-1-ow*S], max(1, (r-ow))*S, fill=255)
    ring = Image.eval(Image.composite(m, Image.new('L', m.size, 0), Image.eval(inner, lambda v: 255-v)).resize((w, h), Image.LANCZOS), lambda v: v)
    corner = Image.new('L', (w, h), 0); d = ImageDraw.Draw(corner); c = r + 2
    for x0, y0 in [(0, 0), (w-c, 0), (0, h-c), (w-c, h-c)]: d.rectangle([x0, y0, x0+c, y0+c], fill=255)
    ring = Image.composite(ring, Image.new('L', (w, h), 0), corner)
    oc = edge_color(im); out = im.copy()
    out = Image.composite(Image.new('RGBA', (w, h), oc + (255,)), out, ring)
    a = Image.composite(out.getchannel('A'), Image.new('L', (w, h), 0), mask)
    a = Image.fromarray(__import__('numpy').minimum(__import__('numpy').array(out.getchannel('A')), __import__('numpy').array(mask)))
    out.putalpha(a); out.save(A(dst), 'WEBP', lossless=True, method=6); print(dst, os.path.getsize(A(dst)))
round_frame('panel-stone.png', 'panel-stone-r.webp', r=20, ow=5)
for b in ['gold', 'gray', 'green', 'red', 'pressed']:
    round_frame('btn-%s.png' % b, 'btn-%s-r.webp' % b, r=11, ow=3)
