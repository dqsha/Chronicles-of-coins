#!/bin/bash
# Запуск: bash tools/release.sh "сообщение коммита"
# Свежая версия с GitHub -> проверка APP_V -> тесты -> сборка -> коммит -> push.
# Если что-то не так, ничего не выкладывается.
set -e
cd "$(dirname "$0")/.."

# 1. Забрать то, что мог выложить другой чат, чтобы не затереть его работу.
git pull --rebase --autostash -q origin "$(git rev-parse --abbrev-ref HEAD)" || {
  echo "Не удалось подтянуть свежую версию с GitHub (конфликт?). Выкладка остановлена."; exit 1; }

# 2. APP_V должен быть новее выложенной версии, иначе приложение не предложит «Обновить».
NEW=$(grep -o "const APP_V='[^']*'" src/index.html | cut -d"'" -f2)
OLD=$(git show HEAD:version.json 2>/dev/null | grep -o '"v":"[^"]*"' | cut -d'"' -f4)
if [ -n "$1" ] && ! git diff --quiet HEAD -- src/index.html 2>/dev/null; then
  if [ "$NEW" = "$OLD" ]; then echo "APP_V не поднят (всё ещё $OLD). Подними APP_V в src/index.html."; exit 1; fi
fi
LATEST=$(printf '%s\n%s\n' "$OLD" "$NEW" | sort -V | tail -1)
if [ "$LATEST" != "$NEW" ]; then echo "APP_V ($NEW) меньше выложенной версии ($OLD). Выкладка остановлена."; exit 1; fi

# 3. Тесты.
for t in test/*.js; do
  out=$(node "$t" src/index.html 2>&1 | tail -1)
  echo "$t: $out"
  echo "$out" | grep -q "OK\|PASSED" || { echo "ТЕСТ КРАСНЫЙ: $t. Выкладка остановлена."; exit 1; }
done

# 4. Сборка и выкладка.
python3 tools/build.py
if [ -n "$1" ]; then
  # Журнал изменений: новая запись сверху (версия, дата, сообщение выкладки)
  python3 - "$1" <<'PY'
import json, sys, datetime, os
v = json.load(open('version.json', encoding='utf8'))['v']
entry = '## %s — %s\n\n- %s\n\n' % (v, datetime.date.today().isoformat(), sys.argv[1])
head = '# Журнал изменений\n\n'
old = open('CHANGELOG.md', encoding='utf8').read() if os.path.exists('CHANGELOG.md') else head
body = old[len(head):] if old.startswith(head) else old
open('CHANGELOG.md', 'w', encoding='utf8').write(head + entry + body)
print('CHANGELOG.md: добавлена запись', v)
PY
  git add -A
  git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -q -m "$1

Co-Authored-By: Claude <noreply@anthropic.com>"
  git push -q origin HEAD
  echo
  echo "ВЫЛОЖЕНО: $NEW"
  echo "НЕ ЗАБУДЬ: допиши блокнот https://claude.ai/artifact/MKvPn13HyA8WfVsq2r2yP1"
  echo "Строка для журнала версий: $(date +'%-d.%m') | $NEW | ${1#*: }"
fi
