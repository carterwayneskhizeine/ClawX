# ui-react-prod UI 设计总览

## 概述

本文档集为 `ai-desktop-sandbox/ui-react-prod` 项目的 UI 设计深度分析参考，用于指导 ClawX 前端重构。

## 技术栈

| 层面 | 技术 |
|------|------|
| **UI 框架** | React 18 + TypeScript |
| **组件库** | Ant Design v5/v6 (`antd`) |
| **CSS 方案** | TailwindCSS v4 (`@import "tailwindcss"`) + 自定义 CSS |
| **路由** | react-router-dom v6 (`HashRouter`) |
| **图表库** | Recharts (`recharts`) |
| **图标** | `@ant-design/icons` + 自定义 SVG |
| **Markdown** | `marked` + `dompurify` |
| **状态管理** | React Context (`GatewayContext`) + `useState` |

## 整体设计风格

### 色彩体系

| 变量/用途 | 亮色模式 | 暗色模式 |
|-----------|----------|----------|
| **主色** | `#1677ff` (Ant Design Blue) | `#1677ff` |
| **背景 - Layout** | `#f5f5f5` | `#0d0d0d` |
| **背景 - Container** | `#ffffff` | `#141414` |
| **背景 - Card** | `#ffffff` | `#1c1c1c` |
| **文字 - 主要** | `#000000` | `#ffffff` |
| **文字 - 次要** | `#5F6368` | `rgba(255,255,255,0.45)` |
| **边框** | `#d9d9d9` | `#303030` |
| **边框 - 次要** | `#f0f0f0` | `#262626` |
| **状态 - 空闲** | `text-green-500` | `text-green-400` |
| **状态 - 忙碌** | `text-[#F4B400]` | `text-amber-400` |
| **状态 - 离线** | `text-red-500` | `text-red-400` |
| **阴影 - 按钮** | `shadow-blue-100` | `shadow-none` |

### 字体

```css
font-family: "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### 圆角体系

| 级别 | 圆角值 | 使用场景 |
|------|--------|----------|
| **小** | `rounded-xl` (12px) | 按钮、输入框、标签 |
| **中** | `rounded-2xl` (16px) | 头像、小卡片 |
| **大** | `rounded-[2rem]` (32px) | 页面卡片、模态框 |
| **超大** | `rounded-[2.5rem]` (40px) | 聊天容器、Profile 卡片 |
| **胶囊** | `rounded-full` | 标签按钮、状态指示器 |

### 全局动画

所有页面共用入场动画（TailwindCSS animate-in utilities）：
```
animate-in fade-in slide-in-from-bottom-4 duration-500
```
效果：淡入 + 从下方滑入 4 个单位，500ms 持续时间。

## 文件索引

| 文件 | 描述 |
|------|------|
| [01-layout-sidebar.md](./01-layout-sidebar.md) | 整体布局 + 侧边栏设计 |
| [02-home-dashboard.md](./02-home-dashboard.md) | 首页仪表盘详细分析 |
| [03-digital-employees-chat.md](./03-digital-employees-chat.md) | 数字员工聊天页面详细分析 |
| [04-shop.md](./04-shop.md) | 技能商店页面分析 |
| [05-classroom.md](./05-classroom.md) | 学习课堂页面分析 |
| [06-compute-points.md](./06-compute-points.md) | 算力积分页面分析 |
| [07-system-settings.md](./07-system-settings.md) | 系统设置页面分析 |
| [08-profile.md](./08-profile.md) | 个人资料页面分析 |
| [09-login-modal.md](./09-login-modal.md) | 登录弹窗分析 |
| [10-shared-patterns.md](./10-shared-patterns.md) | 共享设计模式及组件 |

## 主题切换机制

1. `SystemSettings.tsx` 中用户选择主题 → 调用 `saveSettings()` 存储到 `localStorage`
2. 触发 `window.dispatchEvent(new CustomEvent('themechange'))` 自定义事件
3. `App.tsx` 监听 `themechange` 事件 → 读取设置 → 更新 `isDarkMode` 状态
4. 添加/移除 `html.dark` 类 → 同时更新 Ant Design `ConfigProvider` 的 `algorithm`
5. 通知 Electron 更新标题栏颜色风格

## ConfigProvider 主题 Token

```typescript
{
  colorPrimary: '#1677ff',
  fontFamily: '"Noto Sans SC", ...',
  borderRadius: 8,
  colorBgContainer: isDarkMode ? '#141414' : '#ffffff',
  colorBgLayout: isDarkMode ? '#0d0d0d' : '#f5f5f5',
  colorTextSecondary: isDarkMode ? 'rgba(255,255,255,0.45)' : '#5F6368',
  colorText: isDarkMode ? '#ffffff' : '#000000',
  colorBorder: isDarkMode ? '#303030' : '#d9d9d9',
}
```

### 组件级 Token 覆盖

```typescript
Menu: {
  itemBorderRadius: 8,
  itemMarginInline: 12,
  darkItemSelectedBg: 'rgba(22,119,255,0.15)',
  darkItemSelectedColor: '#1677ff',
  darkItemBg: '#141414',
}
Card: { borderRadiusLG: 16, colorBgContainer: isDarkMode ? '#1c1c1c' : '#ffffff' }
Layout: { headerBg, siderBg, bodyBg }
Modal: { contentBg, headerBg }
Button: { defaultBg, defaultBorderColor, defaultColor }
Table: { colorBgContainer, headerBg }
```
