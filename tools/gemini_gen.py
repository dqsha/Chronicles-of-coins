#!/usr/bin/env python3
"""Генерация картинок через Gemini API по блокам из prompts/*.txt.

Запуск (на своём компьютере, нужен ключ в переменной GEMINI_API_KEY):
  python gemini_gen.py prompts/prompts-armor.txt 1 2 3 --out gen
  python gemini_gen.py prompts/prompts-armor.txt 1 --ref assets/sheets/human.png --out gen

Блок в файле выглядит так:  === 1. Файл: armor-human-1.png ===
Картинка сохраняется под именем из заголовка блока.
--ref: картинка-образец (можно несколько): чтобы лица совпадали с листом расы.
Модель по умолчанию gemini-3.1-flash-image, можно сменить: --model НАЗВАНИЕ.
Не проверено вживую: сети в моей среде нет.
"""
import argparse, os, re, sys

def blocks(path):
    txt = open(path, encoding="utf-8").read()
    parts = re.split(r"^=== (\d+)\. Файл: (\S+) ===\s*$", txt, flags=re.M)
    res = {}
    for i in range(1, len(parts), 3):
        res[int(parts[i])] = (parts[i + 1], parts[i + 2].split("\n--- ")[0].strip())
    return res

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("nums", nargs="+", type=int)
    ap.add_argument("--out", default="gen")
    ap.add_argument("--ref", action="append", default=[])
    ap.add_argument("--model", default="gemini-3.1-flash-image")
    a = ap.parse_args()
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        sys.exit("Нет ключа: задай переменную GEMINI_API_KEY")
    from google import genai
    from google.genai import types
    from PIL import Image
    client = genai.Client(api_key=key)
    bl = blocks(a.file)
    os.makedirs(a.out, exist_ok=True)
    refs = [Image.open(p) for p in a.ref]
    for n in a.nums:
        if n not in bl:
            print("нет блока", n); continue
        name, prompt = bl[n]
        print("->", n, name, "...", flush=True)
        r = client.models.generate_content(
            model=a.model, contents=refs + [prompt],
            config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]))
        saved = False
        for part in r.candidates[0].content.parts:
            if getattr(part, "inline_data", None) and part.inline_data.data:
                p = os.path.join(a.out, name)
                open(p, "wb").write(part.inline_data.data)
                print("   сохранено", p); saved = True
        if not saved:
            print("   картинки нет, ответ:", (r.text or "")[:200])

if __name__ == "__main__":
    main()
