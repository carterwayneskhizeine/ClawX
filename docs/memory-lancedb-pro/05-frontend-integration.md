# 05 - 前端 UI 集成方案

> 前端集成分两个优先级：
> - **P0（必须）**：Agent 生命周期中的记忆自动管理（无需额外 UI）
> - **P1（可选）**：记忆管理面板（统计、查看、删除）

---

## 5.1 P0：记忆初始化配置入口（设置页）

最小化 UI：在系统设置页面增加一个「记忆插件配置」区块，允许用户输入 Jina API Key 并触发 `memory:installPlugin`。

### 建议位置

在 `src/pages/Settings.tsx`（或类似设置页）中，现有提供商配置卡片旁边新增：

```tsx
// 示意结构，非完整代码
<Card title="记忆插件" extra={<PluginStatusBadge />}>
  <Form.Item label="Jina AI API Key">
    <Input.Password
      value={jinaApiKey}
      onChange={(e) => setJinaApiKey(e.target.value)}
      placeholder="jina_..."
    />
  </Form.Item>
  <Button
    type="primary"
    onClick={handleInstallPlugin}
    loading={installing}
  >
    {pluginInstalled ? '更新配置' : '安装记忆插件'}
  </Button>
  {pluginInstalled && (
    <Alert type="success" message="memory-lancedb-pro 已启用，重启 Gateway 后生效" />
  )}
</Card>
```

---

## 5.2 P0：Zustand Store（agentMemory.ts）

新建 `src/stores/agentMemory.ts`，模式完全参照 `agentFeishu.ts`：

```typescript
// src/stores/agentMemory.ts
import { create } from 'zustand';
import { invokeIpc } from '../lib/ipc'; // 或现有的 ipc 工具

interface MemoryPluginState {
  pluginInstalled: boolean;
  installing: boolean;
  error: string | null;

  checkPluginStatus: () => Promise<void>;
  installPlugin: (jinaApiKey: string) => Promise<void>;
  deleteAgentMemory: (agentId: string) => Promise<void>;
}

export const useAgentMemoryStore = create<MemoryPluginState>((set) => ({
  pluginInstalled: false,
  installing: false,
  error: null,

  checkPluginStatus: async () => {
    const result = await invokeIpc('memory:getPluginStatus');
    set({ pluginInstalled: result.enabled });
  },

  installPlugin: async (jinaApiKey: string) => {
    set({ installing: true, error: null });
    try {
      const result = await invokeIpc('memory:installPlugin', { jinaApiKey });
      if (!result.success) throw new Error(result.error);
      set({ pluginInstalled: true, installing: false });
    } catch (err) {
      set({ installing: false, error: String(err) });
    }
  },

  deleteAgentMemory: async (agentId: string) => {
    // 通过 terminal:executeCommands 执行删除命令
    await invokeIpc('terminal:executeCommands', {
      commands: [`openclaw memory-pro delete-bulk --scope agent:${agentId}`],
      timeout: 30000,
    });
  },
}));
```

---

## 5.3 P1（可选）：记忆管理面板

如果需要查看和管理每个 agent 的记忆，可以在 agent 详情页增加「记忆」Tab。

### 数据结构

```typescript
interface MemoryStats {
  totalCount: number;
  scopes: Array<{
    scope: string;      // 如 "agent:data-cleaner"
    count: number;
    lastUpdated?: string;
  }>;
}

interface MemoryEntry {
  id: string;
  content: string;
  createdAt: string;
  score?: number;
  metadata?: Record<string, unknown>;
}
```

### 展示建议

| 组件 | 功能 |
|------|------|
| `MemoryStatsCard` | 显示该 agent 的记忆条目数、最近更新时间 |
| `MemoryList` | 列表展示记忆条目，支持翻页 |
| `MemorySearchBar` | 搜索特定记忆 |
| `MemoryClearButton` | 清除该 agent 所有记忆（带二次确认） |

---

## 5.4 invokeIpc 工具函数

ClawX 中调用 IPC 的方式（参照现有代码找到正确的调用方式）：

```typescript
// 通常是 window.electron.ipcRenderer.invoke 或类似封装
// 参照 src/stores/agentFeishu.ts 中的调用方式
```

需要在阅读现有 store 代码后确认正确的调用签名，保持与 `agentFeishu.ts` 一致。

---

## 5.5 实施优先级建议

```
Sprint 1（基础可用）
├── 手动安装插件（第 2、3 步）
├── agents.ts 级联删除（第 6 步）
└── 无 UI，通过 CLI 验证功能

Sprint 2（UI 接入）
├── memory:installPlugin + memory:getPluginStatus IPC
├── 设置页新增 Jina API Key 配置区块
└── agentMemory.ts store

Sprint 3（完整管理）
└── P1 记忆管理面板（可选）
```
