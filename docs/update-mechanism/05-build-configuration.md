# 配置与构建

## 概述

ClawX 的自动更新功能通过 `electron-builder.yml` 配置文件和 `package.json` 中的版本管理脚本进行配置。

## electron-builder.yml

### 更新配置

```yaml
# Auto-update configuration
# Primary: Alibaba Cloud OSS (fast for Chinese users, used for auto-update)
# Fallback: GitHub Releases (backup, used when OSS is unavailable)
publish:
  # 主要更新源：阿里云 OSS
  - provider: generic
    url: https://oss.intelli-spectrum.com/latest
    useMultipleRangeRequest: false
  # 备用更新源：GitHub
  - provider: github
    owner: ValueCell-ai
    repo: ClawX
```

### 多平台配置

#### macOS

```yaml
mac:
  category: public.app-category.productivity
  icon: resources/icons/icon.icns
  target:
    - target: dmg
      arch:
        - x64
        - arm64
    - target: zip
      arch:
        - x64
        - arm64
  darkModeSupport: true
  hardenedRuntime: true
  gatekeeperAssess: false
  notarize: true
```

#### Windows

```yaml
win:
  forceCodeSigning: false
  verifyUpdateCodeSignature: false
  signAndEditExecutable: true
  icon: resources/icons/icon.ico
  target:
    - target: nsis
      arch:
        - x64

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  deleteAppDataOnUninstall: false
  differentialPackage: true  # 增量更新包
  createDesktopShortcut: true
  createStartMenuShortcut: true
```

### 增量更新说明

**Windows** 使用 NSIS 差分包 (`differentialPackage: true`)，只下载变更的部分，显著减少下载量。

**限制**: 增量更新**不会删除用户安装目录中的旧文件**。如果新版本需要删除某些文件，这些文件会作为"孤儿文件"保留在用户设备上。

**解决方案**:
1. 全量卸载后重新安装
2. 在 `scripts/installer.nsh` 的 `customInstall` 宏中添加清理逻辑
3. 在发布说明中提醒用户

#### Linux

```yaml
linux:
  category: Utility
  target:
    - target: AppImage
      arch:
        - x64
        - arm64
    - target: deb
      arch:
        - x64
        - arm64
    - target: rpm
      arch:
        - x64
```

## package.json 版本管理

### 版本号定义

```json
{
  "name": "clawx",
  "version": "0.1.23"
}
```

### 版本管理脚本

```json
{
  "scripts": {
    "version:patch": "pnpm version patch",
    "version:minor": "pnpm version minor",
    "version:major": "pnpm version major",
    "postversion": "git push && git push --tags"
  }
}
```

| 命令 | 作用 | 示例 |
|------|------|------|
| `pnpm version patch` | 补丁版本 +1 | 0.1.23 → 0.1.24 |
| `pnpm version minor` | 次版本 +1 | 0.1.23 → 0.2.0 |
| `pnpm version major` | 主版本 +1 | 0.1.23 → 1.0.0 |

### 构建脚本

```json
{
  "scripts": {
    "build:vite": "vite build",
    "release": "pnpm run uv:download && vite build && zx scripts/bundle-openclaw.mjs && zx scripts/bundle-openclaw-plugins.mjs && electron-builder --publish always"
  }
}
```

`--publish always` 参数会在构建后自动发布更新。

## 更新源结构

### OSS 目录结构

```
https://oss.intelli-spectrum.com/
├── latest/
│   ├── latest-mac.yml
│   ├── latest.yml
│   └── latest-linux.yml
├── beta/
│   ├── beta-mac.yml
│   ├── beta.yml
│   └── beta-linux.yml
├── alpha/
│   ├── alpha-mac.yml
│   ├── alpha.yml
│   └── alpha-linux.yml
```

### 版本文件格式 (yml)

```yaml
# latest-mac.yml 示例
version: 0.1.24
releaseDate: '2026-03-10T00:00:00.000Z'
files:
  - url: ClawX-0.1.24-mac.zip
    sha512: <sha512-hash>
    size: 52428800
path: ClawX-0.1.24-mac.zip
sha512: <sha512-hash>
releaseTimestamp: '2026-03-10T00:00:00.000Z'
```

## GitHub Releases 备用源

当 OSS 不可用时，自动回退到 GitHub Releases：

- **Owner**: `ValueCell-ai`
- **Repo**: `ClawX`

发布的文件命名格式：

```
ClawX-{version}-{os}-{arch}.{ext}
```

示例：
- `ClawX-0.1.24-mac-x64.dmg`
- `ClawX-0.1.24-mac-arm64.dmg`
- `ClawX-0.1.24-win-x64.exe`
- `ClawX-0.1.24-linux-x64.AppImage`

## electron-updater 配置

在主进程 `updater.ts` 中配置：

```typescript
autoUpdater.autoDownload = false;  // 默认不自动下载
autoUpdater.autoInstallOnAppQuit = true;  // 退出时自动安装
autoUpdater.channel = 'stable';  // 默认通道
autoUpdater.setFeedURL({
  provider: 'generic',
  url: feedUrl,
  useMultipleRangeRequest: false,
});
```

## 构建产物

### Windows

- `.exe` (NSIS 安装程序)
- `.zip` (便携版)

### macOS

- `.dmg` (磁盘镜像)
- `.zip` (便携版)

### Linux

- `.AppImage` (通用)
- `.deb` (Debian/Ubuntu)
- `.rpm` (Fedora/RHEL)
