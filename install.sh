#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-$HOME/.gemini/config/plugins/token-usage}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Installing Antigravity Token Usage Plugin..."

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js (>= 18) is required. Please install Node.js first: https://nodejs.org/" >&2
  exit 1
fi

if [[ ! -f "$SCRIPT_DIR/plugin.json" || ! -f "$SCRIPT_DIR/server/bundle.mjs" ]]; then
  echo "[ERROR] Please run install.sh from the cloned repository root (missing plugin.json or server/bundle.mjs)." >&2
  exit 1
fi

if [[ -d "$TARGET_DIR" ]]; then
  echo "==> Updating existing installation at $TARGET_DIR"
fi

mkdir -p "$TARGET_DIR/server"

for f in plugin.json mcp_config.json README.md README.zh-CN.md LICENSE; do
  if [[ -f "$SCRIPT_DIR/$f" ]]; then
    cp "$SCRIPT_DIR/$f" "$TARGET_DIR/$f"
  fi
done

cp "$SCRIPT_DIR/server/bundle.mjs" "$TARGET_DIR/server/bundle.mjs"

for d in assets skills ui; do
  if [[ -d "$SCRIPT_DIR/$d" ]]; then
    mkdir -p "$TARGET_DIR/$d"
    cp -R "$SCRIPT_DIR/$d/." "$TARGET_DIR/$d/"
  fi
done

echo ""
echo "[OK] Installed successfully to: $TARGET_DIR"
echo "     No npm install required - Antigravity discovers it automatically."
echo ""
echo "How to use / 使用方法:"
echo "  1. Open 'Token Usage' from Antigravity's left sidebar or side pane '+' menu."
echo "     在 Antigravity 左侧边栏或右侧辅助面板 '+' 菜单中打开 Token Usage。"
echo "  2. Or ask in chat: 'Open the Token Usage dashboard' / '打开 Token 用量面板'."
