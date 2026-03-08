import { useState } from 'react';
import {
    Palette,
    Bell,
    Server,
    ShieldCheck,
    Save,
    RotateCcw,
    RefreshCw,
    Globe,
    Settings,
    ChevronRight,
    LogOut,
    Terminal,
    CheckCircle2
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settings';
import { useGatewayStore } from '@/stores/gateway';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function SysSettings() {
    const {
        theme,
        setTheme,
        language,
        setLanguage,
        setUiMode,
        gatewayPort,
        setGatewayPort
    } = useSettingsStore();

    const gatewayStatus = useGatewayStore((s) => s.status);
    const restartGateway = useGatewayStore((s) => s.restart);

    const [localPort, setLocalPort] = useState(gatewayPort);

    const handleSave = () => {
        setGatewayPort(localPort);
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
                    <Card className="rounded-[2rem] border-muted/20 dark:bg-[#1c1c1c] overflow-hidden">
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

                            <div className="h-px bg-muted/20" />

                            {/* Language Settings */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-bold">全局语言</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">系统界面显示的语言</p>
                                </div>
                                <Select
                                    value={language}
                                    onChange={(e: any) => setLanguage(e.target.value)}
                                    className="w-40 rounded-xl h-10 border-muted/30"
                                >
                                    <option value="zh">简体中文 (Chinese)</option>
                                    <option value="en">English (US)</option>
                                    <option value="ja">日本語 (Japanese)</option>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notifications Card */}
                    <Card className="rounded-[2rem] border-muted/20 dark:bg-[#1c1c1c] overflow-hidden">
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
                    <Card className="rounded-[2rem] border-muted/20 dark:bg-[#1c1c1c] overflow-hidden">
                        <CardHeader className="border-b border-muted/10 bg-muted/5 p-6">
                            <div className="flex items-center gap-2">
                                <Server className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">网关连接</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Connection Status */}
                            <div className="p-4 bg-muted/30 rounded-2xl border border-muted/20 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <div className={cn(
                                        "h-2 w-2 rounded-full",
                                        gatewayStatus.state === 'running' ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-red-500"
                                    )} />
                                    {gatewayStatus.state === 'running' ? '已连接到网关' : '网关未连接'}
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:rotate-180 transition-transform duration-500" onClick={() => restartGateway()}>
                                    <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                            </div>

                            {/* Config Fields */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Gateway Port</label>
                                    <Input
                                        type="number"
                                        value={localPort}
                                        onChange={(e) => setLocalPort(Number(e.target.value))}
                                        className="rounded-xl h-11 border-muted/30 focus:ring-primary/20 bg-background/50"
                                        placeholder="18766"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-1">
                                <span className="text-sm font-medium text-[12px]">启动时自动连接</span>
                                <Switch defaultChecked />
                            </div>

                            <Button className="w-full h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/10" onClick={() => restartGateway()}>
                                重新连接网关
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Security Card */}
                    <Card className="rounded-[2rem] border-muted/20 dark:bg-[#1c1c1c] overflow-hidden">
                        <CardHeader className="border-b border-muted/10 bg-muted/5 p-6">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">安全与账户</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2">
                            <SecurityButton icon={Settings} label="修改管理密码" />
                            <SecurityButton icon={ShieldCheck} label="API 私钥管理" />
                            <SecurityButton icon={LogOut} label="退出并清除缓存" variant="destructive" />
                        </CardContent>
                    </Card>

                    {/* Hidden UI Toggle */}
                    <div className="p-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 dark:bg-orange-950/10 border-dashed flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">试验性功能</span>
                            <p className="text-[10px] text-muted-foreground">切换回经典 UI 模式（后台控制台），或按 <kbd className="font-mono bg-muted px-1 rounded">Ctrl+P</kbd></p>
                        </div>
                        <Button
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg h-9 gap-2"
                            onClick={() => setUiMode('classic')}
                        >
                            <Terminal className="h-4 w-4" />
                            切换到经典 UI
                        </Button>
                    </div>

                    {/* Global Actions */}
                    <div className="flex items-center justify-end gap-3 mt-auto">
                        <Button variant="ghost" className="h-12 px-6 rounded-2xl font-bold gap-2" onClick={() => setLocalPort(gatewayPort)}>
                            <RotateCcw className="h-4 w-4" />
                            撤销修改
                        </Button>
                        <Button className="h-12 px-8 rounded-2xl font-black bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 gap-2" onClick={handleSave}>
                            <Save className="h-4 w-4" />
                            保存全局设置
                        </Button>
                    </div>
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
                "p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col gap-3",
                active
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-muted/30 hover:border-muted-foreground/30 bg-background/50"
            )}
            onClick={onClick}
        >
            <div className={cn(
                "h-24 w-full rounded-xl overflow-hidden border border-muted/20 relative",
                mode === 'light' ? "bg-white" : mode === 'dark' ? "bg-slate-950" : "bg-gradient-to-br from-white via-slate-500 to-slate-950"
            )}>
                {/* Mock UI stripes */}
                <div className="absolute inset-0 p-3 flex gap-2">
                    <div className="w-1/3 border-r border-muted/20 space-y-2 pr-2">
                        <div className="h-1.5 w-full bg-muted/40 rounded-full" />
                        <div className="h-1.5 w-2/3 bg-muted/40 rounded-full" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="h-1.5 w-full bg-muted/20 rounded-full" />
                        <div className="h-1.5 w-full bg-muted/20 rounded-full" />
                        <div className="h-1.5 w-3/4 bg-muted/20 rounded-full" />
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

function SecurityButton({
    icon: Icon,
    label,
    variant = 'ghost'
}: {
    icon: any;
    label: string;
    variant?: 'ghost' | 'destructive'
}) {
    return (
        <Button
            variant={variant === 'destructive' ? 'ghost' : 'outline'}
            className={cn(
                "w-full justify-between h-12 rounded-xl text-left font-medium px-4",
                variant === 'destructive' && "text-destructive hover:bg-destructive/5 border-destructive/10"
            )}
        >
            <div className="flex items-center gap-3">
                <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center bg-muted/50",
                    variant === 'destructive' && "bg-destructive/10"
                )}>
                    <Icon className="h-4 w-4" />
                </div>
                <span>{label}</span>
            </div>
            <ChevronRight className="h-4 w-4 opacity-30" />
        </Button>
    );
}
