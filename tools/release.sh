#!/bin/bash
# Запуск: bash tools/release.sh "сообщение коммита"
# Тесты -> сборка -> коммит -> push. Если хоть один тест красный, ничего не выкладывается.
set -e
cd "$(dirname "$0")/.."
for t in test/*.js; do
  out=$(node "$t" src/index.html 2>&1 | tail -1)
  echo "$t: $out"
  echo "$out" | grep -q "OK\|PASSED" || { echo "ТЕСТ КРАСНЫЙ: $t. Выкладка остановлена."; exit 1; }
done
python3 tools/build.py
if [ -n "$1" ]; then
  git add -A
  git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "$1

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
  git push origin HEAD
fi
