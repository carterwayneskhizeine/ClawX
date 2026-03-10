import { useState, useEffect } from 'react';
import {
    User,
    Camera,
    Edit3,
    ChevronRight,
    Building2,
    IdCard,
    Lock,
    MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/lib/auth-api';

export function Profile() {
    const [showResetPassword, setShowResetPassword] = useState(false);
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);

    useEffect(() => {
        if (!user) {
            authApi.getMe()
                .then((info) => setUser(info))
                .catch(console.error);
        }
    }, [user, setUser]);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">个人信息</h1>
                <p className="text-muted-foreground">管理您的账号与安全偏好</p>
            </div>

            {/* Main Card */}
            <Card className="rounded-[2.5rem] border-muted/20 dark:bg-card overflow-hidden shadow-sm">
                {/* Cover Area */}
                <div className="h-40 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 dark:from-blue-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 border-b border-white/10" />

                {/* Avatar & Action Button Row */}
                <div className="px-8 pb-10 relative -mt-16 flex items-end justify-between">
                    <div className="relative group">
                        <Avatar className="h-[140px] w-[140px] rounded-[2rem] border-4 border-background shadow-2xl overflow-hidden">
                            <AvatarImage src={`https://picsum.photos/seed/${user?.username ?? 'user'}/300`} alt={user?.username ?? 'User'} className="object-cover" />
                            <AvatarFallback className="text-4xl">
                                {user?.username?.charAt(0)?.toUpperCase() ?? 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <Button
                            size="icon"
                            className="absolute bottom-2 right-2 rounded-full h-10 w-10 bg-slate-900 hover:bg-slate-800 text-white border-none shadow-xl scale-110"
                        >
                            <Camera className="h-5 w-5" />
                        </Button>
                    </div>

                    <Button className="rounded-xl h-11 px-8 font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2 mb-2">
                        <Edit3 className="h-4 w-4" />
                        编辑资料
                    </Button>
                </div>

                {/* Content Area */}
                <div className="px-8 pb-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Left Column: Basic Info */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-4 bg-primary rounded-full" />
                                <h2 className="font-bold">基本信息</h2>
                            </div>

                            <div className="p-6 bg-muted/30 rounded-[2rem] border border-muted/20 space-y-6">
                                <InfoItem icon={User} label="用户名" value={user?.username ?? '-'} />
                                <div className="h-px bg-muted/20 mx-2" />
                                <InfoItem icon={IdCard} label="账号 ID" value={user?.user_id ?? '-'} />
                                <div className="h-px bg-muted/20 mx-2" />
                                <InfoItem icon={Building2} label="所属组织" value={user?.org_name ?? '个人用户'} />
                            </div>
                        </div>

                        {/* Right Column: Security */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                                <h2 className="font-bold">安全与绑定</h2>
                            </div>

                            <div className="space-y-4">
                                <SecurityCard
                                    icon={Lock}
                                    label="修改登录密码"
                                    description="定期更换密码以保障账号安全"
                                    onClick={() => setShowResetPassword(true)}
                                    color="blue"
                                />
                                <SecurityCard
                                    icon={MessageSquare}
                                    label="绑定微信账号"
                                    description="允许使用微信快速登录与接收通知"
                                    badge={<Badge variant="success" className="bg-green-100 text-green-700 border-none font-bold">已绑定</Badge>}
                                    color="green"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <ResetPasswordDialog open={showResetPassword} onOpenChange={setShowResetPassword} />
        </div>
    );
}

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="flex items-center gap-4 group">
            <div className="h-10 w-10 rounded-xl bg-background border shadow-sm flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                <Icon className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
                <span className="text-base font-bold">{value}</span>
            </div>
        </div>
    );
}

function SecurityCard({ icon: Icon, label, description, onClick, color, badge }: any) {
    return (
        <div
            onClick={onClick}
            className="w-full flex items-center justify-between p-5 rounded-[2rem] border border-muted/20 bg-background hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer group"
        >
            <div className="flex items-center gap-4">
                <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                    color === 'blue' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                )}>
                    <Icon className="h-6 w-6" />
                </div>
                <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2">
                        <span className="font-bold">{label}</span>
                        {badge}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
                </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
    );
}

function ResetPasswordDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[440px] p-8 rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-black">重置登录密码</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <PasswordField label="当前密码" placeholder="请输入当前密码" />
                    <PasswordField label="新设密码" placeholder="请输入新密码" />
                    <PasswordField label="确认新密码" placeholder="确认一次新密码" />
                </div>

                <DialogFooter className="mt-10 sm:justify-start gap-3">
                    <Button className="flex-1 h-12 rounded-xl font-black bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">立即保存</Button>
                    <Button variant="ghost" className="h-12 px-8 rounded-xl font-bold" onClick={() => onOpenChange(false)}>取消</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PasswordField({ label, placeholder }: { label: string, placeholder: string }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{label}</label>
            <Input
                type="password"
                placeholder={placeholder}
                className="rounded-xl h-12 bg-muted/30 border-muted/20 focus:ring-primary/20 px-4"
            />
        </div>
    );
}
