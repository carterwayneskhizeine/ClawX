# 多 Agent 独立飞书账号绑定 - 代码修改计划

> 实现 ClawX 新 UI 中每个 Agent 可以独立绑定不同飞书账号的功能

---

## 文档目录

| 序号 | 文档 | 说明 |
|------|------|------|
| 1 | [总体架构](01-overview-architecture.md) | 系统架构设计、数据流、配置文件结构 |
| 2 | [Store 设计](02-store-design.md) | `agentFeishu.ts` Store 完整代码实现 |
| 3 | [IPC Handlers](03-ipc-handlers.md) | Electron IPC 通信层实现 |
| 4 | [UI 组件修改](04-ui-component-changes.md) | AgentAdvancedConfigDialog 改造计划 |
| 5 | [配置文件处理](05-config-file-handling.md) | openclaw.json 多账号配置管理 |
| 6 | [CLI 命令](06-cli-commands.md) | OpenClaw CLI 命令序列与 Gateway 集成 |
| 7 | [实施路线图](07-implementation-roadmap.md) | 分阶段实施计划与风险评估 |

---

## 快速开始

### 当前状态

✅ **已完成**：
- Agent 创建/删除/管理基础功能
- AgentAdvancedConfigDialog UI 框架
- Feishu 配置类型定义

❌ **待实现**：
- 实际绑定逻辑（CLI 命令执行）
- 配对码验证流程
- 多账号配置存储

### 实施顺序

```
Phase 1: 基础架构 (1-2天)
  ├── electron/preload/index.ts       # 添加 IPC 白名单
  ├── electron/main/ipc-handlers.ts   # 实现 CLI 执行 handler
  ├── electron/utils/channel-config.ts # 扩展多账号配置支持
  └── src/stores/agentFeishu.ts       # 新建 Store

Phase 2: UI 实现 (2天)
  ├── src/components/common/BindingTerminalLog.tsx
  └── src/components/common/AgentAdvancedConfigDialog.tsx

Phase 3: 集成测试 (1-2天)
  └── 完整绑定流程测试
```

---

## 核心概念

### 配置文件结构

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "accounts": {
        "agent-1": {
          "enabled": true,
          "appId": "cli_xxx",
          "appSecret": "secret",
          "paired": true
        },
        "agent-2": {
          "enabled": true,
          "appId": "cli_yyy",
          "appSecret": "secret",
          "paired": true
        }
      }
    }
  }
}
```

### 绑定流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  输入凭证    │ -> │ 保存配置    │ -> │ 等待配对码   │
│ AppID/Secret │    │ CLI 命令    │    │             │
└─────────────┘    └─────────────┘    └──────┬──────┘
                                             │
                              用户在飞书发送消息获取配对码
                                             │
                              ┌──────────────▼──────┐
                              │  输入配对码          │
                              │  完成绑定            │
                              └─────────────────────┘
```

---

## 关键文件变更

### 新建文件

```
src/stores/agentFeishu.ts                      [必需]
src/components/common/BindingTerminalLog.tsx   [必需]
```

### 修改文件

```
electron/preload/index.ts                      [必需]
electron/main/ipc-handlers.ts                  [必需]
electron/utils/channel-config.ts               [必需]
src/components/common/AgentAdvancedConfigDialog.tsx [必需]
src/stores/agents.ts                           [可选]
```

---

## 依赖关系

```
AgentAdvancedConfigDialog
    ├── agentFeishu.ts (Store)
    │       ├── IPC: terminal:executeCommands
    │       ├── IPC: feishu:getAgentConfig
    │       └── IPC: feishu:markPaired
    │
    └── BindingTerminalLog (Component)

agents.ts
    └── IPC: feishu:initAccountConfig (创建时)
    └── IPC: feishu:deleteAccountConfig (删除时)
```

---

## CLI 命令速查

```bash
# 设置配置
openclaw config set channels.feishu.accounts.${AGENT_ID}.appId "${APP_ID}"
openclaw config set channels.feishu.accounts.${AGENT_ID}.appSecret "${APP_SECRET}"

# 绑定 Agent
openclaw agents bind --agent ${AGENT_ID} --bind feishu:${AGENT_ID}

# 解绑
openclaw agents unbind --agent ${AGENT_ID} --bind feishu:${AGENT_ID}
```

---

## 常见问题

### Q: 为什么不用 WebSocket 终端？
A: 项目中没有现成的 WebSocket PTY 实现，使用 Node.js spawn 更稳定可靠。

### Q: AppSecret 如何保护？
A: Phase 1 使用明文存储（与 OpenClaw 一致），Phase 2 将使用 Electron safeStorage 加密。

### Q: 是否支持向后兼容？
A: 是的，会迁移旧版配置到新的多账号格式。

---

## 参考文档

- `ai-desktop-sandbox/electron_doc/ui-feishu-binding-plan.md` - 原始飞书绑定计划
- `ai-desktop-sandbox/electron_doc/openclaw-agents-cli-study_feishu-per-agent.md` - CLI 研究
- `docs/refactoring-guide/` - 新 UI 重构指南

---

## 联系与支持

如有问题，请参考各阶段文档的详细说明，或查看代码中的注释。
