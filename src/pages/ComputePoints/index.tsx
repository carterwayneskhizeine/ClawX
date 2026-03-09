import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Zap,
    History,
    CreditCard,
    CheckCircle2,
    X,
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MOCK_USER, MOCK_COMPUTE_LOGS, RECHARGE_PLANS } from './constants';
import type { ComputeLog } from './types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 10;
const DATA_30_DAYS = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    usage: Math.floor(Math.random() * 500) + 100
}));

export function ComputePoints() {
    const [showRecharge, setShowRecharge] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [logs, setLogs] = useState<ComputeLog[]>(MOCK_COMPUTE_LOGS);
    const [userPoints, setUserPoints] = useState(MOCK_USER.points);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        if (searchParams.get('recharge') === 'true') {
            setShowRecharge(true);
            // Optionally clear the parameter so it doesn't reopen on refresh if desired
            // But usually, it's fine as per user request
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('recharge');
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const totalPages = Math.ceil(logs.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedLogs = logs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleRecharge = () => {
        if (!selectedPlan) return;

        const plan = RECHARGE_PLANS.find(p => p.id === selectedPlan);
        if (!plan) return;

        const newPoints = userPoints + plan.points;
        setUserPoints(newPoints);

        const now = new Date();
        const timeString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const newLog: ComputeLog = {
            id: `R${Date.now()}`,
            taskName: '账号积分充值',
            startTime: timeString,
            endTime: timeString,
            duration: '-',
            points: plan.points,
            remainingPoints: newPoints
        };

        setLogs([newLog, ...logs]);
        setShowRecharge(false);
        setSelectedPlan(null);
        toast.success(`成功充值 ${plan.points.toLocaleString()} 算力积分`);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight !mb-1">算力积分</h2>
                    <p className="text-muted-foreground text-sm">监控并管理您的系统消耗</p>
                </div>
                <Button
                    onClick={() => setShowRecharge(true)}
                    className="rounded-full font-bold shadow-lg shadow-blue-100 dark:shadow-blue-900/20 h-12 px-8 flex items-center gap-2"
                >
                    <CreditCard className="w-5 h-5" />
                    充值算力积分
                </Button>
            </header>

            {/* Dashboard Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-gradient-to-br from-blue-600 to-blue-800 dark:from-[#1c1c1c] dark:to-[#141414] dark:border dark:border-white/5 p-8 rounded-[2rem] shadow-xl text-white flex flex-col justify-between">
                    <div>
                        <div className="flex items-center space-x-2 opacity-80 mb-6 font-bold">
                            <Zap className="w-5 h-5 fill-current" />
                            <span className="text-base uppercase tracking-wider">剩余算力积分</span>
                        </div>
                        <p className="text-6xl font-black">{userPoints.toLocaleString()}</p>
                    </div>
                    <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-blue-200 dark:text-slate-500">今日消耗</span>
                            <span className="text-lg font-bold">1,240</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-blue-200 dark:text-slate-500">本月平均</span>
                            <span className="text-lg font-bold">4,500</span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white dark:bg-[#1c1c1c] p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">算力积分消耗趋势（近30天）</h3>
                        <Badge variant="success" className="rounded-full px-3 py-1 font-bold border-none bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">实时更新</Badge>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={DATA_30_DAYS}>
                                <defs>
                                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1677ff" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#1677ff" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(val) => `${val}日`} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: document.documentElement.classList.contains('dark') ? '#262626' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000' }}
                                    itemStyle={{ color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000' }}
                                    formatter={(value: number) => [value.toLocaleString(), '消耗量']}
                                    labelFormatter={(label) => `日期: ${label}日`}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="usage"
                                    stroke="#1677ff"
                                    fillOpacity={1}
                                    fill="url(#colorUsage)"
                                    strokeWidth={3}
                                    isAnimationActive={true}
                                    animationDuration={1500}
                                    animationBegin={300}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Log Section */}
            <Card className="rounded-[2rem] shadow-sm border-slate-100 dark:border-white/5 dark:bg-[#1c1c1c] overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <History className="mr-2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                        算力积分消耗记录
                    </h3>
                </div>
                <div className="px-8 pb-8 pt-4">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-none hover:bg-transparent">
                                <TableHead className="font-bold">任务名称</TableHead>
                                <TableHead className="font-bold">执行时间</TableHead>
                                <TableHead className="font-bold">耗时</TableHead>
                                <TableHead className="font-bold text-right">消耗/充值积分</TableHead>
                                <TableHead className="font-bold text-right">剩余积分</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedLogs.map((record) => (
                                <TableRow key={record.id} className="border-slate-50 dark:border-white/5">
                                    <TableCell className="font-medium text-slate-800 dark:text-slate-100">{record.taskName}</TableCell>
                                    <TableCell>
                                        <div className="text-sm text-[#5F6368] dark:text-slate-400">
                                            <div>{record.startTime}</div>
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500">至 {record.endTime}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-[#5F6368] dark:text-slate-400">{record.duration}</TableCell>
                                    <TableCell className="text-right">
                                        {record.taskName === '账号积分充值' ? (
                                            <span className="font-bold text-green-500">+{Math.abs(record.points)}</span>
                                        ) : (
                                            <span className="font-bold text-blue-600">-{Math.abs(record.points)}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-slate-700 dark:text-slate-200">
                                        {record.remainingPoints?.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {/* Pagination Controls */}
                <div className="px-8 py-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/30 dark:bg-white/5">
                    <div className="text-xs text-slate-500 font-medium">
                        共 {logs.length} 条记录，第 {currentPage} / {totalPages} 页
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg border-slate-200 dark:border-white/10"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Simple pagination logic to show current and surrounding pages
                                let pageNum = currentPage;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else {
                                    if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <Button
                                        key={pageNum}
                                        variant={currentPage === pageNum ? "default" : "ghost"}
                                        size="sm"
                                        className={cn(
                                            "h-8 w-8 p-0 rounded-lg text-xs font-bold",
                                            currentPage !== pageNum && "text-slate-500"
                                        )}
                                        onClick={() => setCurrentPage(pageNum)}
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg border-slate-200 dark:border-white/10"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Recharge Modal */}
            <Dialog open={showRecharge} onOpenChange={setShowRecharge}>
                <DialogContent className="p-0 border-none max-w-[576px] rounded-[1.25rem] overflow-hidden">
                    <div className="px-8 py-5 border-b border-slate-50 dark:border-white/5 dark:bg-[#141414]">
                        <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">算力积分充值</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-500">选择适合您的套餐，即刻提升效率</p>
                    </div>

                    <div className="p-6 grid grid-cols-2 gap-4 dark:bg-[#141414]">
                        {RECHARGE_PLANS.map((plan) => (
                            <div
                                key={plan.id}
                                onClick={() => setSelectedPlan(plan.id)}
                                className={cn(
                                    "p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative group",
                                    selectedPlan === plan.id
                                        ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/20'
                                        : 'border-slate-100 dark:border-white/5 bg-white dark:bg-[#1c1c1c] hover:border-blue-200 dark:hover:border-blue-700'
                                )}
                            >
                                {plan.id === 'P3' && (
                                    <div className="absolute bottom-0 right-0 bg-gradient-to-tr from-orange-500 to-amber-400 text-white text-[10px] font-bold px-3 py-1 rounded-tl-2xl rounded-br-2xl shadow-sm z-10">
                                        推荐
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-2">
                                    <div className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center",
                                        selectedPlan === plan.id ? 'bg-blue-500 text-white' : 'bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500'
                                    )}>
                                        <Zap className="w-5 h-5 fill-current" />
                                    </div>
                                    {selectedPlan === plan.id && (
                                        <CheckCircle2 className="text-blue-500 w-5 h-5" />
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                                        {plan.points.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-wider">算力积分</p>
                                </div>

                                <div className="mt-3 flex items-baseline space-x-1.5">
                                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">¥{plan.price}</span>
                                    <span className="text-xs text-slate-300 dark:text-slate-700 line-through font-medium">¥{(plan.price * 1.5).toFixed(0)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="px-8 py-5 bg-slate-50/80 dark:bg-[#1c1c1c]/80 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-baseline space-x-3">
                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">应付金额:</span>
                            <div className="flex items-baseline space-x-1">
                                <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">¥</span>
                                <span className="text-3xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">
                                    {RECHARGE_PLANS.find(p => p.id === selectedPlan)?.price || '0.00'}
                                </span>
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowRecharge(false)}
                                className="rounded-xl font-medium px-6"
                            >
                                取消
                            </Button>
                            <Button
                                disabled={!selectedPlan}
                                onClick={handleRecharge}
                                className="rounded-xl font-bold px-8 shadow-sm"
                            >
                                立即支付
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
