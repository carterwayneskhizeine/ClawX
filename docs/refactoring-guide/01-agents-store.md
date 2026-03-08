# 01 - Agent 管理 Store

## 新建文件: `src/stores/agents.ts`

这是多 Agent 管理的核心状态模块，负责 Agent 的增删改查。通过 `invokeIpc('gateway:rpc', ...)` 与 Gateway 通信。

---

## 完整代码

```typescript
/**
 * Agents State Store
 * Manages digital employee (agent) CRUD operations via Gateway RPC.
 */
import { create } from 'zustand';
import { invokeIpc } from '@/lib/api-client';

// ── Types ────────────────────────────────────────────────────

export interface AgentIdentity {
  name?: string;
  emoji?: string;
  theme?: string;
  avatarUrl?: string;
}

export interface Agent {
  id: string;
  name: string;
  identity?: AgentIdentity;
  workspace?: string;
  model?: string;
}

interface AgentsState {
  agents: Agent[];
  loading: boolean;
  error: string | null;

  fetchAgents: () => Promise<void>;
  createAgent: (params: {
    agentId: string;
    displayName: string;
    emoji?: string;
    workspace?: string;
  }) => Promise<void>;
  updateAgent: (agentId: string, params: { name?: string; avatar?: string }) => Promise<void>;
  deleteAgent: (agentId: string) => Promise<void>;
}

// ── Helper: 获取 OpenClaw 配置目录 ─────────────────────────────

async function getOpenClawConfigDir(): Promise<string> {
  try {
    const dir = await invokeIpc('openclaw:getConfigDir') as string;
    return dir;
  } catch {
    // 回退到默认路径
    return 'D:\\TheClaw\\.openclaw';
  }
}

// ── Store ────────────────────────────────────────────────────

export const useAgentsStore = create<AgentsState>((set, get) => ({
  agents: [],
  loading: false,
  error: null,

  /**
   * 从 Gateway 获取 Agent 列表
   * RPC: agents.list
   */
  fetchAgents: async () => {
    set({ loading: true, error: null });
    try {
      const result = await invokeIpc('gateway:rpc', 'agents.list', {}) as {
        success: boolean;
        result?: { agents?: Array<Record<string, unknown>> };
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch agents');
      }

      const rawAgents = result.result?.agents || [];
      const agents: Agent[] = rawAgents.map((a) => ({
        id: String(a.id || ''),
        name: String(
          (a.identity as AgentIdentity)?.name ||
          a.name ||
          (a.id === 'main' ? '通用助手' : a.id)
        ),
        identity: a.identity as AgentIdentity | undefined,
        workspace: a.workspace ? String(a.workspace) : undefined,
        model: a.model ? String(a.model) : undefined,
      }));

      set({ agents, loading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, loading: false });
      console.error('[AgentsStore] fetchAgents failed:', err);
    }
  },

  /**
   * 创建新 Agent（两步操作）
   *
   * Step 1: agents.create — 创建 Agent 配置 + IDENTITY.md
   *   - name 必须传英文 ID（中文会被 normalizeAgentId 清空）
   *   - emoji 在此步传入，写入 IDENTITY.md
   *
   * Step 2: agents.update — 设置中文显示名（写入 openclaw.json 的 name 字段）
   *   - 必须带重试！agents.create 写入磁盘后 Gateway 缓存需要异步 reload
   *   - 建议重试 3 次，间隔 1.5 秒
   *
   * ⚠️ 踩坑提醒：
   * - agents.update 的 Schema 有 additionalProperties: false
   * - 只能传 agentId, name, workspace, model, avatar
   * - 传 emoji/theme 会报 "unexpected property" 错误
   */
  createAgent: async ({ agentId, displayName, emoji, workspace }) => {
    const configDir = await getOpenClawConfigDir();
    const finalWorkspace = workspace || `${configDir}\\workspace-${agentId}`;

    // Step 1: 创建 Agent
    const createResult = await invokeIpc('gateway:rpc', 'agents.create', {
      name: agentId,         // 必须是英文 ID
      workspace: finalWorkspace,
      emoji: emoji || '🤖',  // 写入 IDENTITY.md
    }) as { success: boolean; error?: string };

    if (!createResult.success) {
      throw new Error(createResult.error || 'agents.create failed');
    }

    // Step 2: 带重试设置中文显示名
    const maxRetries = 3;
    const retryDelay = 1500;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const updateResult = await invokeIpc('gateway:rpc', 'agents.update', {
          agentId,
          name: displayName,
        }) as { success: boolean; error?: string };

        if (updateResult.success) {
          break; // 成功
        }
        throw new Error(updateResult.error || 'agents.update failed');
      } catch (err) {
        if (i < maxRetries - 1) {
          console.warn(`[AgentsStore] agents.update retry ${i + 1}/${maxRetries}:`, err);
          await new Promise((r) => setTimeout(r, retryDelay));
        } else {
          console.error('[AgentsStore] agents.update all retries failed:', err);
          // 不 throw — Agent 已创建成功，只是中文名没设上
          // 前端乐观更新会显示正确名称
        }
      }
    }

    // Step 3: 复制模板文件（可选，通过 IPC 在 main 进程完成）
    try {
      const templateDir = `${configDir}\\themd`;
      await invokeIpc('agent:copyTemplates', {
        agentId,
        templateDir,
        workspaceDir: finalWorkspace,
      });
    } catch (err) {
      console.warn('[AgentsStore] Template copy failed (non-critical):', err);
    }

    // 乐观更新 UI
    const newAgent: Agent = {
      id: agentId,
      name: displayName,
      identity: { name: displayName, emoji: emoji || '🤖' },
      workspace: finalWorkspace,
    };
    set((s) => ({ agents: [...s.agents, newAgent] }));

    // 延迟刷新列表确保后端配置已就绪
    setTimeout(() => get().fetchAgents(), 1500);
  },

  /**
   * 编辑 Agent（仅更新 name / avatar）
   *
   * ⚠️ 注意：不能传 emoji/theme，Schema 限制 additionalProperties: false
   */
  updateAgent: async (agentId, params) => {
    const result = await invokeIpc('gateway:rpc', 'agents.update', {
      agentId,
      ...params,
    }) as { success: boolean; error?: string };

    if (!result.success) {
      throw new Error(result.error || 'agents.update failed');
    }

    // 更新本地状态
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === agentId
          ? { ...a, name: params.name || a.name }
          : a
      ),
    }));
  },

  /**
   * 删除 Agent（两步操作）
   *
   * Step 1: agents.delete — 删除 Gateway 中的 Agent 配置
   * Step 2: agent:cleanupFiles — 通过 Electron IPC 删除物理文件夹
   */
  deleteAgent: async (agentId) => {
    // Step 1: 通过 Gateway API 删除配置
    const result = await invokeIpc('gateway:rpc', 'agents.delete', {
      agentId,
    }) as { success: boolean; error?: string };

    if (!result.success) {
      throw new Error(result.error || 'agents.delete failed');
    }

    // Step 2: 清理物理文件（不阻塞，失败不影响）
    try {
      await invokeIpc('agent:cleanupFiles', { agentId });
    } catch (err) {
      console.warn('[AgentsStore] Cleanup files failed (non-critical):', err);
    }

    // 从本地状态移除
    set((s) => ({
      agents: s.agents.filter((a) => a.id !== agentId),
    }));
  },
}));
```

---

## 要点说明

### Agent 名称解析优先级

Gateway 返回的 Agent 数据中，名称来源有多个字段：

```
UI 显示名 = agent.identity?.name || agent.name || agent.id
```

- `identity.name` — 从 IDENTITY.md 读取（agents.create 时写入的英文 ID）
- `name` — 从 openclaw.json 读取（agents.update 设置的中文名）
- `id` — Agent 唯一标识

因此 `fetchAgents` 中取名顺序为 `identity?.name || name || id`。

### Session Key 格式

每个 Agent 的聊天使用固定的 session key：

```
agent:<agentId>:default
```

例如：`agent:data-cleaner:default`

Gateway 根据 `agent:` 前缀自动路由到对应 Agent 实例。
