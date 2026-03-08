# OpenClaw 升级机制文档

## 概述

OpenClaw 不单独升级，而是作为 ClawX 的**内置依赖包**（bundled package）随 ClawX 应用一起更新。用户通过更新 ClawX 应用来获得 OpenClaw 的最新版本。

## 架构

```
┌─────────────────────────────────────┐
│   ClawX 应用 (Electron)             │
│   - 前端界面                        │
│   - 主进程                          │
│   - 更新器 (electron-updater)       │
└──────────┬──────────────────────────┘
           │ 内嵌 OpenClaw
           ↓
┌─────────────────────────────────────┐
│   OpenClaw (Bundled)               │
│   - 位于 resources/openclaw/        │
│   - 随应用打包                      │
│   - 通过 Electron 运行              │
└─────────────────────────────────────┘
```

## 版本管理

### OpenClaw 版本定义

**文件**: `package.json`

```json
{
  "dependencies": {
    "openclaw": "2026.3.1"
  }
}
```

OpenClaw 的版本固定在 ClawX 的 `package.json` 中，每个 ClawX 版本对应一个特定的 OpenClaw 版本。

---

### 构建时打包

**文件**: `scripts/bundle-openclaw.mjs`

在构建过程中，通过以下步骤将 OpenClaw 打包：

1. **解析依赖**:
   ```javascript
   // 从 node_modules/openclaw 解析真实路径
   const openclawReal = fs.realpathSync(openclawLink);
   ```

2. **收集依赖**:
   - 执行广度优先搜索（BFS）遍历 pnpm 的虚拟存储
   - 收集所有直接和间接依赖
   - 去重并复制到 `build/openclaw/` 目录

3. **输出目录结构**:
   ```
   build/openclaw/
   ├── node_modules/          # 所有依赖
   ├── openclaw.mjs          # OpenClaw 入口
   └── ...                   # 其他文件
   ```

---

### Electron Builder 配置

**文件**: `electron-builder.yml:26-28`

```yaml
extraResources:
  - from: build/openclaw/
    to: openclaw/
```

将打包好的 OpenClaw 复制到应用的 `resources/openclaw/` 目录。

---

## 运行时加载

### Gateway 启动

**文件**: `electron/gateway/manager.ts`

Gateway 通过 `OPENCLAW_EMBEDDED_IN` 环境变量检测到 OpenClaw 内嵌模式：

```typescript
const forkEnv: Record<string, string | undefined> = {
  ...baseEnv,
  OPENCLAW_EMBEDDED_IN: 'ClawX',
  // ... 其他环境变量
};
```

---

### CLI 封装

**文件**: `resources/cli/posix/openclaw` (macOS/Linux)

```bash
#!/bin/sh
# OpenClaw CLI — managed by ClawX

ELECTRON="$CONTENTS_DIR/MacOS/ClawX"
CLI="$CONTENTS_DIR/Resources/openclaw/openclaw.mjs"

case "$1" in
  update)
    echo "openclaw is managed by ClawX (bundled version)."
    echo ""
    echo "To update openclaw, update ClawX:"
    echo "  Open ClawX > Settings > Check for Updates"
    echo "  Or download the latest version from https://claw-x.com"
    exit 0
    ;;
esac

export OPENCLAW_EMBEDDED_IN="ClawX"
ELECTRON_RUN_AS_NODE=1 exec "$ELECTRON" "$CLI" "$@"
```

当用户运行 `openclaw update` 命令时，CLI 会提示用户通过更新 ClawX 来升级 OpenClaw。

---

## 升级流程

### ClawX 应用更新

ClawX 使用 `electron-updater` 实现自动更新：

1. **检查更新**:
   ```typescript
   // electron/main/updater.ts:170
   async checkForUpdates(): Promise<UpdateInfo | null> {
     const result = await autoUpdater.checkForUpdates();
     return result.updateInfo || null;
   }
   ```

2. **下载更新**:
   - 从 CDN 下载更新包（主要使用阿里云 OSS）
   - 备用源：GitHub Releases

3. **安装更新**:
   ```typescript
   // electron/main/updater.ts:221
   quitAndInstall(): void {
     setQuitting();
     autoUpdater.quitAndInstall();
   }
   ```

4. **重启应用**:
   - 新版本包含新版本的 OpenClaw

---

### 更新配置

**文件**: `electron-builder.yml:46-55`

