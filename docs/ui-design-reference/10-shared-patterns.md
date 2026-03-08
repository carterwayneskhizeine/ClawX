# 共享设计模式与组件

## 全局入场动画

所有页面共用相同的入场动画 class:
```
animate-in fade-in slide-in-from-bottom-4 duration-500
```
效果: 淡入 + 从下方滑入 16px (4 × 4px), 持续 500ms

## 页面 Header 模式

所有页面 Header 遵循统一模式:
```html
<header className="flex (flex-col md:flex-row md:items-center) justify-between (gap-4/6)">
  <div>
    <Title level={2} className="!mb-1">{页面标题}</Title>
    <Text type="secondary">{副标题描述}</Text>
  </div>
  <!-- 右侧操作按钮 -->
</header>
```

## 通用 Card 样式

```
Card
rounded-[2rem]
border-slate-100 dark:border-white/5
dark:bg-[#1c1c1c]
shadow-sm (可选)
overflow-hidden (可选)
```

带标题的 Card 使用 `title` prop + `<Space>` 包裹图标和文字:
```jsx
<Card title={<Space><IconOutlined /> 标题</Space>} />
```

## 通用按钮样式表

### Primary 按钮
```
type="primary"
rounded-xl font-bold
bg-blue-600 hover:bg-blue-500 border-none
shadow-lg shadow-blue-100 dark:shadow-none
```

变体:
- **小按钮**: `h-10 px-6`
- **大按钮**: `h-12 px-8`
- **超圆**: `rounded-full`
- **加粗阴影**: `shadow-xl shadow-blue-100`
- **绿色**: `bg-green-500 hover:bg-green-600`

### Default 按钮
```
rounded-xl
flex items-center justify-center
```

### Text 按钮
```
type="text"
hover:bg-slate-50 dark:hover:bg-white/5
rounded-xl
```

### Danger 按钮
```
danger type="text"
hover:bg-red-50 dark:hover:bg-red-900/10
rounded-xl
```

## Section 标题模式

### 带计数:
```jsx
<Title level={4} className="!mb-0">标题 ({count})</Title>
```

### 带色条指示器 (Profile):
```jsx
<Title level={5} className="flex items-center">
  <div className="w-1.5 h-4 bg-blue-600 rounded-full mr-3" />
  标题
</Title>
```

### 大写追踪标签:
```
text-xs font-bold text-slate-400 dark:text-slate-500
uppercase tracking-widest
```

## Label / 标签文字

```
text-[10px] font-bold text-slate-400 dark:text-slate-600
uppercase tracking-wider
```

或更大字号:
```
text-xs font-bold text-slate-400 uppercase tracking-widest mb-2
```

## 状态指示器

### 圆点指示器 (在线/离线)
```
w-2 h-2 rounded-full
connected: bg-green-500
disconnected: bg-red-500
```

### 大圆点指示器 (DigitalEmployees Header)
```
w-4 h-4 rounded-full
border-2 border-white dark:border-[#0d0d0d]
绝对定位: -bottom-1 -right-1
connected: bg-green-500
disconnected: bg-red-500
```

### 脉冲动画 (SystemSettings)
```
bg-green-500 animate-pulse
```

## 颜色状态映射

| 状态 | 亮色 | 暗色 |
|------|------|------|
| 空闲/在线 | `text-green-500` | `text-green-400` |
| 忙碌 | `text-[#F4B400]` | `text-amber-400` |
| 离线/错误 | `text-red-500` | `text-red-400` |
| 充值/增加 | `text-green-500` | `text-green-500` |
| 消耗/减少 | `text-blue-600` | `text-blue-600` |

## 暗色模式特殊颜色

| 元素 | 亮色 | 暗色 |
|------|------|------|
| 页面底色 | `#f5f5f5` | `#0d0d0d` |
| 容器底色 | `#ffffff` | `#141414` |
| 卡片底色 | `#ffffff` | `#1c1c1c` |
| 输入框底色 | `#ffffff` | `#1c1c1c` 或 `#0d0d0d` |
| 边框 | `border-slate-100` | `border-white/5` |
| 分割线 | `border-slate-50` | `border-white/5` |
| 悬浮底色 | `bg-slate-50` | `bg-white/5` |
| 次要文字 | `text-slate-400` | `text-slate-500` |

## 图表统一 Tooltip 样式

```typescript
{
  backgroundColor: isDark ? '#262626' : '#fff',
  borderRadius: '12px',
  border: 'none',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  color: isDark ? '#ffffff' : '#000'
}
```

## Scrollbar 自定义 (暗色模式)

```css
html.dark ::-webkit-scrollbar { width: 8px; height: 8px; }
html.dark ::-webkit-scrollbar-track { background: #1c1c1c; }
html.dark ::-webkit-scrollbar-thumb { background: #424242; border-radius: 4px; }
html.dark ::-webkit-scrollbar-thumb:hover { background: #525252; }
```

## Markdown 渲染样式

```css
.markdown-body {
  background-color: transparent !important;
  color: inherit !important;
  font-family: inherit !important;
}
.markdown-body p:last-child { margin-bottom: 0 !important; }
.markdown-body pre { bg: rgba(0,0,0,0.05); dark: rgba(255,255,255,0.05); }
```

## 常用 Hover 动效

1. **缩放**: `group-hover:scale-110 transition-transform duration-300`
2. **位移**: `hover:translate-y-[-2px] transition-all`
3. **透明度**: `opacity-0 group-hover:opacity-100 transition-opacity`
4. **颜色变化**: `group-hover:text-blue-600 transition-colors`
5. **边框高亮**: `hover:border-blue-300 dark:hover:border-blue-500 transition-all`
6. **箭头位移**: `group-hover:translate-x-1 transition-all`

## 空状态模式

### 基础:
```html
<div className="py-20 text-center">
  <Paragraph type="secondary" className="text-lg">提示文字</Paragraph>
</div>
```

### 带图标:
```html
<div className="py-20 text-center flex flex-col items-center justify-center">
  <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full 
                  flex items-center justify-center mb-4 text-slate-300">
    <SearchOutlined className="text-3xl" />
  </div>
  <Paragraph type="secondary" className="text-lg">提示文字</Paragraph>
</div>
```

## Popover 组件通用模式

```
Popover
  trigger="click"
  placement="bottomRight" / "topRight"
  overlayClassName="自定义类名"
  content={...}
  onOpenChange={handler}
```

内部列表标准模式:
```
标题行: text-xs font-black text-slate-400 uppercase tracking-widest
列表容器: max-h-[xxx] overflow-y-auto custom-scrollbar
每项: group px-4 py-3 flex items-center justify-between
      cursor-pointer transition-all border-l-2
选中: border-blue-500 bg-blue-50/50
悬浮: hover:bg-slate-50 dark:hover:bg-white/5
```
