# 多 Agent 独立飞书账号绑定 - 总体架构

## 目标

实现每个 Agent 可以独立绑定不同的飞书账号，支持：
- 每个 Agent 拥有独立的飞书 AppID/AppSecret
- 配对码验证机制
- Agent 与飞书账号的一对一映射关系
- 配置的持久化存储

## 架构设计

### 1. 数据流架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │ AgentAdvancedConfigDialog │ │ AgentFormDialog │ │  Sidebar    │   │
│  │ (飞书配置界面)    │  │ (创建Agent)      │  │ (显示状态)    │   │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘   │
└───────────┼────────────────────┼───────────────────┼───────────┘
            │                    │                   │
            ▼                    ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Store Layer (Zustand)                       │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │   agents.ts      │  │ agentFeishu.ts   │  (新建)              │
│  │ (Agent CRUD)     │  │ (飞书配置管理)    │                      │
│  └────────┬─────────┘  └────────┬─────────┘                      │
└───────────┼────────────────────┼──────────────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      IPC / API Layer                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │ invokeIpc        │  │ Terminal WebSocket│  │ Gateway RPC  │   │
│  │ (标准IPC)        │  │ (执行CLI命令)     │  │ (Agent操作)   │   │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘   │
└───────────┼────────────────────┼───────────────────┼───────────┘
            │                    │                   │
            ▼                    ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Layer                               │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │ openclaw.json    │  │  Gateway Server  │                      │
│  │ (配置文件存储)    │  │  (OpenClaw)      │                      │
│  │                  │  │                  │                      │
│  │ channels: {      │  │  ┌────────────┐  │                      │
│  │   feishu: {      │  │  │  Agent 1   │  │                      │
│  │     accounts: {  │  │  │  Agent 2   │  │                      │
│  │       agent1: {},│  │  │  ...       │  │                      │
│  │       agent2: {} │  │  └────────────┘  │                      │
│  │     }            │  │                  │                      │
│  │   }              │  │                  │                      │
│  │ }                │  │                  │                      │
│  └──────────────────┘  └──────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

### 2. 配置文件结构

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "dmPolicy": "open",
      "allowFrom": ["*"],
      "accounts": {
        "data-cleaner": {
          "enabled": true,
          "appId": "cli_xxx1",
          "appSecret": "secret1",
          "paired": true,
          "pairedAt": "2026-03-09T10:00:00Z"
        },
        "copywriter": {
          "enabled": true,
          "appId": "cli_xxx2",
          "appSecret": "secret2",
          "paired": false
        }
      }
    }
  }
}
```

### 3. 核心流程

#### 3.1 绑定流程

```
用户点击"配置"飞书
        │
        ▼
┌───────────────┐
│ 输入 AppID/   │
│   AppSecret   │
└───────┬───────┘
        │
        ▼
┌───────────────┐     ┌─────────────────────┐
│ 调用 CLI 写入  │────▶│ openclaw config set │
│   配置到文件   │     │ channels.feishu.    │
└───────┬───────┘     │ accounts.${agentId} │
        │             └─────────────────────┘
        ▼
┌───────────────┐
│  显示配对码   │
│  输入界面     │
└───────┬───────┘
        │
        ▼
┌───────────────┐     ┌─────────────────────┐
│ 用户发送消息  │────▶│ 飞书机器人收到消息  │
│ 获取配对码    │     │ 生成 8 位配对码     │
└───────┬───────┘     └─────────────────────┘
        │
        ▼
┌───────────────┐
│ 输入配对码    │
│ 点击确认配对  │
└───────┬───────┘
        │
        ▼
┌───────────────┐     ┌─────────────────────┐
│ 调用 CLI 完成 │────▶│ openclaw agents     │
│   配对绑定    │     │ bind --agent ${id}  │
└───────────────┘     │ --bind feishu:${id} │
                      └─────────────────────┘
```

#### 3.2 Agent 创建时初始化飞书配置

```
创建新 Agent
     │
     ▼
┌─────────────┐
│  agents.create│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 同时初始化   │
│ feishu配置   │
│ (enabled: false)
└─────────────┘
```

### 4. 关键数据结构

```typescript
// Agent 飞书配置
interface AgentFeishuConfig {
  enabled: boolean;
  appId?: string;
  appSecret?: string;
  paired: boolean;
  pairedAt?: string;
  pairingCode?: string;      // 临时存储，验证后清除
  pairingExpireAt?: number;  // 配对码过期时间
}

// Store State
interface AgentFeishuState {
  configs: Record<string, AgentFeishuConfig>;  // agentId -> config
  loading: boolean;
  bindingStep: 'input' | 'pairing' | 'done' | null;
  currentBindingAgent: string | null;
  bindingLog: string;

  // Actions
  loadConfig: (agentId: string) => Promise<AgentFeishuConfig | null>;
  saveConfig: (agentId: string, config: Partial<AgentFeishuConfig>) => Promise<void>;
  startBinding: (agentId: string, appId: string, appSecret: string) => Promise<void>;
  approvePairing: (agentId: string, code: string) => Promise<void>;
  unbind: (agentId: string) => Promise<void>;
}
```

### 5. 安全考虑

1. **AppSecret 加密存储**: 使用 Electron 的 safeStorage 加密存储 AppSecret
2. **配对码时效**: 配对码 10 分钟内有效
3. **配置隔离**: 每个 Agent 的配置完全隔离，防止信息泄露
4. **日志脱敏**: 日志中不输出 AppSecret

### 6. 文件变更清单

| 序号 | 文件路径 | 操作 | 说明 |
|------|---------|------|------|
| 1 | `src/stores/agentFeishu.ts` | 新建 | 飞书配置管理 Store |
| 2 | `src/components/common/AgentAdvancedConfigDialog.tsx` | 修改 | 实现实际的绑定逻辑 |
| 3 | `electron/main/ipc-handlers.ts` | 修改 | 添加 CLI 执行 handlers |
| 4 | `electron/preload/index.ts` | 修改 | 添加 IPC 白名单 |
| 5 | `electron/utils/channel-config.ts` | 修改 | 扩展飞书多账号配置支持 |
| 6 | `src/components/common/BindingTerminalLog.tsx` | 新建 | 绑定过程日志展示组件 |

### 7. 依赖关系

```
agentFeishu.ts
    ├── agents.ts (获取 agent 列表)
    ├── channel-config.ts (读取/写入配置)
    └── IPC: terminal:execute (执行 CLI)

AgentAdvancedConfigDialog.tsx
    ├── agentFeishu.ts (绑定逻辑)
    ├── agents.ts (agent 信息)
    └── BindingTerminalLog.tsx (日志展示)
```
