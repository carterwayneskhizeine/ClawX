# 01 - 现状分析

---

## 1.1 ClawX 当前 OpenClaw 集成状态

### 关键路径（`electron/utils/paths.ts`）

```typescript
getOpenClawHomeDir()    // 返回：'D:\\TheClaw'
getOpenClawConfigDir()  // 返回：'D:\\TheClaw\\.openclaw'
getOpenClawDir()        // 开发：build/openclaw  |  生产：resources/openclaw
getOpenClawEntryPath()  // 返回：<getOpenClawDir()>/openclaw.mjs
```

ClawX 所有 OpenClaw 配置写入 `D:\TheClaw\.openclaw\openclaw.json`。

### 当前 openclaw.json 结构（已有部分）

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "dmPolicy": "open",
      "allowFrom": ["*"],
      "accounts": {
        "<agentId>": {
          "enabled": true,
          "appId": "...",
          "appSecret": "...",
          "paired": true
        }
      }
    }
  },
  "bindings": [
    {
      "type": "route",
      "agentId": "<agentId>",
      "match": { "channel": "feishu", "accountId": "<agentId>" }
    }
  ]
}
```

**当前状态**：`plugins` 字段**不存在**，memory-lancedb-pro **尚未安装**。

---

## 1.2 插件安装目标路径分析

```
D:\TheClaw\
└── .openclaw\
    ├── openclaw.json          ← 主配置（需要添加 plugins 字段）
    ├── memory\
    │   └── lancedb-pro\       ← 数据库存储路径（运行时自动创建）
    └── workspace\
        └── plugins\
            └── memory-lancedb-pro\   ← 插件克隆位置
                ├── index.ts
                ├── src/
                │   ├── scopes.ts
                │   └── tools.ts
                └── package.json
```

---

## 1.3 exec() 调用安全性分析

ClawX 中所有调用 OpenClaw 的路径：

| 位置 | 方式 | OPENCLAW_HOME | 状态 |
|------|------|---------------|------|
| `gateway/manager.ts` - fork gateway | `utilityProcess.fork()` | ✅ 已注入 | 正常 |
| `ipc-handlers.ts` - `terminal:executeCommands` | `child_process.exec()` | ✅ 已注入（飞书修复时加入） | 正常 |
| `utils/channel-config.ts` - `validateChannelConfig` | `child_process.exec()` | ✅ 已注入（飞书修复时加入） | 正常 |

新增的 memory IPC handlers 需要复用 `terminal:executeCommands` 路径，**不需要**额外注入 `OPENCLAW_HOME`（已由框架处理）。

---

## 1.4 scope 自动识别机制（插件内置）

memory-lancedb-pro 的 scope 模式（`src/scopes.ts`）：

```typescript
const SCOPE_PATTERNS = {
  GLOBAL: "global",
  AGENT: (agentId: string) => `agent:${agentId}`,
  CUSTOM: (name: string) => `custom:${name}`,
  PROJECT: (projectId: string) => `project:${projectId}`,
  USER: (userId: string) => `user:${userId}`,
};
```

**关键特性**：
- `agent:*` 格式的 scope 被**动态识别**为内置 scope，**无需预定义**
- 插件从运行时 `ctx.agentId` 自动获取 agent ID
- autoCapture 钩子（`agent_end` 事件）自动将对话存入对应 scope
- 每个 agent 默认可读写 `global` + `agent:<agentId>` 两个 scope

这意味着配置完成后，只要 agent 对话，记忆就会自动按 scope 隔离，**无需前端额外操作**。

---

## 1.5 ClawX Agent ID 规范

根据 `AgentFormDialog.tsx` 的修复（`feishu-binding-fixes.md` 第 8 点）：

- agentId 已强制转为**小写**（`onChange: e.target.value.toLowerCase()`）
- 格式：alphanumeric + hyphens（如 `data-cleaner`, `legal-advisor`）
- scope 格式将为：`agent:data-cleaner`, `agent:legal-advisor` 等

---

## 1.6 需要解决的问题清单

| # | 问题 | 解决方案 | 文档 |
|---|------|---------|------|
| 1 | 插件未安装 | 手动克隆 + npm install | [02](./02-plugin-installation.md) |
| 2 | openclaw.json 未配置 plugins | 直接写入 JSON（readOpenClawConfig/writeOpenClawConfig） | [03](./03-openclaw-config.md) |
| 3 | 无法通过 UI 管理记忆 | 新增 memory:* IPC handlers | [04](./04-ipc-handlers.md) |
| 4 | 前端无记忆管理入口 | 新增 agentMemory store + UI 组件 | [05](./05-frontend-integration.md) |
| 5 | 删除 agent 时记忆残留 | agents.ts 中调用记忆级联删除 | [06](./06-agent-lifecycle.md) |
