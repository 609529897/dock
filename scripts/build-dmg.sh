#!/bin/bash
# 构建 Wails 应用并打包为 DMG
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

REFERENCE_DIR="${PROJECT_DIR}/frontend/resource"
APP_NAME=$(node -e "console.log(require('./wails.json').name)")
BUNDLE_NAME="${APP_NAME}.app"
DMG_NAME="${APP_NAME}.dmg"
APP_PATH="build/bin/${BUNDLE_NAME}"
DMG_OUTPUT="build/${DMG_NAME}"

echo "正在构建：${APP_NAME}"

# 清理旧产物
rm -rf build/bin
rm -f "$DMG_OUTPUT"

# 从参考目录同步应用图标
mkdir -p build/darwin
cp "${REFERENCE_DIR}/icons/icon-1024.png" build/appicon.png
cp "${REFERENCE_DIR}/icon.icns" build/darwin/appicon.icns

# 构建 Wails 应用
wails build -platform darwin/arm64

echo "正在生成 DMG..."

if command -v create-dmg >/dev/null 2>&1; then
  # 使用 create-dmg 生成带界面布局的 DMG（推荐）
  create-dmg \
    --volname "$APP_NAME" \
    --app-drop-link 550 185 \
    --window-size 660 330 \
    --icon-size 120 \
    --icon "$BUNDLE_NAME" 180 185 \
    "$DMG_OUTPUT" \
    "$APP_PATH"
else
  # 降级使用 macOS 自带 hdiutil
  echo "未找到 create-dmg，使用 hdiutil 生成基础 DMG"
  TMP_DMG="build/tmp-${APP_NAME}.dmg"
  hdiutil create -srcfolder "$APP_PATH" -volname "$APP_NAME" -fs HFS+ \
    -format UDRW -ov -o "$TMP_DMG"
  hdiutil convert "$TMP_DMG" -format UDZO -ov -o "$DMG_OUTPUT"
  rm -f "$TMP_DMG"
fi

echo "完成：${DMG_OUTPUT}"