```yaml
publish:
  - provider: generic
    url: https://oss.intelli-spectrum.com/latest
    useMultipleRangeRequest: false
  - provider: github
    owner: ValueCell-ai
    repo: ClawX
```

**更新源**:
- **主源**: 阿里云 OSS（国内用户访问速度快）
- **备用**: GitHub Releases

---

## 用户视角

### 自动更新

用户可以在设置中启用：
- **自动检查更新**: 启动时检查是否有新版本
- **自动下载更新**: 检测到更新后自动下载

设置位于: `ClawX > Settings > General`

---

### 手动更新

1. **通过 UI**:
   ```
   ClawX > Settings > Check for Updates
   ```

2. **手动下载**:
   - 访问: https://claw-x.com
   - 下载最新版本安装包

---

### 查看版本

**OpenClaw 版本**:
```bash
# 打开终端，运行
/path/to/clawx/resources/cli/openclaw --version
```

或在 ClawX Setup 页面查看 OpenClaw 包状态。

---

## 技术细节

### OpenClaw 目录结构

打包后的目录结构：

```
ClawX.app/Contents/Resources/
├── openclaw/
│   ├── node_modules/          # 所有依赖（递归收集）
│   ├── openclaw.mjs          # OpenClaw 主入口
│   ├── package.json          # OpenClaw 的 package.json
│   └── ...                   # 其他文件
└── cli/
    └── openclaw              # CLI 封装脚本
```

---

### 环境变量

| 变量 | 用途 | 值 |
|------|------|-----|
| `OPENCLAW_EMBEDDED_IN` | 标识 OpenClaw 内嵌模式 | `ClawX` |
| `ELECTRON_RUN_AS_NODE` | 将 Electron 作为 Node.js 运行 | `1` |
| `OPENCLAW_NO_RESPAWN` | 防止 OpenClaw 自重生 | `1` |

---

### 依赖收集算法

**文件**: `scripts/bundle-openclaw.mjs:54-120`

使用广度优先搜索（BFS）收集依赖：

```
1. 从 openclaw 的虚拟存储路径开始
2. 读取 package.json 中的 dependencies
3. 对每个依赖：
   - 解析其真实路径（跟随符号链接）
   - 找到包含该依赖的虚拟存储 node_modules
   - 将该 node_modules 加入队列
4. 递归处理队列中的每个 node_modules
5. 去重并复制到输出目录
```

---

## 为什么要内置 OpenClaw？

### 优势

1. **版本一致性**: 每个 ClawX 版本绑定特定 OpenClaw 版本，避免兼容性问题
2. **简化更新**: 用户只需更新一个应用，无需单独管理 OpenClaw
3. **网络优化**: 避免在国内环境直接从 npm 下载依赖
4. **稳定性**: 避免依赖版本冲突

### 权衡

- **包体积**: 增加 ~100-200MB 应用体积（取决于 OpenClaw 及其依赖）
- **更新延迟**: OpenClaw 更新需等待 ClawX 发布新版本

---

## 相关文件清单

| 文件路径 | 作用 |
|---------|------|
| `package.json` | 定义 openclaw 依赖版本 |
| `scripts/bundle-openclaw.mjs` | 打包 OpenClaw 脚本 |
| `electron-builder.yml` | 构建配置，指定 extraResources |
| `electron/gateway/manager.ts` | Gateway 启动逻辑 |
| `electron/main/updater.ts` | ClawX 自动更新器 |
| `resources/cli/posix/openclaw` | Unix CLI 封装 |
| `resources/cli/win32/openclaw` | Windows CLI 封装 |
| `src/stores/update.ts` | 前端更新状态管理 |
| `src/pages/Settings/` | 设置页面（更新选项） |

---

## 故障排除

### OpenClaw 版本不匹配

如果遇到 OpenClaw 相关问题，确保：

1. ClawX 已更新到最新版本
2. 检查 `resources/openclaw/package.json` 中的版本号

### 更新失败

1. 检查网络连接
2. 查看日志：`~/Library/Logs/ClawX/` (macOS) 或 `%APPDATA%\ClawX\logs\` (Windows)
3. 手动下载最新安装包

---

## 参考资料

- Electron Builder 文档: https://www.electron.build
- electron-updater 文档: https://www.electron.build/auto-update
- OpenClaw 官方文档: https://docs.openclaw.ai

---

## 修改历史

| 日期 | 版本 | 修改内容 |
|------|------|----------|
| 2026-03-08 | 0.1.23 | 初始版本：记录 OpenClaw 内嵌升级机制 |
