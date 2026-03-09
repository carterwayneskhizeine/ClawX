# 飞书配置管理 Store 设计

## 文件位置

`src/stores/agentFeishu.ts` (新建)

## 核心职责

1. 管理每个 Agent 的飞书配置状态
2. 封装与 Electron IPC 的通信
3. 处理绑定流程的状态机
4. 缓存配置避免重复读取文件

## 完整代码实现

```typescript
/**
 * Agent Feishu Configuration Store
 * Manages per-agent Feishu/Lark binding configuration
 */
import { create } from 'zustand';
import { invokeIpc } from '@/lib/api-client';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface AgentFeishuConfig {
  /** 是否启用飞书通道 */
  enabled: boolean;
  /** 飞书应用 ID (cli_ 开头) */
  appId?: string;
  /** 飞书应用密钥 - 加密存储 */
  appSecret?: string;
  /** 是否已完成配对 */
  paired: boolean;
  /** 配对完成时间 */
  pairedAt?: string;
  /** 绑定的飞书用户/机器人名称 */
  feishuBotName?: string;
}

export interface BindingState {
  /** 当前绑定步骤 */
  step: 'idle' | 'input' | 'pairing' | 'done' | 'error';
  /** 正在绑定的 Agent ID */
  agentId: string | null;
  /** 绑定日志输出 */
  log: string;
  /** 是否正在执行命令 */
  loading: boolean;
  /** 错误信息 */
  error?: string;
}

interface AgentFeishuState {
  // ── State ──────────────────────────────────────────────────
  /** 所有 Agent 的飞书配置缓存 */
  configs: Record<string, AgentFeishuConfig>;
  /** 绑定流程状态 */
  binding: BindingState;

  // ── Actions ────────────────────────────────────────────────
  /** 加载指定 Agent 的飞书配置 */
  loadConfig: (agentId: string) => Promise<AgentFeishuConfig | null>;
  /** 保存配置到文件 */
  saveConfig: (agentId: string, config: Partial<AgentFeishuConfig>) => Promise<void>;
  /** 开始绑定流程 (输入 AppID/Secret 后) */
  startBinding: (agentId: string, appId: string, appSecret: string) => Promise<void>;
  /** 确认配对码 */
  approvePairing: (agentId: string, pairingCode: string) => Promise<void>;
  /** 解绑飞书 */
  unbind: (agentId: string) => Promise<void>;
  /** 重置绑定状态 */
  resetBinding: () => void;
  /** 追加日志 */
  appendLog: (message: string) => void;
}

// ═══════════════════════════════════════════════════════════════
// CLI Commands Builder
// ═══════════════════════════════════════════════════════════════

/**
 * 构建设置飞书配置的 CLI 命令序列
 */
function buildConfigCommands(agentId: string, appId: string, appSecret: string): string[] {
  const configPath = `channels.feishu.accounts.${agentId}`;
  return [
    `openclaw config set channels.feishu.enabled true`,
    `openclaw config set ${configPath}.enabled true`,
    `openclaw config set ${configPath}.appId "${appId}"`,
    `openclaw config set ${configPath}.appSecret "${appSecret}"`,
    `openclaw config set ${configPath}.paired false`,
  ];
}

/**
 * 构建配对绑定命令
 */
function buildBindCommand(agentId: string): string {
  return `openclaw agents bind --agent ${agentId} --bind feishu:${agentId}`;
}

/**
 * 构建解绑命令
 */
function buildUnbindCommands(agentId: string): string[] {
  const configPath = `channels.feishu.accounts.${agentId}`;
  return [
    `openclaw agents unbind --agent ${agentId} --bind feishu:${agentId}`,
    `openclaw config set ${configPath}.enabled false`,
  ];
}

// ═══════════════════════════════════════════════════════════════
// Store Implementation
// ═══════════════════════════════════════════════════════════════

export const useAgentFeishuStore = create<AgentFeishuState>((set, get) => ({
  // ── Initial State ──────────────────────────────────────────
  configs: {},
  binding: {
    step: 'idle',
    agentId: null,
    log: '',
    loading: false,
  },

  // ── Actions ────────────────────────────────────────────────

  /**
   * 从 openclaw.json 加载指定 Agent 的飞书配置
   */
  loadConfig: async (agentId: string) => {
    try {
      // 通过 IPC 调用主进程读取配置
      const config = await invokeIpc<AgentFeishuConfig | null>(
        'feishu:getAgentConfig',
        { agentId }
      );

      if (config) {
        set((state) => ({
          configs: {
            ...state.configs,
            [agentId]: config,
          },
        }));
      }

      return config;
    } catch (error) {
      console.error(`[AgentFeishuStore] Failed to load config for ${agentId}:`, error);
      return null;
    }
  },

  /**
   * 保存配置到 openclaw.json
   * 注意：这里只更新内存状态，实际文件写入通过 CLI 完成
   */
  saveConfig: async (agentId: string, config: Partial<AgentFeishuConfig>) => {
    const currentConfig = get().configs[agentId] || {
      enabled: false,
      paired: false,
    };

    const newConfig = { ...currentConfig, ...config };

    // 更新本地状态
    set((state) => ({
      configs: {
        ...state.configs,
        [agentId]: newConfig,
      },
    }));
  },

  /**
   * 开始绑定流程
   * 执行 CLI 命令写入 AppID/AppSecret 到配置文件
   */
  startBinding: async (agentId: string, appId: string, appSecret: string) => {
    set({
      binding: {
        step: 'input',
        agentId,
        log: `>>> 开始为 Agent "${agentId}" 绑定飞书账号...\n`,
        loading: true,
      },
    });

    try {
      // 构建命令序列
      const commands = buildConfigCommands(agentId, appId, appSecret);

      // 通过 IPC 执行 CLI 命令
      const result = await invokeIpc<{ success: boolean; output: string; error?: string }>(
        'terminal:executeCommands',
        {
          commands,
          workingDir: await invokeIpc<string>('openclaw:getConfigDir'),
          timeout: 30000,
        }
      );

      if (!result.success) {
        throw new Error(result.error || '配置写入失败');
      }

      // 更新本地状态
      await get().saveConfig(agentId, {
        enabled: true,
        appId,
        appSecret,
        paired: false,
      });

      // 进入配对步骤
      set((state) => ({
        binding: {
          ...state.binding,
          step: 'pairing',
          log: state.binding.log + result.output + '\n>>> 配置已保存，等待配对...\n',
          loading: false,
        },
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      set((state) => ({
        binding: {
          ...state.binding,
          step: 'error',
          log: state.binding.log + `\n[错误] ${errorMsg}\n`,
          loading: false,
          error: errorMsg,
        },
      }));
    }
  },

  /**
   * 确认配对码，完成绑定
   */
  approvePairing: async (agentId: string, pairingCode: string) => {
    set((state) => ({
      binding: {
        ...state.binding,
        step: 'pairing',
        log: state.binding.log + `>>> 正在验证配对码: ${pairingCode}...\n`,
        loading: true,
      },
    }));

    try {
      // 执行配对命令
      const bindCommand = buildBindCommand(agentId);

      const result = await invokeIpc<{ success: boolean; output: string; error?: string }>(
        'terminal:executeCommands',
        {
          commands: [bindCommand],
          workingDir: await invokeIpc<string>('openclaw:getConfigDir'),
          timeout: 30000,
        }
      );

      if (!result.success) {
        throw new Error(result.error || '配对失败');
      }

      // 更新配置为已配对
      await get().saveConfig(agentId, {
        paired: true,
        pairedAt: new Date().toISOString(),
      });

      // 标记配置文件更新
      await invokeIpc('feishu:markPaired', { agentId });

      set((state) => ({
        binding: {
          ...state.binding,
          step: 'done',
          log: state.binding.log + result.output + '\n>>> ✅ 飞书绑定成功！\n',
          loading: false,
        },
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      set((state) => ({
        binding: {
          ...state.binding,
          step: 'error',
          log: state.binding.log + `\n[错误] ${errorMsg}\n`,
          loading: false,
          error: errorMsg,
        },
      }));
    }
  },

  /**
   * 解绑飞书账号
   */
  unbind: async (agentId: string) => {
    set({
      binding: {
        step: 'idle',
        agentId,
        log: `>>> 正在解绑 Agent "${agentId}" 的飞书账号...\n`,
        loading: true,
      },
    });

    try {
      const commands = buildUnbindCommands(agentId);

      const result = await invokeIpc<{ success: boolean; output: string; error?: string }>(
        'terminal:executeCommands',
        {
          commands,
          workingDir: await invokeIpc<string>('openclaw:getConfigDir'),
          timeout: 30000,
        }
      );

      if (!result.success) {
        console.warn('Unbind warning:', result.error);
      }

      // 清除本地配置
      set((state) => {
        const newConfigs = { ...state.configs };
        delete newConfigs[agentId];
        return {
          configs: newConfigs,
          binding: {
            step: 'idle',
            agentId: null,
            log: state.binding.log + '\n>>> ✅ 已解绑\n',
            loading: false,
          },
        };
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      set((state) => ({
        binding: {
          ...state.binding,
          log: state.binding.log + `\n[警告] ${errorMsg}\n`,
          loading: false,
        },
      }));
    }
  },

  /**
   * 重置绑定流程状态
   */
  resetBinding: () => {
    set({
      binding: {
        step: 'idle',
        agentId: null,
        log: '',
        loading: false,
      },
    });
  },

  /**
   * 追加日志消息
   */
  appendLog: (message: string) => {
    set((state) => ({
      binding: {
        ...state.binding,
        log: state.binding.log + message + '\n',
      },
    }));
  },
}));

// ═══════════════════════════════════════════════════════════════
// Helper Hooks
// ═══════════════════════════════════════════════════════════════

/**
 * 获取指定 Agent 的飞书配置
 */
export function useAgentFeishuConfig(agentId: string | null): AgentFeishuConfig | null {
  return useAgentFeishuStore((state) =>
    agentId ? state.configs[agentId] || null : null
  );
}

/**
 * 检查 Agent 是否已绑定飞书
 */
export function useIsAgentFeishuBound(agentId: string | null): boolean {
  return useAgentFeishuStore((state) => {
    const config = agentId ? state.configs[agentId] : null;
    return config?.enabled === true && config?.paired === true;
  });
}
