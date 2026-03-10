# ClawX 打包版飞书插件配置手册

**日期**：2026-03-09
**适用版本**：ClawX v0.1.23 / OpenClaw 2026.3.2 / Electron 40.6.0

---

## 概述

本文记录了 ClawX 打包版（`.exe`）中飞书绑定功能从失效到修复的完整过程，包括根因分析、代码修复、打包流程及最终正常工作的配置结构。

---

## 一、最终正常工作的 openclaw.json 结构

飞书绑定成功后，`D:\TheClaw\.openclaw\openclaw.json` 的 feishu 相关部分如下：

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "dmPolicy": "open",
      "allowFrom": ["*"],
      "accounts": {
        "main": {
          "enabled": true,
          "appId": "cli_xxx",
          "appSecret": "xxx",
          "paired": false
        },
        "default": {
          "dmPolicy": "open",
          "allowFrom": ["*"]
        }
      }
    }
  },
  "bindings": [
    {
      "type": "route",
      "agentId": "main",
      "match": {
        "channel": "feishu",
        "accountId": "main"
      }
    }
  ],
  "plugins": {
    "entries": {
      "feishu": {
        "enabled": true
      }
    }
  }
}
```

**关键字段说明**：

| 字段 | 说明 |
|------|------|
| `channels.feishu.enabled` | 启用飞书 channel |
| `channels.feishu.dmPolicy` | `"open"` = 允许任何人私信 |
| `channels.feishu.allowFrom` | `["*"]` = 不限制来源 |
| `channels.feishu.accounts.<agentId>` | 每个 agent 独立的飞书 App 凭证 |
| `bindings[].match.accountId` | 路由规则：将该飞书账号的消息路由到对应 agent |
| `plugins.entries.feishu.enabled` | 飞书插件开关 |

---

## 二、打包版失效的根因（三层问题）

### 问题 1：feishu 插件依赖缺失（最关键）

**现象**：`openclaw doctor` 报 `ERROR feishu: failed to load plugin: Error: Cannot find module '@larksuiteoapi/node-sdk'`

**根因**：`bundle-openclaw.mjs` 的 BFS 从 openclaw 主包的 pnpm virtual store 出发收集依赖，但 `@larksuiteoapi/node-sdk` 是 `extensions/feishu/package.json` 的依赖，不在 openclaw 的 virtual store 里，导致打包时被遗漏。

**修复**：在 `scripts/bundle-openclaw.mjs` 中新增 `4b` 步骤，在主 BFS 完成后，额外扫描 `extensions/*/package.json`，将缺失的依赖从 pnpm virtual store 补进 `build/openclaw/node_modules/`。

```
+ Extension dep: @larksuiteoapi/node-sdk (extensions/feishu)
+ Extension dep: axios (extensions/feishu)
+ Extension dep: protobufjs (extensions/feishu)
...
```

---

### 问题 2：CLI 命令使用系统 node 而非 Electron 内嵌 Node

**现象**：打包版中 `exec('node openclaw.mjs ...')` 行为不稳定

**根因**：

| | Node 版本 | modules ABI |
|---|---|---|
| 系统 node | 22.22.0 | 127 |
| Electron 40 内嵌 | **24.13.1** | **143** |

`resources/bin/win32-x64/` 中只有 `uv.exe`，没有独立的 `node.exe`。裸 `node` 命令命中系统 node，ABI 不匹配导致原生模块加载失败。

**修复**：`electron/main/ipc-handlers.ts` 中 `terminal:executeCommands` handler 改用 `ELECTRON_RUN_AS_NODE=1 + process.execPath`：

```typescript
// 修改前
cmdStr = `node openclaw.mjs ${args}`;

// 修改后
const electronExe = process.execPath;  // 打包版 → ClawX.exe
const openclawMjs = path.join(openclawDir, 'openclaw.mjs');
cmdStr = `"${electronExe}" "${openclawMjs}" ${args}`;
// env 中加入 ELECTRON_RUN_AS_NODE: '1'
```

这与 issue-156 中用户手动调用 openclaw 的方式一致：
```powershell
$env:ELECTRON_RUN_AS_NODE=1; & 'ClawX.exe' 'resources\openclaw\openclaw.mjs' <命令>
```

---

### 问题 3：gateway 重启后固定等待 2 秒不足

**现象**：打包版 gateway 启动比开发版慢，2 秒内 Feishu 连接未建立

**修复**：改为轮询 `gateway:health`，最多等 20 秒，就绪后再额外等 1.5 秒：

```typescript
const MAX_WAIT_MS = 20000;
const POLL_INTERVAL_MS = 800;
// 每 800ms 轮询 gateway:health，直到返回 ok
```

---

### 问题 4：`openclaw doctor --fix` 不能在无 TTY 环境运行

**现象**：绑定流程报 `Command failed: ClawX.exe openclaw.mjs doctor --fix`

**根因**：`doctor --fix` 会做 Telegram heartbeat 等网络检查，在打包版的 `exec()` 无 TTY 环境下超时失败。

**修复**：从 `buildConfigCommands()` 中移除 `openclaw doctor --fix`。

---

## 三、完整打包流程

开发完成后，按以下顺序执行：

```bash
# 1. 编译前端 TypeScript/React
npx vite build

# 2. 打包 openclaw（含 extension deps 修复）
npx zx scripts/bundle-openclaw.mjs

# 3. 打包第三方插件（dingtalk 等）
npx zx scripts/bundle-openclaw-plugins.mjs

# 4a. 打 unpacked 目录（快速测试）
npx electron-builder --win --dir

# 4b. 打完整安装包（正式发布）
npm run package:win
```

**测试打包版飞书插件是否正常加载**（在 unpacked 目录中）：

```powershell
$env:ELECTRON_RUN_AS_NODE=1
& "D:\Code\ClawX\release\win-unpacked\ClawX.exe" `
  "D:\Code\ClawX\release\win-unpacked\resources\openclaw\openclaw.mjs" `
  plugins info feishu
```

预期输出应包含：`feishu@x.x.x: plugin registered`，不含 `Cannot find module` 错误。

---

## 四、飞书绑定 UI 流程

1. 打开 ClawX → 选择 Agent → 飞书绑定
2. 输入飞书机器人的 **App ID** 和 **App Secret**（从飞书开放平台获取）
3. 点击「开始绑定」，等待日志出现「配置已保存并应用，等待配对...」
4. 在飞书中向机器人发送任意消息触发配对
5. 配对成功后 `openclaw.json` 中 `paired` 字段变为 `true`

---

## 五、涉及的代码修改汇总

| 文件 | 修改内容 |
|------|---------|
| `scripts/bundle-openclaw.mjs` | 新增步骤 4b：扫描 `extensions/*/package.json` 补充缺失依赖 |
| `electron/main/ipc-handlers.ts` | `terminal:executeCommands` 改用 `ELECTRON_RUN_AS_NODE=1 + process.execPath` |
| `src/stores/agentFeishu.ts` | gateway 重启后改为轮询 `gateway:health`；移除 `openclaw doctor --fix` 命令 |

---

## 六、已知遗留问题

- `openclaw.json` 中存在 `channels.feishu.accounts.default` 节点（由 openclaw doctor 自动迁移旧配置产生），属于正常现象，不影响功能。
- `channels.feishu.dmPolicy` 同时存在于顶层和 `accounts.default` 层，是 openclaw 配置迁移过程的中间态，同样不影响运行。
