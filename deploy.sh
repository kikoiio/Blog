#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

message="${1:-}"

echo "==> Building production site"
hugo --gc --minify

echo
echo "==> Git status"
git status --short

if git diff --cached --quiet; then
    echo
    echo "No staged changes found."
    echo "Stage only the files you want to publish, then rerun:"
    echo "  ./deploy.sh \"commit message\""
    exit 0
fi

if [[ -z "$message" ]]; then
    echo
    echo "A commit message is required when staged changes are present."
    echo "Usage: ./deploy.sh \"commit message\""
    exit 1
fi

echo
echo "==> Committing staged changes"
git commit -m "$message"

echo
echo "==> Pushing to origin"
git push
