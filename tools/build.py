"""Собирает index.html из src/index.html и пишет version.json из APP_V."""
import re, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(os.path.join(root, 'src', 'index.html'), encoding='utf8').read().rstrip()
pre = '<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n'
open(os.path.join(root, 'index.html'), 'w', encoding='utf8').write(pre + s + '\n</body></html>\n')
v = re.search(r"const APP_V='([^']+)'", s).group(1)
open(os.path.join(root, 'version.json'), 'w', encoding='utf8').write('{"v":"%s"}\n' % v)
print('built version', v)
