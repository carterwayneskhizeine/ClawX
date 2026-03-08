# 数字员工聊天页面 (DigitalEmployees.tsx) UI 设计分析

## 页面结构

```
┌───────────────────────────────────────────────────────────────────┐
│ 主容器: flex h-full                                                │
│ bg-white dark:bg-[#0d0d0d]                                       │
│ rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5
│ overflow-hidden                                                   │
├───────────────────────────────────────┬──────────────────────────┤
│ 主聊天列 (flex flex-col flex-1 min-w-0) │ 侧边栏 (条件渲染, w-80) │
│ ┌─────────────────────────────────┐  │ 仅在点击 ToolCard 时显示  │
│ │ Header (sticky top-0 z-10)      │  │                          │
│ ├─────────────────────────────────┤  │                          │
│ │ Chat Area (flex-1 overflow-y)   │  │                          │
│ │ p-8 space-y-6                   │  │                          │
│ │ bg-white dark:bg-[#0d0d0d]     │  │                          │
│ ├─────────────────────────────────┤  │                          │
│ │ Input Area                      │  │                          │
│ │ px-8 py-3                       │  │                          │
│ │ bg-white dark:bg-[#141414]     │  │                          │
│ │ border-t                        │  │                          │
│ └─────────────────────────────────┘  │                          │
└───────────────────────────────────────┴──────────────────────────┘
```

## Header 区域
```
px-8 py-5 border-b border-slate-50 dark:border-white/5
bg-white dark:bg-[#141414] sticky top-0 z-10
flex items-center justify-between
```

### 左侧: 员工信息
```
┌──────────────────────────────────────┐
│ ┌────────┐  员工名称 (text-xl font-black) │
│ │ Avatar │  tracking-tight                │
│ │ 56x56  │  ⚡ 实时连接中 {agentId}       │
│ │ square │  text-[11px] font-bold         │
│ │rounded │  text-slate-300 uppercase       │
│ │ -2xl   │  tracking-widest               │
│ └────────┘                                │
│     🟢 状态指示器 (4x4 圆点, 绝对定位)      │
└──────────────────────────────────────┘
```

- **Avatar**: `size={56} shape="square"` + `rounded-2xl shadow-sm border`
- **在线指示器**: 绝对定位在 Avatar 右下角
  - `w-4 h-4 rounded-full border-2 border-white dark:border-[#0d0d0d]`
  - 在线: `bg-green-500`, 离线: `bg-red-500`
- **状态文字**: "实时连接中" / "离线" + agentId

### 右侧: 操作按钮组

| 按钮 | 图标 | 条件 | 样式 | 功能 |
|------|------|------|------|------|
| **中断** | `StopOutlined` | `sending` 时显示 | `danger type="text" hover:bg-red-50 rounded-xl` | 中断当前请求 |
| **思考模式** | `BrainIcon` (自定义SVG) | 始终显示 | `type="text" rounded-xl` + 激活时 `text-slate-900` / 未激活 `text-slate-400` | 切换详细/精简模式 |
| **搜索** | `SearchOutlined` | 始终显示 | `type="text" text-xl text-slate-400 hover:bg-slate-50 rounded-xl` | 打开搜索会话 Modal |
| **更多** | `EllipsisOutlined` | 始终显示 | `type="text" text-2xl text-slate-400 hover:bg-slate-50 rounded-xl` | 弹出会话选择器 Popover |

### BrainIcon 自定义 SVG
```html
<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
     stroke="currentColor" strokeWidth="2"
     strokeLinecap="round" strokeLinejoin="round">
  <!-- 左脑路径 -->
  <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 ..." />
  <!-- 右脑路径 -->
  <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 ..." />
  <!-- 连接弧线 -->
  <path d="M9 13a4.5 4.5 0 0 0 3 0" />
  <path d="M15 13a4.5 4.5 0 0 1-3 0" />
</svg>
```

## 聊天区域

### 空状态
```
flex flex-col items-center justify-center h-full opacity-20
<RobotOutlined fontSize=48 />
<p>开始与 {name} 的第一次对话吧</p>  (font-bold tracking-widest uppercase)
```

