import { useState } from 'react';
import {
    Search,
    Filter,
    ChevronRight,
    Play,
    Clock,
    BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const CATEGORIES = ["全部", "基础教程", "核心架构", "案例分析", "开发者专题"];

const MOCK_COURSES = [
    { id: 'C1', title: '数字员工快速上手指南', desc: '从零开始部署您的第一个 AI 助手，掌握基础交互与配置。', category: '基础教程', duration: '15分钟', level: '入门', thumbnail: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=800&auto=format&fit=crop' },
    { id: 'C2', title: '深度解析 OpenClaw 插件系统', desc: '了解如何开发自己的插件，扩展数字员工的专业能力。', category: '核心架构', duration: '45分钟', level: '进阶', thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop' },
    { id: 'C3', title: '企业级自动化流程实战', desc: '使用 AI 自动处理日常发票报销、邮件回复与日程管理。', category: '案例分析', duration: '30分钟', level: '实战', thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop' },
    { id: 'C4', title: '高可用网关集群搭建', desc: '针对大规模并发场景，配置稳定的分布式网关与负载均衡。', category: '核心架构', duration: '60分钟', level: '专家', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop' },
    { id: 'C5', title: '提示词工程进阶技巧', desc: '学会编写更精准、更高效的 Prompt，让 AI 输出更符合预期。', category: '基础教程', duration: '20分钟', level: '进阶', thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop' },
    { id: 'C6', title: '智能对话系统接入实战', desc: '将您的数字员工接入飞书、企业微信等多端协作平台。', category: '案例分析', duration: '25分钟', level: '实战', thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop' },
];

export function Classroom() {
    const [activeTab, setActiveTab] = useState("全部");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredCourses = MOCK_COURSES.filter(course => {
        const matchesTab = activeTab === "全部" || course.category === activeTab;
        const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.desc.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="relative w-full min-h-[80vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Development Overlay */}
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-start pt-24 bg-background/40 backdrop-blur-md rounded-2xl">
                <div className="flex flex-col items-center gap-3 bg-background/95 px-12 py-8 rounded-3xl shadow-2xl border border-border/50 animate-in slide-in-from-top-8 duration-500">
                    <span className="text-5xl drop-shadow-sm mb-1">🚧</span>
                    <h2 className="text-2xl font-black tracking-tight text-foreground">功能正在开发中</h2>
                    <p className="text-muted-foreground text-center text-sm max-w-md">
                        工程师们正在加班加点为您构建学习课堂，带来海量优质课程。敬请期待！
                    </p>
                </div>
            </div>

            {/* Blurred Content */}
            <div className="flex flex-col gap-8 pb-10 blur-[6px] pointer-events-none select-none opacity-50">
                {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">学习课堂</h1>
                    <p className="text-muted-foreground">精品课程，助您快速掌握数字员工的部署与训练技巧</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="搜索教程内容..."
                            className="pl-10 h-11 rounded-xl border-muted/30 bg-background/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="h-11 rounded-xl gap-2 font-medium px-4">
                        <Filter className="h-4 w-4" />
                        <span>筛选</span>
                    </Button>
                </div>
            </div>

            {/* Categories Filter */}
            <div className="flex flex-wrap gap-3 mb-2">
                {CATEGORIES.map(category => (
                    <button
                        key={category}
                        onClick={() => setActiveTab(category)}
                        className={cn(
                            "px-6 py-2 rounded-full text-sm font-bold border transition-all",
                            activeTab === category
                                ? "bg-primary text-primary-foreground border-primary shadow-md"
                                : "bg-background/50 text-muted-foreground border-muted/30 hover:border-primary/50"
                        )}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Courses Grid */}
            {filteredCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {filteredCourses.map(course => (
                        <CourseCard key={course.id} course={course} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center">
                        <Search className="h-10 w-10 text-muted-foreground opacity-20" />
                    </div>
                    <p className="text-lg text-muted-foreground">未找到相关课程，换个关键词试试？</p>
                </div>
            )}
            </div>
        </div>
    );
}

function CourseCard({ course }: { course: typeof MOCK_COURSES[0] }) {
    const levelColors: Record<string, string> = {
        '入门': 'bg-green-500/80',
        '进阶': 'bg-blue-500/80',
        '实战': 'bg-orange-500/80',
        '专家': 'bg-purple-500/80'
    };

    return (
        <Card className="h-full rounded-[2rem] border-muted/20 dark:bg-card overflow-hidden group transition-all duration-300 hover:shadow-xl cursor-pointer">
            <CardContent className="p-0 flex flex-col h-full">
                {/* Thumbnail Area */}
                <div className="relative aspect-video overflow-hidden">
                    <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {/* Overlay Mask */}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300 border border-white/30">
                            <Play className="h-8 w-8 text-white fill-current ml-1" />
                        </div>
                    </div>
                    {/* Level Badge */}
                    <div className={cn(
                        "absolute top-4 left-4 px-3 py-1 rounded-full text-white text-[10px] font-bold backdrop-blur-md border border-white/20 shadow-lg",
                        levelColors[course.level]
                    )}>
                        {course.level}
                    </div>
                    {/* Duration Badge */}
                    <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-white text-[10px] font-bold flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {course.duration}
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-6 space-y-3">
                    <div className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{course.category}</span>
                    </div>
                    <h3 className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">{course.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 min-h-[40px]">
                        {course.desc}
                    </p>
                    <div className="pt-2 flex items-center gap-1 text-primary text-xs font-bold group-hover:gap-2 transition-all">
                        <span>立即学习</span>
                        <ChevronRight className="h-4 w-4" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
