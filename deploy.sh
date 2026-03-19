#!/bin/bash
cd "$(dirname "$0")"
git add .
git commit -m "${1:-更新笔记}"
git push
