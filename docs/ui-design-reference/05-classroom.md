# 学习课堂 (Classroom.tsx) UI 设计分析

## 页面结构

入场动画: `animate-in fade-in slide-in-from-bottom-4 duration-500`, space-y-8

### Header
- 主标题: `Title level={2} !mb-1` → "学习课堂"
- 副标题: "精品课程，助您快速掌握数字员工的部署与训练技巧"
- 搜索框: `Input prefix=SearchOutlined, rounded-xl w-64 h-11 border-slate-200`, placeholder="搜索教程内容..."
- "筛选" 按钮: `icon=FilterOutlined, rounded-xl h-11`

### 分类筛选标签
`flex flex-wrap gap-2 mb-2`

使用 `Tag.CheckableTag`, 分类: 全部 / 基础教程 / 核心架构 / 案例分析 / 开发者专题

每个标签样式:
```
px-6 py-1.5 rounded-full text-sm font-bold border
选中: bg-blue-600 !text-white border-blue-600
未选: bg-white dark:bg-[#1c1c1c] text-slate-500 dark:text-slate-400
      border-slate-200 dark:border-white/5
```

### 课程卡片 Grid
`Row gutter={[32, 32]}`, `Col xs=24 md=12 xl=8`

**卡片结构**:
```
Card hoverable overflow-hidden rounded-[2rem] group h-full
body padding: 0

┌──────────────────────────────────┐
│ 缩略图区 (aspect-video)           │
│ ┌──────────────────────────────┐ │
│ │ <img> object-cover            │ │
│ │ group-hover:scale-110 500ms  │ │
│ ├──────────────────────────────┤ │
│ │ 悬浮遮罩                      │ │
│ │ bg-black/20 → hover:black/40 │ │
│ │ ┌────────────────┐           │ │
│ │ │ ▶ 播放按钮       │           │ │  ← 16x16 圆, bg-white/20 backdrop-blur
│ │ │ opacity-0→1    │           │ │     scale-50→100 (hover transition)
│ │ │ scale-50→100   │           │ │     PlayCircleFilled text-4xl white
│ │ └────────────────┘           │ │
│ │ [入门] 左上角 Badge            │ │  ← 带 backdrop-blur, rounded-full
│ │ [⏱ 15分钟] 右下角             │ │  ← bg-black/50 backdrop-blur px-3
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ 内容区 p-6 space-y-3             │
│ 📖 类别名                        │  ← text-[10px] font-bold text-blue-600
│       uppercase tracking-widest  │
│ 课程标题                          │  ← Title level=4, line-clamp-1
│       hover:text-blue-600        │
│ 课程描述                          │  ← Paragraph text-sm line-clamp-2
│       min-h-[40px]               │
└──────────────────────────────────┘
```

### 难度级别 Badge 颜色
| 级别 | Badge color |
|------|-------------|
| 入门 | green |
| 进阶 | blue |
| 实战 | orange |
| 专家 | purple |

Badge 样式: `bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/20`
文字: `text-white font-bold text-xs drop-shadow-md`

### 时长标签 (右下角)
```
absolute bottom-4 right-4
bg-black/50 backdrop-blur-md
px-3 py-1 rounded-lg border border-white/10
text-white text-[10px] font-bold
ClockCircleOutlined mr-1
```

### 空状态
```
py-20 text-center flex flex-col items-center justify-center
圆形图标容器: w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full text-slate-300
SearchOutlined text-3xl
"未找到相关课程，换个关键词试试？"
```

### 关键动效
1. **图片悬浮缩放**: `transition-transform duration-500 group-hover:scale-110`
2. **播放按钮**: `opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-50 group-hover:scale-100`
3. **遮罩加深**: `bg-black/20 group-hover:bg-black/40 transition-colors`
4. **标题变色**: `group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors`
