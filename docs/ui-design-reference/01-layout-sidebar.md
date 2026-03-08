# 整体布局与侧边栏设计

## 整体架构

```
┌──────────────────────────────────────────────────────────┐
│ 整个窗口 (100vh, flex column, overflow hidden)            │
│ background: isDarkMode ? '#0d0d0d' : '#f5f5f5'          │
├─────────────┬────────────────────────────────────────────┤
│ Sider       │ Layout (flex column, overflow hidden)      │
│ width=260   │ ┌──────────────────────────────────────┐   │
│             │ │ Header (32px) - 可拖拽区域 (app-region) │
│             │ │ 右侧: 连接状态 Alert                   │
│             │ │ paddingRight: 140px (留给窗口控制按钮)   │
│             │ ├──────────────────────────────────────┤   │
│             │ │ Content (flex:1, margin: 0 16px)      │   │
│             │ │ ┌──────────────────────────────────┐ │   │
│             │ │ │ 内容区                             │ │   │
│             │ │ │ padding: 24px                    │ │   │
│             │ │ │ bg: #141414/#ffffff              │ │   │
│             │ │ │ borderRadiusLG                   │ │   │
│             │ │ │ overflow: auto                   │ │   │
│             │ │ │ marginBottom: 16px               │ │   │
│             │ │ └──────────────────────────────────┘ │   │
│             │ └──────────────────────────────────────┘   │
└─────────────┴────────────────────────────────────────────┘
```

## 侧边栏结构 (`Sider`)

### 布局

```
┌──────────────────────────┐
│ sider-container           │  ← flex column, height: 100vh
│ bg: #141414 / #ffffff     │
├──────────────────────────┤
│ sider-header              │  ← padding: 40px 16px 20px
│ -webkit-app-region: drag  │     (可拖拽移动窗口)
│ ┌────┐                    │
│ │Logo│ OPC数字员工智能助手   │  ← LogoIcon + text
│ └────┘                    │
│ center aligned, gap: 10px │
├──────────────────────────┤
│ sider-menu-wrapper        │  ← flex: 1, overflow-y: auto
│                           │
│ Menu (inline mode)        │
│   🏠 首页                  │  key: 'home'
│   ────────────────────    │
│   👥 数字员工 (SubMenu)    │  key: 'group-employees'
│     ├─ 🟢 通用助手         │  key: 'employees/main'
│     ├─ 🟢 数据清洗官       │  key: 'employees/xxx'
│     └─ ...               │
│   🛒 技能商店              │  key: 'shop'
│   📖 学习课堂              │  key: 'classroom'
│   ⚡ 算力积分              │  key: 'points'
│   ⚙️ 系统设置              │  key: 'settings'
│   ────────────────────    │
│   📦 更多功能 (Ctrl+L)     │  key: 'group-more'
│     (隐藏的开发者菜单)       │  ← showMoreFeatures 控制
│     Chat / Instances /    │
│     Sessions / Cron / ... │
├──────────────────────────┤
│ sider-footer              │  ← margin-top: auto
│ border-top: 1px solid     │
│ ┌───────────────────────┐│
│ │ 👤 Avatar  用户名       ││  ← Dropdown 触发
│ │           组织名        ││     trigger: click
│ └───────────────────────┘│
└──────────────────────────┘
```

### Logo 区域

- **图标**: `LogoIcon` 组件（自定义 SVG），颜色 `#1677ff`，尺寸 24px
- **文字**: `OPC数字员工智能助手`
  - font-size: 18px, font-weight: 700
  - letter-spacing: -0.025em
  - white-space: nowrap, overflow: hidden, text-overflow: ellipsis
- **可拖拽**: 整个 header 区域设置 `WebkitAppRegion: 'drag'`

### 菜单项样式

```
itemBorderRadius: 8
itemMarginInline: 12
darkItemSelectedBg: 'rgba(22, 119, 255, 0.15)'
darkItemSelectedColor: '#1677ff'
```

### 数字员工子菜单项格式

每个 Agent 子项包含:
```html
<div class="flex items-center">
  <div class="w-2 h-2 rounded-full mr-2 bg-green-500" />  <!-- 状态点 -->
  <span class="truncate">{agentName}</span>
</div>
```

状态点颜色:
- 在线/空闲: `bg-green-500`
- 忙碌: `bg-[#F4B400]`

### 用户信息区 (Footer)

```css
.user-profile {
  display: flex;
  align-items: center;
  padding: 8px;
  gap: 12px;
  border-radius: 8px;
  cursor: pointer;
}
.user-profile:hover { background-color: rgba(0, 0, 0, 0.02); }
.dark .user-profile:hover { background-color: rgba(255, 255, 255, 0.05); }

.user-profile-name {
  font-size: 14px; font-weight: 600; color: #000000;
}
.user-profile-account {
  font-size: 12px; color: #5F6368;
}
```

点击弹出 Dropdown 菜单:
- **我的信息** (`UserOutlined`) → 导航到 /profile
- **退出登录** (`LogoutOutlined`, danger 红色) → 确认后清除 token，刷新页面

### 头部 Header (32px)

- 高度: 32px，极简
- 背景: transparent
- 右侧保留 140px 给窗口控制按钮
- 整体可拖拽 (`WebkitAppRegion: 'drag'`)
- 连接状态显示:
  - **从未连接过**: `Alert type="info"` + `LoadingOutlined` 旋转图标 + "正在连接网关服务..."
  - **断开重连中**: `Alert type="warning"` + "连接中断，正在自动重连..." + "立即重连" 按钮
  - Alert 样式: 透明背景, 无边框, 24px 高, 12px 字体

### 内容区域

```
margin: '0 16px'
flex: 1
padding: 24px
background: isDarkMode ? '#141414' : '#ffffff'
borderRadius: borderRadiusLG (Ant Design token, 约 8px)
overflow: auto
marginBottom: 16px
```

## 隐藏开发者菜单 (Ctrl+L)

按下 `Ctrl+L` 切换 `showMoreFeatures` 状态，显示/隐藏「更多功能」子菜单：

| 菜单项 | Key | 图标 |
|--------|-----|------|
| 聊天 | chat | UserOutlined |
| 活动实例 | instances | PlayCircleOutlined |
| 会话 | sessions | MessageOutlined |
| 任务 | cron | ScheduleOutlined |
| 消耗统计 | usage | BarChartOutlined |
| 代理 | agents | RobotOutlined |
| 技能 | skills | BulbOutlined |
| 算力节点 | nodes | ClusterOutlined |
| 高级配置 | config | ControlOutlined |
| 调试器 | debug | BugOutlined |
| 命令行 | terminal | ConsoleSqlOutlined |

## 网关断连 Modal

当连接中断且之前曾成功连接过时，弹出 Modal：
- **组件**: Ant Design `Modal` + `Result`
- **status**: warning
- **title**: "网关连接已中断"
- **subTitle**: "与后台网关服务的连接暂时中断..."
- **按钮**:
  - "立即重连" (type primary) → 重新连接
  - "知道了" → 关闭 Modal
