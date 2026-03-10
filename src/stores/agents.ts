import { create } from 'zustand';
import { invokeIpc } from '@/lib/api-client';

export interface AgentIdentity {
    name?: string;
    emoji?: string;
    theme?: string;
    avatarUrl?: string;
}

export interface Agent {
    id: string;
    name: string;
    workspace?: string;
    identity?: AgentIdentity;
    status: 'idle' | 'busy' | 'offline';
}

// 本地缓存 key
const AGENT_NAMES_STORAGE_KEY = 'clawx_agent_display_names';
const AGENT_AVATARS_STORAGE_KEY = 'clawx_agent_avatar_urls';

// 从 localStorage 加载缓存的显示名称
function loadAgentDisplayNames(): Record<string, string> {
    try {
        const stored = localStorage.getItem(AGENT_NAMES_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

// 保存到 localStorage
function saveAgentDisplayNames(names: Record<string, string>) {
    try {
        localStorage.setItem(AGENT_NAMES_STORAGE_KEY, JSON.stringify(names));
    } catch (e) {
        console.warn('Failed to save agent display names:', e);
    }
}

// 从 localStorage 加载头像 URL 缓存
function loadAgentAvatarUrls(): Record<string, string> {
    try {
        const stored = localStorage.getItem(AGENT_AVATARS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

// 保存头像 URL 到 localStorage
function saveAgentAvatarUrls(urls: Record<string, string>) {
    try {
        localStorage.setItem(AGENT_AVATARS_STORAGE_KEY, JSON.stringify(urls));
    } catch (e) {
        console.warn('Failed to save agent avatar urls:', e);
    }
}

interface AgentsState {
    agents: Agent[];
    loading: boolean;
    // 本地缓存的显示名称映射 (agentId -> displayName)
    agentDisplayNames: Record<string, string>;
    // 本地缓存的头像 URL映射 (agentId -> avatarUrl)
    agentAvatarUrls: Record<string, string>;
    fetchAgents: () => Promise<void>;
    createAgent: (params: {
        agentId: string;
        displayName: string;
        emoji?: string;
        workspace?: string;
        avatarUrl?: string;
    }) => Promise<void>;
    updateAgent: (agentId: string, params: { name?: string; avatarUrl?: string }) => Promise<void>;
    deleteAgent: (agentId: string) => Promise<void>;
    setAgentStatus: (agentId: string, status: 'idle' | 'busy') => void;
}

// 触发 agent 列表更新事件（供 Sidebar 等组件监听）
export function dispatchAgentsUpdated() {
    window.dispatchEvent(new Event('agents-updated'));
}

export const useAgentsStore = create<AgentsState>((set, get) => ({
    agents: [],
    loading: false,
    agentDisplayNames: loadAgentDisplayNames(),
    agentAvatarUrls: loadAgentAvatarUrls(),

    fetchAgents: async () => {
        set({ loading: true });
        try {
            // Gateway RPC 返回格式是 { success: true, result: { agents: [...] } }
            const res = await invokeIpc<{ agents: any[] }>('gateway:rpc', 'agents.list', {});

            // 正确的字段路径：res.result.agents
            let agentsList: any[] = [];
            if (Array.isArray(res?.result?.agents)) {
                agentsList = res.result.agents;
            } else if (Array.isArray(res)) {
                agentsList = res;
            } else if (Array.isArray(res?.agents)) {
                agentsList = res.agents;
            }

            // 获取本地缓存的显示名称
            const cachedNames = get().agentDisplayNames;
            // 获取本地缓存的头像 URL
            const cachedAvatars = get().agentAvatarUrls;

            let mappedAgents: Agent[] = (agentsList).map((agent: any) => {
                // 优先使用本地缓存的名称（用户创建时输入的中文名）
                // 其次使用 Gateway 返回的 name
                // 最后使用 id
                const cachedName = cachedNames[agent.id];
                const displayName = cachedName || agent.name || agent.identity?.name || (agent.id === 'main' ? '通用助手' : agent.id);
                // 优先使用本地缓存的头像 URL
                const cachedAvatarUrl = cachedAvatars[agent.id];
                const identity = agent.identity ? {
                    ...agent.identity,
                    avatarUrl: cachedAvatarUrl || agent.identity.avatarUrl,
                } : (cachedAvatarUrl ? { avatarUrl: cachedAvatarUrl } : undefined);
                return {
                    id: agent.id,
                    name: displayName,
                    workspace: agent.workspace,
                    identity,
                    status: 'idle' as const,
                };
            });

            // 不再使用默认 main agent 兜底，等待 Gateway 准备好后自动刷新
            set({ agents: mappedAgents });
        } catch (error) {
            console.error('Failed to fetch agents:', error);
            // Gateway 连接失败时显示空列表，等待重试
            set({ agents: [] });
        } finally {
            set({ loading: false });
        }
    },

    createAgent: async ({ agentId, displayName, emoji, workspace, avatarUrl }) => {
        set({ loading: true });
        try {
            // Step 0: 先保存显示名称到本地缓存（乐观更新）
            const currentNames = get().agentDisplayNames;
            const newNames = { ...currentNames, [agentId]: displayName };
            set({ agentDisplayNames: newNames });
            saveAgentDisplayNames(newNames);

            // Step 1: Create agent with English ID
            const workspacePath = workspace || `D:\\TheClaw\\.openclaw\\workspace-${agentId}`;
            await invokeIpc('gateway:rpc', 'agents.create', {
                name: agentId,
                workspace: workspacePath,
                emoji: emoji || '🤖',
                avatarUrl: avatarUrl
            });

            // Step 2: Set display name via update with retries
            const updateDisplayName = async (retries = 3, delay = 1500) => {
                for (let i = 0; i < retries; i++) {
                    try {
                        await invokeIpc('gateway:rpc', 'agents.update', {
                            agentId,
                            name: displayName,
                        });
                        return;
                    } catch (err) {
                        if (i < retries - 1) {
                            await new Promise((r) => setTimeout(r, delay));
                        } else {
                            throw err;
                        }
                    }
                }
            };
            await updateDisplayName();

            // Step 3: Copy template files via Electron IPC (will be implemented next)
            await invokeIpc('agent:copyTemplates', {
                agentId,
                workspaceDir: workspacePath,
            }).catch(err => console.warn('Template copy failed:', err));

            // Step 4: Initialize empty Feishu config for this agent
            await invokeIpc('feishu:initAccountConfig', { agentId })
                .catch(err => console.warn('Feishu config init failed:', err));

            await get().fetchAgents();
            // 触发侧边栏更新事件
            dispatchAgentsUpdated();
        } finally {
            set({ loading: false });
        }
    },

    updateAgent: async (agentId, params) => {
        if (params.name) {
            const currentNames = get().agentDisplayNames;
            const newNames = { ...currentNames, [agentId]: params.name };
            set({ agentDisplayNames: newNames });
            saveAgentDisplayNames(newNames);
        }
        if (params.avatarUrl) {
            // 将头像 URL 本地持久化（不依赖 Gateway 存储）
            const currentAvatars = get().agentAvatarUrls;
            const newAvatars = { ...currentAvatars, [agentId]: params.avatarUrl };
            set({ agentAvatarUrls: newAvatars });
            saveAgentAvatarUrls(newAvatars);
            // 同时也尝试告知 Gateway（即便失败也不影响本地缓存）
        }
        try {
            await invokeIpc('gateway:rpc', 'agents.update', {
                agentId,
                ...params,
            });
        } catch (e) {
            console.warn('agents.update RPC failed (avatar may not be supported by Gateway):', e);
        }
        await get().fetchAgents();
        dispatchAgentsUpdated();
    },

    deleteAgent: async (agentId) => {
        // Step 0: 乐观更新 - 先从本地列表中移除， immediately update UI
        const currentAgents = get().agents;
        const updatedAgents = currentAgents.filter(a => a.id !== agentId);
        set({ agents: updatedAgents, loading: true });
        // 触发侧边栏更新
        dispatchAgentsUpdated();

        try {
            // Step 1: Delete agent config via Gateway API
            await invokeIpc('gateway:rpc', 'agents.delete', { agentId });

            // Step 2: Cleanup matching files via Electron IPC
            await invokeIpc('agent:cleanupFiles', { agentId }).catch(err =>
                console.warn('File cleanup failed:', err)
            );

            // Step 3: Cleanup Feishu config
            await invokeIpc('feishu:deleteAccountConfig', { agentId }).catch(err =>
                console.warn('Feishu config cleanup failed:', err)
            );

            // Step 3: 清理本地缓存的显示名称
            const currentNames = get().agentDisplayNames;
            if (currentNames[agentId]) {
                const newNames = { ...currentNames };
                delete newNames[agentId];
                set({ agentDisplayNames: newNames });
                saveAgentDisplayNames(newNames);
            }

            // Step 4: 等待 Gateway 完成删除后再刷新列表（确保同步）
            await new Promise(r => setTimeout(r, 500));
            await get().fetchAgents();
            // 再次触发更新确保所有组件同步
            dispatchAgentsUpdated();
        } catch (error) {
            // 如果删除失败，恢复原来的列表
            console.error('Failed to delete agent:', error);
            set({ agents: currentAgents });
            // 重新获取确保状态正确
            await get().fetchAgents();
            dispatchAgentsUpdated();
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    // 设置 agent 状态（用于在对话时显示"工作中"状态）
    setAgentStatus: (agentId, status) => {
        set((state) => ({
            agents: state.agents.map((agent) =>
                agent.id === agentId ? { ...agent, status } : agent
            ),
        }));
    },
}));
