#!/usr/bin/env python3
"""按 macOS 规范生成应用图标与菜单栏图标，内置官方安全区域留白，避免系统裁剪。"""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "resource" / "icons"

APP_ICON_SIZE = 1024
# Apple HIG 官方安全区域比例：核心内容限制在中心824px
SAFE_CONTENT_RATIO = 824 / 1024
MACOS_CORNER_RADIUS_RATIO = 0.2237
TRAY_ICON_1X = 16
TRAY_ICON_2X = 32


def macos_icon_radius(size: int) -> int:
    """计算macOS图标圆角半径"""
    return max(1, round(size * MACOS_CORNER_RADIUS_RATIO))


def apply_macos_squircle_mask(image: Image.Image) -> Image.Image:
    """应用macOS图标圆角蒙版"""
    size = image.size[0]
    radius = macos_icon_radius(size)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(image.convert("RGBA"), (0, 0), mask)
    return result


def apply_safe_padding(image: Image.Image) -> Image.Image:
    """
    添加官方安全区域：原图缩小居中，四周填充透明留白，防止系统动态裁剪
    """
    full_size = image.width
    inner_size = round(full_size * SAFE_CONTENT_RATIO)
    # 等比例缩小原图至安全区尺寸
    inner_img = image.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    # 新建完整尺寸透明画布
    padded_canvas = Image.new("RGBA", (full_size, full_size), (0, 0, 0, 0))
    offset = (full_size - inner_size) // 2
    padded_canvas.paste(inner_img, (offset, offset), mask=inner_img)
    return padded_canvas


def generate_tray_icon(size: int, output: Path) -> None:
    """菜单栏托盘图标 — 简化舵轮（外圈+十字辐条），仅线条避免黑块"""
    scale = size / TRAY_ICON_1X
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    black = (0, 0, 0, 255)
    stroke = max(1, round(1.2 * scale))
    cx, cy = size / 2, size / 2
    r = max(3, round(5 * scale))
    # 外圈
    draw.ellipse(
        [(cx - r, cy - r), (cx + r, cy + r)],
        outline=black, width=stroke
    )
    # 十字辐条
    draw.line((cx, cy - r, cx, cy + r), fill=black, width=stroke)
    draw.line((cx - r, cy, cx + r, cy), fill=black, width=stroke)
    img.save(output, optimize=True)


def add_drop_shadow(image: Image.Image, offset: int = 16, radius: int = 10, opacity: float = 0.2) -> Image.Image:
    """为图标添加微暖白底 + 投影，让白色背景明确可见"""
    size = image.size[0]
    img_px = image.load()

    # 暖白底色 (248,248,250) — 比纯白稍微暖一点，容易和壁纸区分
    bg = Image.new("RGBA", (size, size), (248, 248, 250, 255))

    # 提取前景（舵轮）蒙版
    fg_mask = Image.new("L", (size, size), 0)
    fg_px = fg_mask.load()
    for x in range(size):
        for y in range(size):
            r, g, b, a = img_px[x, y]
            if a > 80 and not (r > 248 and g > 248 and b > 248):
                fg_px[x, y] = 255

    # 舵轮偏移作阴影
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    s_px = shadow.load()
    for x in range(size):
        for y in range(size):
            v = fg_px[x, y]
            if v > 0 and y + offset < size:
                s_px[x, y + offset] = (0, 0, 0, int(255 * opacity))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=radius))
    bg = Image.alpha_composite(bg, shadow)

    # 舵轮前景叠在阴影之上
    fg_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    fgpx = fg_img.load()
    for x in range(size):
        for y in range(size):
            r, g, b, a = img_px[x, y]
            if a > 80 and not (r > 248 and g > 248 and b > 248):
                fgpx[x, y] = (r, g, b, a)

    return Image.alpha_composite(bg, fg_img)


def add_icon_border(image: Image.Image, border_width: int = 2, color: tuple = (235, 235, 237, 255)) -> Image.Image:
    """在图标边缘添加细微边框，让白色背景明确可见"""
    size = image.size[0]
    radius = macos_icon_radius(size)
    border = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(border)
    # 画一个略大的圆角矩形作为边框底
    draw.rounded_rectangle(
        (0, 0, size - 1, size - 1),
        radius=radius, fill=color
    )
    return Image.alpha_composite(border, image)


def generate_app_icon_from_svg() -> None:
    """从SVG生成带圆角+安全区的1024/512基准图标"""
    svg = ICONS / "icon.svg"
    output_1024 = ICONS / "icon-1024.png"
    rendered_temp = ICONS / "icon.svg.png"

    # 使用qlmanage渲染SVG到1024画布
    subprocess.run(
        ["qlmanage", "-t", "-s", str(APP_ICON_SIZE), "-o", str(ICONS), str(svg)],
        check=True,
        capture_output=True,
    )

    if not rendered_temp.exists():
        raise FileNotFoundError(f"SVG渲染失败，临时文件不存在: {rendered_temp}")

    with Image.open(rendered_temp) as raw_img:
        # 强制统一尺寸1024
        if raw_img.size != (APP_ICON_SIZE, APP_ICON_SIZE):
            raw_img = raw_img.resize((APP_ICON_SIZE, APP_ICON_SIZE), Image.Resampling.LANCZOS)
        # 先切圆角蒙版
        rounded_img = apply_macos_squircle_mask(raw_img)
        safe_img = apply_safe_padding(rounded_img)
        final_icon = safe_img
        # 保存1024基准图
        final_icon.save(output_1024, optimize=True)
        # 生成512尺寸图标
        icon_512 = final_icon.resize((512, 512), Image.Resampling.LANCZOS)
        icon_512.save(ICONS / "icon-512.png", optimize=True)

    # 删除渲染临时文件
    rendered_temp.unlink(missing_ok=True)


def generate_icns() -> None:
    """生成iconset并打包icns文件，所有尺寸自动继承安全区+圆角"""
    iconset_dir = ROOT / "resource" / "icon.iconset"
    iconset_dir.mkdir(exist_ok=True)
    src_1024 = ICONS / "icon-1024.png"

    # 1x尺寸
    for size in (16, 32, 128, 256, 512):
        subprocess.run(
            [
                "sips", "-z", str(size), str(size), str(src_1024),
                "--out", str(iconset_dir / f"icon_{size}x{size}.png")
            ],
            check=True,
            capture_output=True
        )
    # 2x高分辨率尺寸
    for size in (32, 64, 256, 512, 1024):
        base_size = size // 2
        subprocess.run(
            [
                "sips", "-z", str(size), str(size), str(src_1024),
                "--out", str(iconset_dir / f"icon_{base_size}x{base_size}@2x.png")
            ],
            check=True,
            capture_output=True
        )
    # 打包icns
    subprocess.run(
        ["iconutil", "-c", "icns", str(iconset_dir), "-o", str(ROOT / "resource" / "icon.icns")],
        check=True,
        capture_output=True
    )
    # 清理iconset临时文件
    for png_file in iconset_dir.glob("*.png"):
        png_file.unlink(missing_ok=True)
    iconset_dir.rmdir()


def main() -> None:
    # 确保icons文件夹存在
    ICONS.mkdir(parents=True, exist_ok=True)
    generate_app_icon_from_svg()
    generate_tray_icon(TRAY_ICON_1X, ICONS / "trayTemplate.png")
    generate_tray_icon(TRAY_ICON_2X, ICONS / "trayTemplate@2x.png")
    generate_icns()
    print("✅ macOS 图标已生成完成，先圆角后安全区，圆角正常显示，带官方安全区域防裁剪")


if __name__ == "__main__":
    main()