# 飞书配对码打包版失效修复记录

**日期**：2026-03-09
**问题**：打包版（ClawX.exe）飞书绑定流程中，配置命令执行后网关重启，但配对码始终发不出去。
**根因**：`terminal:executeCommands` 使用裸 `node openclaw.mjs` 命令，在打包版里依赖系统全局 node，运行时环境与 Electron 内嵌 Node.js 不一致。

---

## 问题溯源

### 开发环境 vs 打包环境的差异

| 项目 | 开发环境 | 打包环境 |
|------|---------|---------|
| 执行 `node openclaw.mjs` 用的 node | 系统全局 node（已安装） | 系统全局 node（可能版本不对/不存在） |
| gateway fork 用的 node | Electron 内嵌 Node.js | Electron 内嵌 Node.js |
| `resources/bin/win32-x64/` 有无 node | — | 只有 `uv.exe`，**无 node.exe** |

打包版的 `resources/bin/win32-x64/` 里只有 `uv.exe`，ClawX 没有单独捆绑 node 可执行文件。`exec('node openclaw.mjs ...')` 在打包版里命中的是用户机器上的系统 node，与 Electron 内嵌的 Node.js 版本、模块解析路径均可能不同，导致：

- openclaw.mjs 的原生模块（如 feishu 插件依赖）加载失败
- 命令看起来执行了，实际配置没有正确写入
- 网关重启后 feishu 插件无法正常初始化，配对码发不出去

### 关键线索：issue-156

用户 issue-156 里记录了在 PowerShell 中手动跑 openclaw 的正确姿势：

```powershell
$env:ELECTRON_RUN_AS_NODE=1; & 'D:\openclaw\ClawX\ClawX.exe' 'D:\openclaw\ClawX\resources\openclaw\openclaw.mjs' <args>
```

这个命令用 `ELECTRON_RUN_AS_NODE=1` 把 Electron 二进制当成 Node.js runtime 来用，**保证运行环境和 gateway 完全一致**。

---

## 修复方案

### 修改文件

`electron/main/ipc-handlers.ts` — `terminal:executeCommands` handler

### 修改前

```typescript
if (cmdStr.startsWith('openclaw ')) {
  cmdStr = `node openclaw.mjs ${cmdStr.slice('openclaw '.length)}`;
}

exec(cmdStr, {
  cwd: openclawDir,
  env: { ...process.env, FORCE_COLOR: '0', OPENCLAW_HOME: getOpenClawHomeDir() },
  windowsHide: true,
  timeout,
}, callback);
```

### 修改后

```typescript
const electronExe = process.execPath;   // 打包版 → ClawX.exe；开发版 → electron.exe
const openclawMjs = path.join(openclawDir, 'openclaw.mjs');

if (cmdStr.startsWith('openclaw ')) {
  const args = cmdStr.slice('openclaw '.length);
  cmdStr = `"${electronExe}" "${openclawMjs}" ${args}`;
}

exec(cmdStr, {
  cwd: openclawDir,
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',   // ← 关键：让 Electron 以 Node.js 模式运行
    FORCE_COLOR: '0',
    OPENCLAW_HOME: getOpenClawHomeDir(),
  },
  windowsHide: true,
  timeout,
}, callback);
```

### 为什么这样改有效

- `process.execPath` 在打包版里就是 `ClawX.exe`，无需硬编码路径
- `ELECTRON_RUN_AS_NODE=1` 让 Electron 进入纯 Node.js 模式，加载 `openclaw.mjs` 就像 `node openclaw.mjs` 一样
- 运行时环境（Node 版本、V8 版本、原生 addon ABI）和 gateway fork 完全一致，feishu 插件能正常加载
- 开发环境下 `process.execPath` 是 `electron.exe`，同样支持 `ELECTRON_RUN_AS_NODE`，向后兼容

---

## 同期修复的其他问题

### 1. `openclaw doctor --fix` 加入配置命令序列

**问题**：每次 `openclaw config set` 都触发 Doctor warnings，提示 feishu 配置结构需要迁移（`allowFrom` 层级错误），但没有自动修复。

**修复**：`buildConfigCommands()` 末尾追加 `openclaw doctor --fix`。

### 2. gateway:restart 后改用轮询替代固定 2 秒等待

**问题**：打包版 gateway 启动比开发版慢，固定 2 秒 sleep 不足以等到 gateway ready。

**修复**：改为轮询 `gateway:health`，每 800ms 检查一次，最多等 20 秒，gateway 就绪后再额外等 1.5 秒供 feishu WebSocket 连接建立。

---

## 参考

- [issue-156](../docs/issue-156.md)：用户手动使用 ELECTRON_RUN_AS_NODE 运行 openclaw 的记录
- [pinokiod_terminal_research.md](../ai-desktop-sandbox/electron_doc/pinokiod_terminal_research.md)：node-pty PTY 方案（备用，适用于需要交互式终端的命令）
- [feishu-binding-fixes.md](./feishu-binding-fixes.md)：飞书多 Agent 绑定历史修复记录
