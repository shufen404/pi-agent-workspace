#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo '请先安装 Node.js 22 或更高版本，然后重新启动。'
  echo '下载地址：https://nodejs.org/'
  printf '按回车关闭…'; read -r answer
  exit 1
fi
node scripts/local-release.mjs
result=$?
if [ "$result" -ne 0 ]; then printf '按回车关闭…'; read -r answer; fi
exit "$result"
