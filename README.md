# Project Manager

Wails + Vite + React + TypeScript 本地桌面项目管理工具。

一键管理多个前端/Python 等项目的开发环境，支持自定义启动命令、独立进程管理、实时日志输出。

## 环境准备

- Go 1.25+（本项目通过 Homebrew 安装）
- Wails CLI v2.13+

确保 PATH 中同时包含 Homebrew 的 Go 和 Wails CLI：

```bash
export PATH="/opt/homebrew/opt/go/bin:$PATH"
export PATH="$PATH:$HOME/go/bin"
```

永久生效可写入 `~/.zshrc`：

```bash
echo 'export PATH="/opt/homebrew/opt/go/bin:$PATH"' >> ~/.zshrc
echo 'export PATH="$PATH:$HOME/go/bin"' >> ~/.zshrc
source ~/.zshrc
```

## 开发

```bash
wails dev
```

## 构建

```bash
wails build
```

## 说明

- 项目后端已迁移到 Go（Wails runtime）。
- 支持点击左侧「添加」按钮或拖拽文件夹到侧边栏来添加项目。
