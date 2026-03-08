import { useState } from 'react';
import {
    Palette,
    Bell,
    Server,
    ShieldCheck,
    RefreshCw,
    CheckCircle2,
    FileText,
    ExternalLink
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settings';
import { useGatewayStore } from '@/stores/gateway';
import { invokeIpc } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export function SysSettings() {
    const {
        theme,
        setTheme,

        fileAccessAllowed,
        setFileAccessAllowed
    } = useSettingsStore();

    const gatewayStatus = useGatewayStore((s) => s.status);
    const restartGateway = useGatewayStore((s) => s.restart);

    const [showLogs, setShowLogs] = useState(false);
    const [logContent, setLogContent] = useState('');

    const handleShowLogs = async () => {
        try {
            const logs = await invokeIpc<string>('log:readFile', 100);
            setLogContent(logs);
            setShowLogs(true);
        } catch {
            setLogContent('(Failed to load logs)');
            setShowLogs(true);
        }
    };

    const handleOpenLogDir = async () => {
        try {
            const logDir = await invokeIpc<string>('log:getDir');
            if (logDir) {
                await invokeIpc('shell:showItemInFolder', logDir);
            }
        } catch { /* ignore */ }
    };





    return (
        <div className="flex flex-col gap-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">系统设置</h1>
                <p className="text-muted-foreground">管理您的工作空间偏好与核心网关连接配置</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Appearance + Notifications */}
                <div className="xl:col-span-2 flex flex-col gap-8">
                    {/* Appearance Card */}
                    <Card className="rounded-[2rem] border-muted/20 dark:bg-card overflow-hidden">
                        <CardHeader className="border-b border-muted/10 bg-muted/5 p-6">
                            <div className="flex items-center gap-2">
                                <Palette className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">界面外观</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            {/* Theme Selector */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <ThemeOption
                                    active={theme === 'light'}
                                    onClick={() => setTheme('light')}
                                    label="简约白"
                                    description="在光线充足的环境下提供最佳阅读体验"
                                    mode="light"
                                />
                                <ThemeOption
                                    active={theme === 'dark'}
                                    onClick={() => setTheme('dark')}
                                    label="极客黑"
                                    description="深色的视觉风格，降低眼部疲劳"
                                    mode="dark"
                                />
                                <ThemeOption
                                    active={theme === 'system'}
                                    onClick={() => setTheme('system')}
                                    label="跟随系统"
                                    description="根据操作系统设置自动调整"
                                    mode="system"
                                />
                            </div>


                        </CardContent>
                    </Card>

                    {/* Notifications Card */}
                    <Card className="rounded-[2rem] border-muted/20 dark:bg-card overflow-hidden">
                        <CardHeader className="border-b border-muted/10 bg-muted/5 p-6">
                            <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">通知设置</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="font-bold">系统实时通知</span>
                                    <p className="text-xs text-muted-foreground">接收数字员工任务完成或系统异常的桌面通知</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="h-px bg-muted/20" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="font-bold">算力余额预警</span>
                                    <p className="text-xs text-muted-foreground">当算力积分低于 1000 时发送提醒</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Gateway + Security + Actions */}
                <div className="flex flex-col gap-8">
                    {/* Gateway Card */}
                    <Card className="rounded-[2rem] border-muted/20 dark:bg-card overflow-hidden">
                        <CardHeader className="border-b border-muted/10 bg-muted/5 p-6">
                            <div className="flex items-center gap-2">
                                <Server className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">网关连接</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Gateway Stats Row */}
                            <div className="flex flex-col gap-4">
                                <div className="p-4 bg-muted/30 rounded-2xl border border-muted/10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="space-y-0.5">
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">网关状态</div>
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "h-2 w-2 rounded-full",
                                                    gatewayStatus.state === 'running' ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-red-500"
                                                )} />
                                                <span className="text-sm font-bold capitalize">{gatewayStatus.state}</span>
                                            </div>
                                        </div>
                                        <div className="h-8 w-px bg-muted/20" />
                                        <div className="space-y-0.5">
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">网关端口</div>
                                            <div className="text-sm font-bold">18766</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 px-3 rounded-xl gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
                                            onClick={() => restartGateway()}
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                            <span className="text-xs font-bold">重启</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 px-3 rounded-xl gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
                                            onClick={handleShowLogs}
                                        >
                                            <FileText className="h-4 w-4" />
                                            <span className="text-xs font-bold">日志</span>
                                        </Button>
                                    </div>
                                </div>

                                {showLogs && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">最近运行日志</span>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="sm" className="h-6 text-[10px] rounded-lg" onClick={handleOpenLogDir}>
                                                    <ExternalLink className="h-3 w-3 mr-1" />
                                                    打开目录
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-6 text-[10px] rounded-lg" onClick={() => setShowLogs(false)}>
                                                    关闭
                                                </Button>
                                            </div>
                                        </div>
                                        <pre className="text-[11px] text-muted-foreground bg-muted/20 p-4 rounded-2xl max-h-48 overflow-auto whitespace-pre-wrap font-mono border border-muted/10">
                                            {logContent || '暂无日志内容'}
                                        </pre>
                                    </div>
                                )}
                            </div>

                            {/* Config Fields */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between px-1">
                                    <div className="space-y-0.5">
                                        <div className="text-sm font-bold">启动时自动连接</div>
                                        <p className="text-[11px] text-muted-foreground">应用开启后自动启动并连接网关</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security Card */}
                    <Card className="rounded-[2rem] border-muted/20 dark:bg-card overflow-hidden">
                        <CardHeader className="border-b border-muted/10 bg-muted/5 p-6">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">安全与账户</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="flex items-center justify-between px-2 py-2 rounded-xl bg-muted/20 border border-muted/10 shadow-sm">
                                <div className="space-y-0.5">
                                    <div className="text-sm font-bold">文件访问权限</div>
                                    <p className="text-[11px] text-muted-foreground">允许 AI Agent 直接读写您的本地文件</p>
                                </div>
                                <Switch
                                    checked={fileAccessAllowed}
                                    onCheckedChange={setFileAccessAllowed}
                                />
                            </div>
                        </CardContent>
                    </Card>




                </div>
            </div>
        </div>
    );
}

