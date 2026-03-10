# 概述与配置

## electron-builder 简介

ClawX 使用 [electron-builder](https://www.electron.build/) 作为打包工具，将 Electron 应用构建为可分发的安装包。

## Windows 配置基础

在 `electron-builder.yml` 中，Windows 平台的核心配置如下：

```yaml
# Windows Configuration
win:
  forceCodeSigning: false
  verifyUpdateCodeSignature: false
  signAndEditExecutable: true
  extraResources:
    - from: resources/bin/win32-${arch}
      to: bin
    - from: resources/cli/win32/
      to: cli/
  icon: resources/icons/icon.ico
  target:
    - target: nsis
      arch:
        - x64
```

### 关键配置项说明

| 配置项 | 说明 |
|--------|------|
| `target: nsis` | 使用 NSIS 作为 Windows 安装器 |
| `extraResources` | 需要打包到安装包中的额外文件 |
| `icon` | 安装包图标 |
| `oneClick: false` | 允许用户选择安装目录 |

## 目录结构

```
ClawX/
├── electron-builder.yml    # 打包配置
├── scripts/
│   ├── installer.nsh       # NSIS 安装脚本
│   ├── after-pack.cjs     # 打包后钩子
│   └── ...
├── resources/             # 资源文件
│   ├── bin/
│   ├── cli/
│   └── icons/
└── ts/
    └── 01.txt             # 示例：需要安装的文件
```

## 打包命令

```bash
# 构建 Windows 安装包
pnpm run package:win

# 或完整构建+发布
pnpm run release
```

执行后会在 `release/` 目录下生成 `.exe` 安装包文件。
