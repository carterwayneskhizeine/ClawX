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
    /** 所有 Agent 的飞书配置缓存 */
    configs: Record<string, AgentFeishuConfig>;
    /** 绑定流程状态 */
    binding: BindingState;

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

function buildConfigCommands(agentId: string, appId: string, appSecret: string): string[] {
    const configPath = `channels.feishu.accounts.${agentId}`;
    return [
        `openclaw config set channels.feishu.enabled true`,
        `openclaw config set channels.feishu.dmPolicy open`,
        `openclaw config set channels.feishu.allowFrom '["*"]'`,
        `openclaw config set ${configPath}.enabled true`,
        `openclaw config set ${configPath}.appId "${appId}"`,
        `openclaw config set ${configPath}.appSecret "${appSecret}"`,
        `openclaw config set ${configPath}.paired false`,
        `openclaw doctor --fix`,
    ];
}

function buildBindCommand(agentId: string): string {
    return `openclaw agents bind --agent ${agentId} --bind feishu:${agentId}`;
}

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
    configs: {},
    binding: {
        step: 'idle',
        agentId: null,
        log: '',
        loading: false,
    },

    loadConfig: async (agentId: string) => {
        try {
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

    saveConfig: async (agentId: string, config: Partial<AgentFeishuConfig>) => {
        const currentConfig = get().configs[agentId] || {
            enabled: false,
            paired: false,
        };

        const newConfig = { ...currentConfig, ...config };

        set((state) => ({
            configs: {
                ...state.configs,
                [agentId]: newConfig,
            },
        }));
    },

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
            const commands = buildConfigCommands(agentId, appId, appSecret);

            const result = await invokeIpc<{ success: boolean; output: string; error?: string }>(
                'terminal:executeCommands',
                {
                    commands,
                    timeout: 30000,
                }
            );

            if (!result.success) {
                throw new Error(result.error || '配置写入失败');
            }

            await get().saveConfig(agentId, {
                enabled: true,
                appId,
                appSecret,
                paired: false,
            });

            // Refresh gateway so it connects to Feishu with the new appID/secret
            set((state) => ({
                binding: {
                    ...state.binding,
                    log: state.binding.log + result.output + '\n>>> 正在重启网关...\n',
                },
            }));

            await invokeIpc('gateway:restart');

            set((state) => ({
                binding: {
                    ...state.binding,
                    step: 'pairing',
                    log: state.binding.log + '>>> 网关已重启',
                },
            }));

            // Allow time for gateway to reconnect to Feishu
            await new Promise(r => setTimeout(r, 2000));

            set((state) => ({
                binding: {
                    ...state.binding,
                    log: state.binding.log + '\n>>> 配置已保存并应用，等待配对...\n',
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
            const bindCommand = buildBindCommand(agentId);

            const result = await invokeIpc<{ success: boolean; output: string; error?: string }>(
                'terminal:executeCommands',
                {
                    commands: [bindCommand],
                    timeout: 30000,
                }
            );

            if (!result.success) {
                throw new Error(result.error || '配对失败');
            }

            await get().saveConfig(agentId, {
                paired: true,
                pairedAt: new Date().toISOString(),
            });

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
                    timeout: 30000,
                }
            );

            if (!result.success) {
                console.warn('Unbind warning:', result.error);
            }

            set((state) => ({
                binding: {
                    ...state.binding,
                    step: 'idle',
                    agentId,
                    log: state.binding.log + result.output + '\n>>> 正在重启网关...\n',
                    loading: true,
                },
            }));
            await invokeIpc('gateway:restart');
            await new Promise(r => setTimeout(r, 2000));

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

export function useAgentFeishuConfig(agentId: string | null): AgentFeishuConfig | null {
    return useAgentFeishuStore((state) =>
        agentId ? state.configs[agentId] || null : null
    );
}

export function useIsAgentFeishuBound(agentId: string | null): boolean {
    return useAgentFeishuStore((state) => {
        const config = agentId ? state.configs[agentId] : null;
        return config?.enabled === true && config?.paired === true;
    });
}