function ThemeOption({
    active,
    onClick,
    label,
    description,
    mode
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    description: string;
    mode: 'light' | 'dark' | 'system';
}) {
    return (
        <div
            className={cn(
                "group p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col gap-3",
                active
                    ? "border-primary bg-primary/5 dark:bg-primary/10 ring-4 ring-primary/10 shadow-lg shadow-primary/5"
                    : "border-muted/30 hover:border-primary/40 hover:bg-muted/10 bg-background/50 shadow-sm"
            )}
            onClick={onClick}
        >
            <div className={cn(
                "h-24 w-full rounded-xl overflow-hidden border border-muted/20 relative transition-transform duration-300 group-hover:scale-[1.02]",
                mode === 'light' ? "bg-slate-50" : mode === 'dark' ? "bg-black" : "bg-gradient-to-br from-slate-50 via-slate-400 to-black"
            )}>
                {/* Mock UI Structure */}
                <div className="absolute inset-0 flex">
                    {/* Mock Sidebar */}
                    <div className={cn(
                        "w-1/3 border-r h-full p-2 space-y-2",
                        mode === 'light' ? "bg-white border-slate-200" : mode === 'dark' ? "bg-[#0a0a0a] border-white/5" : "bg-slate-200/50 border-white/10"
                    )}>
                        <div className={cn("h-2 w-full rounded-sm", mode === 'light' ? "bg-slate-100" : "bg-white/5")} />
                        <div className={cn("h-2 w-3/4 rounded-sm", mode === 'light' ? "bg-slate-100" : "bg-white/5")} />
                        <div className={cn("h-2 w-1/2 rounded-sm", mode === 'light' ? "bg-slate-100" : "bg-white/5")} />
                    </div>
                    {/* Mock Content */}
                    <div className="flex-1 p-3 space-y-2">
                        <div className={cn("h-3 w-full rounded-sm mb-1", mode === 'light' ? "bg-primary/20" : "bg-primary/30")} />
                        <div className={cn("grid grid-cols-2 gap-2")}>
                            <div className={cn("h-8 rounded-md", mode === 'light' ? "bg-white shadow-sm border border-slate-200" : "bg-white/5 border border-white/10")} />
                            <div className={cn("h-8 rounded-md", mode === 'light' ? "bg-white shadow-sm border border-slate-200" : "bg-white/5 border border-white/10")} />
                        </div>
                        <div className={cn("h-2 w-2/3 rounded-sm", mode === 'light' ? "bg-slate-200" : "bg-white/10")} />
                    </div>
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{label}</span>
                    {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
            </div>
        </div>
    );
}


