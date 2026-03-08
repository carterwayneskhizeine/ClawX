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

interface AgentsState {
    agents: Agent[];
    loading: boolean;
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

// 触发 agent 列表更新事件（供 Sidebar 等组件监听）
export function dispatchAgentsUpdated() {
    window.dispatchEvent(new Event('agents-updated'));
}

export const useAgentsStore = create<AgentsState>((set, get) => ({
    agents: [],
    loading: false,

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

            let mappedAgents: Agent[] = (agentsList).map((agent: any) => ({
                id: agent.id,
                name: agent.identity?.name || agent.name || (agent.id === 'main' ? '通用助手' : agent.id),
                workspace: agent.workspace,
                identity: agent.identity,
                status: agent.id === 'main' ? 'idle' : 'offline',
            }));

            // 如果 Gateway 没有返回任何 agent，添加默认的 main agent
            if (mappedAgents.length === 0) {
                mappedAgents = [{
                    id: 'main',
                    name: '通用助手',
                    workspace: 'D:\\TheClaw\\.openclaw\\workspace-main',
                    identity: {
                        name: '通用助手',
                        emoji: '🤖',
                        theme: '',
                        avatarUrl: '',
                    },
                    status: 'idle',
                }];
            }

            set({ agents: mappedAgents });
        } catch (error) {
            console.error('Failed to fetch agents:', error);
            // Gateway 连接失败时，也显示默认的 main agent
            set({
                agents: [{
                    id: 'main',
                    name: '通用助手',
                    workspace: 'D:\\TheClaw\\.openclaw\\workspace-main',
                    identity: {
                        name: '通用助手',
                        emoji: '🤖',
                        theme: '',
                        avatarUrl: '',
                    },
                    status: 'offline',
                }]
            });
        } finally {
            set({ loading: false });
        }
    },

    createAgent: async ({ agentId, displayName, emoji, workspace }) => {
        set({ loading: true });
        try {
            // Step 1: Create agent with English ID
            const workspacePath = workspace || `D:\\TheClaw\\.openclaw\\workspace-${agentId}`;
            await invokeIpc('gateway:rpc', 'agents.create', {
                name: agentId,
                workspace: workspacePath,
                emoji: emoji || '🤖',
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

            await get().fetchAgents();
            // 触发侧边栏更新事件
            dispatchAgentsUpdated();
        } finally {
            set({ loading: false });
        }
    },

    updateAgent: async (agentId, params) => {
        await invokeIpc('gateway:rpc', 'agents.update', {
            agentId,
            ...params,
        });
        await get().fetchAgents();
    },

    deleteAgent: async (agentId) => {
        set({ loading: true });
        try {
            // Step 1: Delete agent config via Gateway API
            await invokeIpc('gateway:rpc', 'agents.delete', { agentId });

            // Step 2: Cleanup matching files via Electron IPC (will be implemented next)
            await invokeIpc('agent:cleanupFiles', { agentId }).catch(err =>
                console.warn('File cleanup failed:', err)
            );

            await get().fetchAgents();
            // 触发侧边栏更新事件
            dispatchAgentsUpdated();
        } finally {
            set({ loading: false });
        }
    },
}));
