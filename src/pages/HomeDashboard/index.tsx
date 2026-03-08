import { useEffect, useState } from 'react';
import {
    Users,
    Plus,
    MoreVertical,
    Trash2,
    Settings2,
    ChevronRight,
    PieChart as PieChartIcon,
    BarChart3,
    Search
} from 'lucide-react';
import { useAgentsStore, Agent } from '@/stores/agents';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function HomeDashboard() {
    const navigate = useNavigate();
    const { agents, fetchAgents, deleteAgent } = useAgentsStore();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const filteredAgents = agents.filter(agent =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const statusCounts = {
        idle: agents.filter(a => a.status === 'idle').length,
        busy: agents.filter(a => a.status === 'busy').length,
        offline: agents.filter(a => a.status === 'offline').length,
    };

    return (
        <div className="flex flex-col gap-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">工作台</h1>
                <p className="text-muted-foreground">欢迎回来，这是您的数字员工运行概况。</p>
            </div>

            {/* Analytics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="col-span-1 border-none bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">状态分布</CardTitle>
                            <PieChartIcon className="h-4 w-4 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between text-2xl font-bold">
                                <span>{agents.length}</span>
                                <span className="text-sm font-normal text-muted-foreground">总数</span>
                            </div>
                            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/30">
                                <div
                                    className="bg-green-500 transition-all duration-500"
                                    style={{ width: `${(statusCounts.idle / agents.length) * 100}%` }}
                                />
                                <div
                                    className="bg-amber-500 transition-all duration-500"
                                    style={{ width: `${(statusCounts.busy / agents.length) * 100}%` }}
                                />
                                <div
                                    className="bg-slate-400 transition-all duration-500"
                                    style={{ width: `${(statusCounts.offline / agents.length) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <span>空闲 {statusCounts.idle}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                                    <span>忙碌 {statusCounts.busy}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-slate-400" />
                                    <span>离线 {statusCounts.offline}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-2 shadow-sm transition-all hover:shadow-md border-muted/20">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">消息趋势</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </CardHeader>
                    <CardContent className="h-[120px] flex items-end gap-1.5 px-6 pb-4">
                        {[45, 60, 35, 85, 55, 70, 95].map((val, i) => (
                            <div key={i} className="group relative flex-1">
                                <div
                                    className="w-full bg-primary/20 rounded-t-sm transition-all duration-500 group-hover:bg-primary/40"
                                    style={{ height: `${val}%` }}
                                />
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-popover border px-1.5 py-0.5 rounded text-[10px] shadow-sm z-10 whitespace-nowrap">
                                    {Math.round(val * 1.5)} 消息
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Agents Section */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-semibold">数字员工</h2>
                        <Badge variant="secondary" className="font-mono">{agents.length}</Badge>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="搜索员工..."
                                className="pl-9 bg-background/50 h-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button size="sm" className="h-9 gap-1.5" onClick={() => navigate('/shop')}>
                            <Plus className="h-4 w-4" />
                            <span>新建</span>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredAgents.map((agent) => (
                        <AgentCard
                            key={agent.id}
                            agent={agent}
                            onDelete={() => deleteAgent(agent.id)}
                            onClick={() => navigate(`/employee/${agent.id}`)}
                        />
                    ))}

                    <button
                        onClick={() => navigate('/shop')}
                        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted/30 bg-muted/5 p-6 transition-all hover:bg-muted/10 hover:border-primary/50 group h-[180px]"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                            <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">从商店添加</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function AgentCard({ agent, onDelete, onClick }: { agent: Agent; onDelete: () => void; onClick: () => void }) {
    return (
        <Card
            className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-muted/20 bg-card/50 backdrop-blur-sm cursor-pointer"
            onClick={onClick}
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <CardHeader className="flex flex-row items-start justify-between p-5 pb-2">
                <Avatar className="h-12 w-12 rounded-xl ring-2 ring-background group-hover:scale-110 transition-transform">
                    <AvatarImage src={agent.identity?.avatarUrl} />
                    <AvatarFallback className="text-2xl rounded-xl bg-primary/10">
                        {agent.identity?.emoji || '🤖'}
                    </AvatarFallback>
                </Avatar>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                            <Settings2 className="h-4 w-4" />
                            <span>设置</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive gap-2"
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        >
                            <Trash2 className="h-4 w-4" />
                            <span>删除</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>

            <CardContent className="p-5 pt-2">
                <div className="flex flex-col gap-1">
                    <h3 className="font-bold truncate text-lg">{agent.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 h-4">
                        {agent.workspace || agent.id}
                    </p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <div className={cn(
                            "h-2 w-2 rounded-full",
                            agent.status === 'idle' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" :
                                agent.status === 'busy' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" :
                                    "bg-slate-400"
                        )} />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {agent.status === 'idle' ? 'Running' : agent.status === 'busy' ? 'Working' : 'Offline'}
                        </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
            </CardContent>
        </Card>
    );
}
