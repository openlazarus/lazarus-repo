#!/usr/bin/env bash
# Launcher for @playwright/mcp that pins the headless-shell Chromium binary.
#
# Background: on Amazon Linux 2023 the bundled chrome-for-testing build (which
# `--browser chromium` and the default `chrome` channel both resolve to) crashes
# at startup with "chrome_crashpad_handler: --database is required" / SIGTRAP.
# The sibling `chrome-headless-shell` binary in the same install does not have
# this bug, so we point Playwright at it explicitly via --executable-path.
#
# Browsers are installed into $HOME/.cache/ms-playwright/ (lazarus user has
# HOME=/mnt/sdc on prod). We resolve the latest chromium_headless_shell-NNNN
# directory at launch time so version bumps don't require config changes.

set -euo pipefail

CACHE_ROOT="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"

SHELL_BIN=$(
  ls -d "$CACHE_ROOT"/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null \
    | sort -V \
    | tail -1
)

if [ -z "${SHELL_BIN:-}" ] || [ ! -x "$SHELL_BIN" ]; then
  echo "playwright-mcp-launcher: chrome-headless-shell not found under $CACHE_ROOT" >&2
  echo "playwright-mcp-launcher: run 'npx @playwright/mcp@latest install-browser chromium' first" >&2
  exit 1
fi

exec npx -y @playwright/mcp@latest --executable-path="$SHELL_BIN" "$@"
