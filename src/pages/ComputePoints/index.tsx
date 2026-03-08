import { useState } from 'react';
import {
    CreditCard,
    Zap,
    History,
    TrendingUp,
    ArrowDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function ComputePoints() {
    const [showRecharge, setShowRecharge] = useState(false);

    return (
        <div className="flex flex-col gap-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">算力积分</h1>
                    <p className="text-muted-foreground">监控并管理您的系统消耗</p>
                </div>
                <Button
                    size="lg"
                    className="h-12 px-8 rounded-full font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2"
                    onClick={() => setShowRecharge(true)}
                >
                    <CreditCard className="h-4 w-4" />
                    充值算力积分
                </Button>
            </div>

            {/* Dashboard Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Score Card */}
                <Card className="lg:col-span-1 border-none bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 rounded-[2rem] shadow-xl flex flex-col justify-between h-[340px]">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-white/80 font-bold uppercase tracking-wider mb-6">
                            <Zap className="h-5 w-5 fill-current" />
                            剩余算力积分
                        </div>
                        <div className="text-6xl font-black">12,500</div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/10 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-blue-200 uppercase font-bold tracking-tighter">今日消耗</span>
                            <div className="flex items-center gap-1.5 text-lg font-bold">
                                <ArrowDownRight className="h-4 w-4 text-red-300" />
                                1,240
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-blue-200 uppercase font-bold tracking-tighter">本月平均</span>
                            <div className="flex items-center gap-1.5 text-lg font-bold">
                                <TrendingUp className="h-4 w-4 text-green-300" />
                                2.8k
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Right: Trend Chart */}
                <Card className="lg:col-span-2 rounded-[2rem] border-muted/20 bg-card shadow-sm p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-bold">算力积分消耗趋势（近30天）</CardTitle>
                            <Badge variant="success" className="rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-none px-3">
                                实时更新
                            </Badge>
                        </div>
                        <SelectRange />
                    </div>

                    <div className="flex-1 flex items-end gap-1 px-2 pb-2">
                        {[40, 30, 45, 60, 55, 70, 85, 95, 80, 70, 60, 50, 40, 35, 45, 50, 60, 75, 80, 70, 65, 55, 45, 40, 35, 30, 40, 55, 70, 90].map((val, i) => (
                            <div key={i} className="flex-1 group relative">
                                <div
                                    className="w-full bg-primary/20 rounded-t-sm transition-all duration-500 group-hover:bg-primary/50"
                                    style={{ height: `${val}%` }}
                                />
                                {i % 5 === 0 && (
                                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground font-medium">
                                        {i + 1}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* History Card */}
            <Card className="rounded-[2rem] border-muted/20 bg-card shadow-sm overflow-hidden min-h-[400px]">
                <header className="px-8 py-6 border-b border-muted/10 bg-muted/5 flex items-center gap-3">
                    <History className="h-5 w-5 text-primary" />
                    <h2 className="font-bold">算力积分消耗记录</h2>
                </header>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest bg-muted/20">
                            <tr>
                                <th className="px-8 py-4">任务名称</th>
                                <th className="px-8 py-4">执行时间</th>
                                <th className="px-8 py-4 text-center">耗时</th>
                                <th className="px-8 py-4 text-right">消耗/充值积分</th>
                                <th className="px-8 py-4 text-right pr-12">剩余积分</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-muted/10">
                            <HistoryRow
                                name="数据清洗专家 - 分析销售报表"
                                time="2024-03-24 14:20:15"
                                duration="45s"
                                amount={-120}
                                balance={12500}
                            />
                            <HistoryRow
                                name="算力积分充值 - 套餐 P3"
                                time="2024-03-23 09:15:22"
                                duration="-"
                                amount={5000}
                                balance={12620}
                            />
                            <HistoryRow
                                name="文案创意大师 - 生成公众号文章"
                                time="2024-03-23 08:30:10"
                                duration="12s"
                                amount={-35}
                                balance={7620}
                            />
                            <HistoryRow
                                name="法律合规顾问 - 合同条款审核"
                                time="2024-03-22 17:45:55"
                                duration="2m 15s"
                                amount={-450}
                                balance={7655}
                            />
                        </tbody>
                    </table>
                </div>
            </Card>

            <RechargeDialog open={showRecharge} onOpenChange={setShowRecharge} />
        </div>
    );
}

function HistoryRow({ name, time, duration, amount, balance }: any) {
    return (
        <tr className="hover:bg-muted/5 transition-colors group">
            <td className="px-8 py-5">
                <div className="font-bold flex items-center gap-2">
                    <div className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        amount > 0 ? "bg-green-500" : amount === 0 ? "bg-slate-400" : "bg-primary"
                    )} />
                    {name}
                </div>
            </td>
            <td className="px-8 py-5 text-muted-foreground font-mono text-[12px]">{time}</td>
            <td className="px-8 py-5 text-center text-muted-foreground">{duration}</td>
            <td className={cn(
                "px-8 py-5 text-right font-black tabular-nums",
                amount > 0 ? "text-green-500" : "text-primary"
            )}>
                {amount > 0 ? `+${amount}` : amount}
            </td>
            <td className="px-8 py-5 text-right pr-12 font-bold tabular-nums opacity-60 group-hover:opacity-100 transition-opacity">
                {balance.toLocaleString()}
            </td>
        </tr>
    );
}

function SelectRange() {
    return (
        <div className="flex bg-muted/30 p-1 rounded-xl border border-muted/20">
            <button className="px-3 py-1 text-[10px] font-bold rounded-lg bg-background shadow-sm">7天</button>
            <button className="px-3 py-1 text-[10px] font-bold text-muted-foreground rounded-lg hover:bg-muted/50">30天</button>
            <button className="px-3 py-1 text-[10px] font-bold text-muted-foreground rounded-lg hover:bg-muted/50">全部</button>
        </div>
    );
}

function RechargeDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const plans = [
        { id: 'P1', points: 1000, price: 10, bonus: 0 },
        { id: 'P2', points: 5000, price: 45, bonus: 500 },
        { id: 'P3', points: 10000, price: 80, bonus: 2000, recommended: true },
        { id: 'P4', points: 50000, price: 380, bonus: 15000 },
    ];

    const [selected, setSelected] = useState('P3');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[580px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
                <DialogHeader className="px-8 py-6 border-b bg-muted/5">
                    <DialogTitle className="text-xl font-bold">算力积分充值</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">选择适合您的套餐，为数字员工提供源源不断的动力</p>
                </DialogHeader>

                <div className="p-8 grid grid-cols-2 gap-4">
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            onClick={() => setSelected(plan.id)}
                            className={cn(
                                "p-5 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden group",
                                selected === plan.id
                                    ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                                    : "border-muted/30 hover:border-primary/50 bg-background"
                            )}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                                    selected === plan.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                )}>
                                    <Zap className="h-5 w-5 fill-current" />
                                </div>
                                {plan.bonus > 0 && (
                                    <Badge variant="success" className="rounded-full bg-green-50 text-green-600 border-none font-bold text-[10px]">
                                        赠 {plan.bonus}
                                    </Badge>
                                )}
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black">{plan.points.toLocaleString()}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-[9px]">算力积分</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-primary">¥{plan.price}</span>
                                    <span className="text-xs text-muted-foreground line-through opacity-50">
                                        ¥{Math.round(plan.price * 1.5)}
                                    </span>
                                </div>
                            </div>

                            {plan.recommended && (
                                <div className="absolute bottom-0 right-0 bg-gradient-to-tr from-amber-500 to-yellow-400 text-white text-[10px] font-black px-3 py-1.5 rounded-tl-2xl shadow-sm">
                                    推荐
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="px-8 py-6 bg-muted/10 border-t flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-[9px]">应付金额</span>
                        <div className="text-3xl font-black text-primary tracking-tighter">
                            ¥{plans.find(p => p.id === selected)?.price}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" className="h-12 px-6 rounded-xl font-bold" onClick={() => onOpenChange(false)}>取消</Button>
                        <Button className="h-12 px-10 rounded-xl font-black bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">立即支付</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