### 消息列表
每条消息布局:
```
┌──────────────────────────────────────────────────┐
│ 用户消息:                                         │
│                               ┌──────────────┐   │
│                               │ 蓝色气泡       │   │
│                               │ (右对齐)       │   │
│                               └──────────────┘   │
│                                    14:30         │
│──────────────────────────────────────────────────│
│ AI 消息:                                          │
│ ┌────────┐ ┌──────────────────────────────────┐  │
│ │ Avatar │ │ 灰色气泡                           │  │
│ │ 40x40  │ │ + Thinking 区域 (条件)             │  │
│ │ square │ │ + Markdown 内容                   │  │
│ │rounded │ │ + Tool Cards (条件)               │  │
│ └────────┘ └──────────────────────────────────┘  │
│              14:31                                │
└──────────────────────────────────────────────────┘
```

### ChatBubble 组件

#### 用户消息气泡
```
px-6 py-4 rounded-3xl rounded-tr-none (右上角不圆)
bg-blue-600 dark:bg-blue-700 text-white
shadow-sm
whiteSpace: pre-wrap (保留换行)
```

#### AI 消息气泡
```
px-6 py-4 rounded-3xl rounded-tl-none (左上角不圆)
bg-slate-50 dark:bg-[#1c1c1c]
text-slate-700 dark:text-slate-200
border border-slate-100/50 dark:border-white/5
shadow-sm
```

#### 图片显示
```
max-w-60 max-h-60 rounded-2xl 
border border-slate-100 dark:border-white/10
shadow-sm
```

#### 图片省略占位符
```
w-60 h-60 flex-col items-center justify-center
rounded-2xl border-2 border-dashed
border-slate-300 dark:border-white/20
bg-slate-50 dark:bg-white/5
```

#### 文件附件卡片
```
flex items-center space-x-3 p-3
bg-white dark:bg-white/5
border border-slate-100 dark:border-white/10
rounded-2xl shadow-sm
hover:border-blue-300 dark:hover:border-blue-500
transition-all cursor-pointer group
```

#### Thinking 区块 (showVerbose 时)
```
mb-2 px-4 py-2
bg-slate-50 dark:bg-white/5
border-l-2 border-blue-400
rounded-r-xl
text-[13px] text-slate-500 italic font-medium
```
标题行: `text-[11px] uppercase tracking-widest font-bold opacity-60` + InfoCircleOutlined (blue)

#### 流式加载动画 (三点弹跳)
```
<div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" delay="0ms" />
<div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" delay="150ms" />
<div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" delay="300ms" />
```

#### "Thinking & Working" 等待状态
```
rounded-3xl rounded-tl-none bg-slate-50 dark:bg-[#1c1c1c]
border border-slate-100/50 dark:border-white/5 shadow-sm
"Thinking & Working" text (italic, text-slate-400)
+ 三点弹跳动画 (bg-slate-400 dark:bg-slate-500, delays: 0/200/400ms)
```

#### 时间戳
```
text-[10px] font-bold text-slate-300 dark:text-slate-600
mt-2 uppercase tracking-widest
用户消息: text-right mr-1
AI消息: ml-1
格式: HH:MM
```

### ToolCard 组件

```
┌─────────────────────────────────────────────┐
│ Header: bg-slate-50 dark:bg-white/5          │
│ border-b                                     │
│ ⚡ TOOL_NAME           Result ✅              │
│ (text-xs font-bold uppercase tracking-tight) │
├─────────────────────────────────────────────┤
│ Body: p-3 text-[13px] font-mono              │
│ text-slate-500 dark:text-slate-400           │
│ 截取前 100 字符 + "..."                       │
└─────────────────────────────────────────────┘

外框: mt-2 border border-slate-200 dark:border-white/10
      rounded-xl overflow-hidden
      bg-white dark:bg-white/5
      cursor-pointer
      hover:border-blue-300 dark:hover:border-blue-500
      transition-all
```

点击 → 打开右侧 Sidebar 显示完整内容

## 输入区域

```
px-8 py-3
bg-white dark:bg-[#141414]
border-t border-slate-50 dark:border-white/5
max-w-5xl mx-auto
```

### 已选文件列表 (条件渲染)
```
mb-3 flex flex-wrap gap-3 p-3
bg-slate-100 dark:bg-[#1c1c1c]
rounded-xl border border-slate-200 dark:border-white/10
```

每个文件预览卡:
```
relative group
bg-white dark:bg-[#252525]
rounded-lg border border-slate-200 dark:border-white/10
p-2 hover:shadow-md transition-all
```

关闭按钮: 绝对定位右上角, `opacity-0 group-hover:opacity-100`

