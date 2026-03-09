import { useEffect, useState } from 'react';
import {
    Plus,
    Settings,
    CloudDownload
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { useAgentsStore, Agent } from '@/stores/agents';
import { useAgentFeishuConfig } from '@/stores/agentFeishu';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AgentFormDialog } from '@/components/common/AgentFormDialog';
import { AgentManageDialog } from '@/components/common/AgentManageDialog';
import { AgentAdvancedConfigDialog } from '@/components/common/AgentAdvancedConfigDialog';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const DATA_7_DAYS = [
    { name: '周一', usage: 1200 },
    { name: '周二', usage: 1900 },
    { name: '周三', usage: 800 },
    { name: '周四', usage: 2400 },
    { name: '周五', usage: 1600 },
    { name: '周六', usage: 500 },
    { name: '周日', usage: 200 },
];

const MOCK_USER = { points: 8000, totalPoints: 10000 };

const PIE_DATA = [
    { name: '已使用', value: MOCK_USER.totalPoints - MOCK_USER.points },
    { name: '剩余', value: MOCK_USER.points },
];

export function HomeDashboard() {
    const navigate = useNavigate();
    const { agents, fetchAgents, deleteAgent, createAgent, updateAgent, loading } = useAgentsStore();
    const [searchQuery] = useState('');

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
    const [isAdvancedConfigOpen, setIsAdvancedConfigOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [configAgent, setConfigAgent] = useState<Agent | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchAgents();

        // 监听 Gateway 就绪事件，自动刷新 agent 列表
        const handleGatewayReady = () => {
            fetchAgents();
        };
        window.addEventListener('gateway-ready', handleGatewayReady);

        return () => {
            window.removeEventListener('gateway-ready', handleGatewayReady);
        };
    }, [fetchAgents]);

    const filteredAgents = agents.filter(agent =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header Section */}
            <header className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-1">控制面板</h2>
                    <p className="text-muted-foreground text-sm">欢迎您，这是您的数字员工概览</p>
                </div>
                <Button
                    className="rounded-xl shadow-sm bg-green-500 hover:bg-green-600 dark:bg-green-500 dark:hover:bg-green-400 dark:text-white border-none flex items-center justify-center gap-2 px-4"
                >
                    <CloudDownload className="h-4 w-4" />
                    <span>发现新版本</span>
                </Button>
            </header>

            {/* Agents Section */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold m-0">数字员工状态 ({agents.length})</h4>
                    <div className="flex gap-2">
                        <Button
                            className="rounded-xl shadow-sm bg-blue-600 hover:bg-blue-500 text-white border-none flex items-center justify-center gap-2"
                            onClick={() => {
                                setEditingAgent(null);
                                setIsCreateDialogOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4" />
                            <span>创建员工</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-xl shadow-sm flex items-center justify-center gap-2"
                            onClick={() => setIsManageDialogOpen(true)}
                        >
                            <Settings className="h-4 w-4" />
                            <span>进入管理</span>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {loading && agents.length === 0 ? (
                        <div className="col-span-full py-12 flex justify-center text-muted-foreground">
                            加载代理列表中...
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-slate-400">
                            未发现活跃的数字员工
                        </div>
                    ) : filteredAgents.map((agent) => (
                        <AgentCard
                            key={agent.id}
                            agent={agent}
                            onClick={() => navigate(`/employee/${agent.id}`)}
                        />
                    ))}
                </div>
            </section>

            {/* Analytics Dashboard */}
            <section className="pb-12">
                <h4 className="text-lg font-semibold mb-4 mx-0">算力统计仪表盘</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pie Chart / Points Info */}
                    <Card className="rounded-3xl border-slate-100 dark:border-white/5 bg-card h-full shadow-sm overflow-hidden">
                        <CardContent className="p-6">
                            <span className="uppercase tracking-wider font-semibold text-xs block mb-4 text-muted-foreground dark:text-slate-500">算力积分配额</span>
                            <div className="flex flex-col md:flex-row items-center justify-around h-[300px]">
                                <motion.div
                                    className="w-full max-w-[200px] h-[200px]"
                                    whileHover={{ rotate: 3, scale: 1.03 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={PIE_DATA}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {PIE_DATA.map((_entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={index === 0 ? 'rgba(226, 232, 240, 0.5)' : '#1677ff'}
                                                        className={index === 0 ? "dark:fill-white/5" : "dark:fill-blue-500"}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                                                formatter={(value: any) => [Number(value || 0).toLocaleString(), '积分']}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </motion.div>
                                <div className="space-y-4 text-center md:text-left">
                                    <div>
                                        <span className="text-xs text-muted-foreground dark:text-slate-500 block">当前可用积分</span>
                                        <div className="text-3xl font-black text-blue-600 dark:text-blue-500 drop-shadow-[0_0_10px_rgba(22,119,255,0.3)]">{MOCK_USER.points.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground dark:text-slate-500 block">今日消耗积分</span>
                                        <div className="text-xl font-bold text-slate-700 dark:text-slate-200">1,240</div>
                                    </div>
                                    <div className="pt-2">
                                        <Button
                                            size="lg"
                                            className="rounded-xl font-bold shadow-lg shadow-blue-100 dark:shadow-none bg-blue-600 hover:bg-blue-700 text-white transition-transform hover:scale-105 active:scale-95"
                                            onClick={() => navigate('/points?recharge=true')}
                                        >
                                            立即充值
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bar Chart / Usage Trend */}
                    <Card className="rounded-3xl border-slate-100 dark:border-white/5 bg-card h-full shadow-sm">
                        <CardContent className="p-6">
                            <span className="uppercase tracking-wider font-semibold text-xs block mb-4 text-muted-foreground dark:text-slate-500">近7天使用趋势</span>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={DATA_7_DAYS}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10 dark:opacity-5" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: 'currentColor', opacity: 0.05 }}
                                            contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                                            formatter={(value: any) => [Number(value || 0).toLocaleString(), '使用量']}
                                        />
                                        <Bar dataKey="usage" fill="#1677ff" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Create/Edit Dialog */}
            <AgentFormDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                agent={editingAgent}
                onSave={async (data) => {
                    if (editingAgent) {
                        await updateAgent(editingAgent.id, {
                            name: data.name,
                            avatar: data.avatar
                        });
                    } else {
                        await createAgent({
                            agentId: data.agentId!,
                            displayName: data.name,
                            emoji: data.emoji,
                            workspace: undefined
                        });
                    }
                    setIsCreateDialogOpen(false);
                    setEditingAgent(null);
                    fetchAgents();
                }}
                loading={loading}
            />

            {/* Manage Dialog */}
            <AgentManageDialog
                open={isManageDialogOpen}
                onOpenChange={setIsManageDialogOpen}
                agents={agents}
                loading={loading}
                onEdit={(agent) => {
                    setEditingAgent(agent);
                    setIsManageDialogOpen(false);
                    setIsCreateDialogOpen(true);
                }}
                onDelete={async (agentId) => {
                    setDeletingIds(prev => new Set(prev).add(agentId));
                    try {
                        await deleteAgent(agentId);
                    } finally {
                        setDeletingIds(prev => {
                            const next = new Set(prev);
                            next.delete(agentId);
                            return next;
                        });
                    }
                }}
                onAdvancedConfig={(agent) => {
                    setConfigAgent(agent);
                    setIsManageDialogOpen(false);
                    setIsAdvancedConfigOpen(true);
                }}
                deletingIds={deletingIds}
            />

            {/* Advanced Config Dialog */}
            <AgentAdvancedConfigDialog
                open={isAdvancedConfigOpen}
                onOpenChange={setIsAdvancedConfigOpen}
                agent={configAgent}
            />
        </div>
    );
}

function AgentCard({ agent, onClick }: { agent: Agent; onClick: () => void }) {
    // 使用随机互联网照片作为头像，如果没有设置 avatarUrl
    const avatarUrl = agent.identity?.avatarUrl || `https://picsum.photos/seed/${agent.id}/200`;

    return (
        <Card
            className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-slate-100 dark:border-white/5 bg-card/50 backdrop-blur-sm cursor-pointer rounded-2xl min-h-[200px] flex flex-col justify-center"
            onClick={onClick}
        >
            <CardContent className="p-4 pt-4 flex flex-col items-center justify-center h-full">
                <div className="absolute top-2 right-2">
                    <AgentFeishuStatus agentId={agent.id} />
                </div>
                <div className="relative inline-block mb-3">
                    <Avatar className="h-16 w-16 rounded-2xl ring-1 ring-slate-100 dark:ring-white/10 group-hover:scale-110 transition-transform">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback className="text-2xl rounded-2xl bg-primary/10">
                            {agent.identity?.emoji || '🤖'}
                        </AvatarFallback>
                    </Avatar>
                </div>

                <h5 className="font-semibold truncate text-sm mb-1 dark:text-slate-100 w-full text-center">{agent.name}</h5>

                <p className={cn(
                    "text-xs line-clamp-2 w-full leading-relaxed overflow-hidden text-ellipsis text-center",
                    agent.status === 'idle' ? "text-green-500 dark:text-green-400" : "text-[#F4B400] dark:text-amber-400"
                )}>
                    {agent.status === 'idle' ? '在线' : '工作中'}
                </p>


            </CardContent>
        </Card>
    );
}

function AgentFeishuStatus({ agentId }: { agentId: string }) {
    const config = useAgentFeishuConfig(agentId);

    if (!config?.enabled) return null;

    return (
        <div
            className={cn(
                "w-2 h-2 rounded-full",
                config.paired
                    ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                    : "bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]"
            )}
            title={config.paired ? '飞书已绑定' : '飞书待配对'}
        />
    );
}
