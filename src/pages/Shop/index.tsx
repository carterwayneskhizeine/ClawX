import { useState } from 'react';
import {
    Search,
    ShoppingCart,
    CheckCircle2,
    Zap,
    Star,
    LayoutGrid,
    Laptop,
    BarChart3,
    Video,
    ShieldCheck,
    Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const CATEGORIES = [
    { id: 'all', name: '全部', icon: LayoutGrid },
    { id: 'office', name: '办公提效', icon: Laptop },
    { id: 'marketing', name: '营销创意', icon: BarChart3 },
    { id: 'media', name: '多媒体处理', icon: Video },
    { id: 'security', name: '安全合规', icon: ShieldCheck },
];

const MOCK_SKILLS = [
    { id: 'S1', name: '数据清洗专家', desc: '自动识别并修复表格中的异常数据，支持多种导出格式。', category: 'office', author: 'ClawX Team', installed: true, rating: 4.8, users: '1.2k' },
    { id: 'S2', name: '文案创意大师', desc: '根据关键词生成高质量的公众号、小红书推广文案。', category: 'marketing', author: 'CreativeAI', installed: false, rating: 4.9, users: '800' },
    { id: 'S3', name: '法律合规顾问', desc: '深度查杀合同风险条款，提供合规性建议与修改方案。', category: 'security', author: 'LegalTech', installed: true, rating: 4.7, users: '2.5k' },
    { id: 'S4', name: '智能视频剪辑', desc: '一键生成视频字幕，自动剪切冗余片段，提取精彩瞬间。', category: 'media', author: 'Visionary', installed: false, rating: 4.6, users: '1.5k' },
    { id: 'S5', name: '邮件自动化助手', desc: '根据上下文自动拟写回复邮件，重要程度智能排序。', category: 'office', author: 'ClawX Team', installed: false, rating: 4.5, users: '3.2k' },
    { id: 'S6', name: '舆情监控分析', desc: '实时监控全网关于品牌的评价，生成情感倾向分析报告。', category: 'marketing', author: 'BrandWatcher', installed: true, rating: 4.8, users: '900' },
];

export function Shop() {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <div className="relative w-full min-h-[80vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Development Overlay */}
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-start pt-24 bg-background/40 backdrop-blur-md rounded-2xl">
                <div className="flex flex-col items-center gap-3 bg-background/95 px-12 py-8 rounded-3xl shadow-2xl border border-border/50 animate-in slide-in-from-top-8 duration-500">
                    <span className="text-5xl drop-shadow-sm mb-1">🚧</span>
                    <h2 className="text-2xl font-black tracking-tight text-foreground">功能正在开发中</h2>
                    <p className="text-muted-foreground text-center text-sm max-w-md">
                        工程师们正在加班加点为您构建插件技能商店，为您提供更丰富的能力扩展。敬请期待！
                    </p>
                </div>
            </div>

            {/* Blurred Content */}
            <div className="flex flex-col gap-8 pb-10 blur-[6px] pointer-events-none select-none opacity-50">
                {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">插件技能商店</h1>
                    <p className="text-muted-foreground">探索并安装上百种专业技能，扩展您的数字员工能力边界</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="搜索技能名称或功能..."
                            className="pl-10 h-11 rounded-xl border-muted/30 bg-background/50 focus-visible:ring-primary/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="h-11 rounded-xl gap-2 font-medium px-4">
                        我的插件
                    </Button>
                </div>
            </div>

            {/* Tabs & Content */}
            <Tabs defaultValue="all" className="w-full">
                <TabsList className="bg-muted/30 p-1 mb-8">
                    {CATEGORIES.map(cat => (
                        <TabsTrigger
                            key={cat.id}
                            value={cat.id}
                            className="px-6 py-2 rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary"
                        >
                            <cat.icon className="h-4 w-4 mr-2" />
                            {cat.name}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {CATEGORIES.map(cat => (
                    <TabsContent key={cat.id} value={cat.id} className="focus-visible:outline-none">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {MOCK_SKILLS
                                .filter(s => cat.id === 'all' || s.category === cat.id)
                                .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(skill => (
                                    <SkillCard key={skill.id} skill={skill} />
                                ))}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
            </div>
        </div>
    );
}

function SkillCard({ skill }: { skill: typeof MOCK_SKILLS[0] }) {
    return (
        <Card className="rounded-[2rem] border-muted/20 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 group cursor-pointer dark:bg-card">
            <CardContent className="p-8 flex flex-col h-full gap-6">
                <div className="flex items-start justify-between">
                    <div className="h-16 w-16 rounded-[1.25rem] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                        <Zap className="h-8 w-8 fill-current" />
                    </div>
                    {skill.installed ? (
                        <Badge variant="success" className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-none px-3 py-1 font-bold">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            已安装
                        </Badge>
                    ) : (
                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary">
                            <Plus className="h-5 w-5" />
                        </Button>
                    )}
                </div>

                <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{skill.name}</h3>
                        <div className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 dark:bg-amber-900/30 px-1.5 py-0.5 rounded font-black">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            {skill.rating}
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {skill.desc}
                    </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-muted/10">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">by {skill.author}</span>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                        <ShoppingCart className="h-3 w-3" />
                        {skill.users} 使用
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