### 输入框容器

```
flex items-center space-x-3
bg-slate-50/50 dark:bg-white/5
rounded-4xl p-2.5
border border-slate-100 dark:border-white/10

/* 聚焦效果 */
focus-within:border-blue-200 dark:focus-within:border-blue-800
focus-within:bg-white dark:focus-within:bg-[#1c1c1c]
focus-within:shadow-lg focus-within:shadow-blue-50
dark:focus-within:shadow-none
```

#### 按钮/元素 (从左到右)

| 元素 | 图标 | 样式 | 功能 |
|------|------|------|------|
| **附件** | `PaperClipOutlined` text-xl | `type="text" rounded-full w-10 h-10 hover:bg-white` | 触发隐藏 file input |
| **输入框** | - | `TextArea autoSize minRows=1 maxRows=4, border-none shadow-none bg-transparent font-medium` | 输入消息 |
| **表情** | `SmileOutlined` text-xl | `type="text" rounded-full w-10 h-10` | 弹出 Emoji Popover |
| **发送** | `SendOutlined` text-lg | `type="primary" w-12 h-12 rounded-2xl` - 有内容: `bg-blue-600 shadow-xl shadow-blue-200 scale-100` / 无内容: `bg-slate-200 text-slate-400 scale-95` | 发送消息 |

#### Emoji 选择器 Popover
```
title: "选择表情" (text-xs font-bold text-slate-400 uppercase tracking-widest)
placement: topRight
内容: grid grid-cols-8 gap-1 p-2 max-h-60 overflow-y-auto overflow-x-hidden w-[280px]
每个 emoji: text-2xl aspect-square hover:bg-slate-100 dark:hover:bg-white/10 rounded
```

#### 发送提示
```
mt-2 text-center
text-[10px] font-bold text-slate-300 dark:text-slate-600
uppercase tracking-[0.15em]
"Enter 发送, Shift+Enter 换行"
```

### 隐藏 File Input
```html
<input type="file" multiple
  accept="image/*,.pdf,.doc,.docx,.txt,.json,.md,.csv"
  style="display:none" />
```
**文件验证**: 最大 5MB

## 右侧 Tool Details Sidebar

```
w-80 flex flex-col
border-l border-slate-100 dark:border-white/5
bg-white dark:bg-[#1c1c1c]
```

**Header**:
```
px-5 py-4 border-b bg-slate-50/50 dark:bg-white/5
"详情" (text-xs font-black uppercase tracking-widest)
InfoCircleOutlined (blue) + 关闭按钮 (CloseOutlined)
```

**Body**: `flex-1 overflow-y-auto p-5` + MarkdownView 渲染

## 会话选择器 Popover

```
w-80 flex flex-col
bg-white dark:bg-[#1c1c1c]
```

**Header**: "会话历史" (text-xs font-black uppercase tracking-widest)
+ 刷新按钮 (`ReloadOutlined`) + "新对话" 按钮 (`PlusOutlined, bg-blue-600 rounded-lg`)

**列表**: `max-h-[360px] overflow-y-auto custom-scrollbar`

每个会话项:
```
group px-4 py-3 flex items-center justify-between
cursor-pointer transition-all border-l-2

当前: bg-blue-50/50 dark:bg-blue-900/10 border-blue-500
其他: border-transparent hover:bg-slate-50 dark:hover:bg-white/5

标题: text-[13px]
  当前: text-blue-600 dark:text-blue-400 font-bold
  其他: text-slate-700 dark:text-slate-300 font-medium

预览: text-[11px] text-slate-400 truncate opacity-60

删除按钮: opacity-0 group-hover:opacity-100 (非默认会话)
         DeleteOutlined, text-slate-300 group-hover:text-red-400
```

## 搜索会话 Modal (SearchSessionsModal)

- **title**: 🔍 "搜索历史会话"
- **width**: 600px
- **centered**: true
- **搜索框**: `h-10`, 前缀 SearchOutlined, 后缀清除按钮 (条件)
- **结果列表**: `max-h-[400px] overflow-y-auto`
  - 每项: `border-l-2 border-transparent hover:border-blue-500 hover:bg-slate-50 rounded-r-lg`
  - 标题 + 时间 + 匹配内容预览 + 匹配数量
- **空状态**: SearchOutlined 大图标 + "输入关键词开始搜索"
- **防抖**: 500ms 延迟搜索
