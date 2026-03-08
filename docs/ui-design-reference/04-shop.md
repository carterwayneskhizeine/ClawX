# 技能商店 (Shop.tsx) UI 设计分析

## 页面结构

入场动画: `animate-in fade-in slide-in-from-bottom-4 duration-500`, space-y-8

```
┌────────────────────────────────────────────────────────┐
│ Header (flex, 响应式)                                    │
│ ┌───────────────────┐  ┌──────────┐┌──────────────┐   │
│ │ 技能商店            │  │ 搜索技能  ││ 🛒 我的订单    │   │
│ │ 副标题说明          │  │ w-64 h-11 ││   h-11       │   │
│ └───────────────────┘  └──────────┘└──────────────┘   │
├────────────────────────────────────────────────────────┤
│ 分类 Tabs                                               │
│ bg-white dark:bg-[#1c1c1c] rounded-[2rem] p-4 shadow-sm│
│ [全部] [办公生产力] [数据分析] [多媒体创作] [专业辅助]       │
├────────────────────────────────────────────────────────┤
│ 卡片 Grid (Row gutter={[24,24]})                        │
│ Col xs=24 sm=12 lg=8 xl=6                              │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                  │
│ │ Card │ │ Card │ │ Card │ │ Card │                  │
│ └──────┘ └──────┘ └──────┘ └──────┘                  │
└────────────────────────────────────────────────────────┘
```

## Header

- **主标题**: `Title level={2} !mb-1` → "技能商店"
- **副标题**: `Text type="secondary"` → "赋能您的数字员工，解锁更强大的专业能力"
- **搜索框**: `Input prefix=SearchOutlined, className="rounded-xl w-64 h-11 border-slate-200"`, placeholder="搜索技能..."
- **"我的订单"**: `Button icon=ShoppingCartOutlined, className="rounded-xl h-11 flex items-center justify-center font-medium"`

## 分类 Tabs

外层容器:
```
bg-white dark:bg-[#1c1c1c]
rounded-[2rem] p-4 shadow-sm
border border-slate-100 dark:border-white/5
```

Tabs: `activeKey={activeTab} onChange={setActiveTab}`
分类列表: `["全部", "办公生产力", "数据分析", "多媒体创作", "专业辅助"]`
每个 label: `<span className="px-4 py-1 font-bold">{category}</span>`

## 技能卡片详细结构

### 卡片容器
```
Card hoverable h-full
className="rounded-[2rem] border-slate-100 dark:border-white/5
           dark:bg-[#1c1c1c] overflow-hidden group"
body: { padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }
```

### 卡片内部布局

```
┌───────────────────────────────────────┐
│ 顶部 (flex justify-between mb-6)       │
│ ┌────────┐                ┌────────┐ │
│ │ Emoji  │                │ Tag    │ │
│ │ Icon   │                │ 类别标签│ │
│ │ 56x56  │                └────────┘ │
│ └────────┘                           │
├───────────────────────────────────────┤
│ 技能名称                               │
│ Title level=4 !mb-2                   │
│ group-hover:text-blue-600             │
│                                       │
│ 技能描述                               │
│ Paragraph type="secondary" text-sm    │
│ leading-relaxed line-clamp-2          │
│ min-h-[40px]                          │
├───────────────────────────────────────┤
│ 底部 (mt-6 pt-6 border-t)             │
│ flex items-end justify-between        │
│                                       │
│ 价格区域           安装按钮              │
│ ┌──────────┐      ┌──────────────┐   │
│ │获取价格   │      │ ⚡ 立即安装    │   │
│ │ 积分 199  │      │ rounded-xl   │   │
│ │ 或 "免费" │      │ h-10 px-6    │   │
│ └──────────┘      └──────────────┘   │
└───────────────────────────────────────┘
```

### Emoji Icon 容器
```
w-14 h-14
bg-slate-50 dark:bg-white/5
rounded-2xl
flex items-center justify-center
text-3xl
shadow-sm
group-hover:scale-110 transition-transform duration-300
```

### Tag 标签
- **未安装**: `Tag color="blue" className="rounded-full px-3 m-0 border-none font-bold"` → 显示类别名
- **已安装**: `Tag color="success" icon={<CheckCircleOutlined />} className="rounded-full px-3 m-0 border-none font-bold"` → "已安装"

### 价格显示
- **区域标签**: `text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-wider` → "获取价格"
- **"积分"前缀**: `text-xs font-bold text-slate-400` (仅付费技能显示)
- **价格数值**: `text-xl font-black`
  - 免费: `text-green-500` → "免费"
  - 付费: `text-slate-900 dark:text-white` → 数字

### 安装按钮

**未安装**:
```
type="primary" icon={<ThunderboltOutlined />}
className="rounded-xl font-bold h-10 px-6 flex items-center
           shadow-lg shadow-blue-100 dark:shadow-none
           hover:translate-y-[-2px]"
文字: "立即安装"
```

**已安装**:
```
type="default" disabled
icon={<CheckCircleOutlined />}
className="cursor-default"
文字: "已拥有"
```

### Hover 动效

1. **Emoji 放大**: `group-hover:scale-110 transition-transform duration-300`
2. **标题变色**: `group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors`
3. **按钮上浮**: `hover:translate-y-[-2px]`
4. **整卡 hoverable**: Ant Design 内置悬浮阴影

## Mock 数据

| ID | 名称 | Emoji | 类别 | 价格 | 状态 |
|----|------|-------|------|------|------|
| S1 | 数据清洗专家 | 📊 | 数据分析 | 199 积分 | 未安装 |
| S2 | 文案创意大师 | ✍️ | 办公生产力 | 免费 | 已安装 |
| S3 | 代码审计专家 | 🛡️ | 专业辅助 | 299 积分 | 未安装 |
| S4 | 法律合规顾问 | ⚖️ | 专业辅助 | 499 积分 | 未安装 |
| S5 | 视频素材剪辑 | 🎬 | 多媒体创作 | 150 积分 | 未安装 |
| S6 | 市场行情调研 | 🔍 | 数据分析 | 免费 | 未安装 |

## 空搜索状态

```
py-20 text-center
Paragraph type="secondary" className="text-lg"
"没有找到匹配的技能，请尝试其他关键词"
```
