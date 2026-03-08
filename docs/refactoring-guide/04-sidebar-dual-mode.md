# 04 - Sidebar 双模式导航

## 修改文件: `src/components/layout/Sidebar.tsx`

根据 uiMode 显示不同的导航菜单。新 UI 模式显示 Agent 列表 + 功能页面；经典模式保持原有布局。

---

## 修改概述

1. 读取 `uiMode` 状态（从 settings store 或 context）
2. 新增 Agent 列表导航项
3. 新增功能页面导航项（商店、课堂、积分、设置）
4. 保留经典模式的原始导航

## 代码变更

### 新增导入

```typescript
import {
  Home,
  MessageSquare,
  Radio,
  Puzzle,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  Terminal,
  ExternalLink,
  Trash2,
  // ★ 新增图标
  Users,
  ShoppingBag,
  BookOpen,
  Zap,
  User,
} from 'lucide-react';
import { useAgentsStore } from '@/stores/agents';
```

### 修改 Sidebar 组件

在 `Sidebar` 函数体内部，添加新模式的导航逻辑。以下展示关键修改部分：

```tsx
export function Sidebar() {
  // ... 现有 hooks ...
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((state) => state.setSidebarCollapsed);
  const uiMode = useSettingsStore((state) => state.uiMode);   // ★ 读取 UI 模式

  // ★ 新增：Agent 列表（新 UI 模式下使用）
  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);
  const gatewayStatus = useGatewayStore((s) => s.status);   // 需要导入 useGatewayStore

  // 首次加载 Agent 列表
  useEffect(() => {
    if (uiMode === 'new' && gatewayStatus === 'running') {
      fetchAgents();
    }
  }, [uiMode, gatewayStatus, fetchAgents]);

  // ... 现有经典模式逻辑保持不变 ...

  // ★ 新 UI 模式的导航项
  const newUiNavItems = [
    { to: '/shop', icon: <ShoppingBag className="h-5 w-5" />, label: '技能商店' },
    { to: '/classroom', icon: <BookOpen className="h-5 w-5" />, label: '学习课堂' },
    { to: '/points', icon: <Zap className="h-5 w-5" />, label: '算力积分' },
    { to: '/sys-settings', icon: <Settings className="h-5 w-5" />, label: '系统设置' },
  ];

  // 经典模式保持原有 navItems
  const classicNavItems = [
    { to: '/cron', icon: <Clock className="h-5 w-5" />, label: t('sidebar.cronTasks') },
    { to: '/skills', icon: <Puzzle className="h-5 w-5" />, label: t('sidebar.skills') },
    { to: '/channels', icon: <Radio className="h-5 w-5" />, label: t('sidebar.channels') },
    { to: '/dashboard', icon: <Home className="h-5 w-5" />, label: t('sidebar.dashboard') },
    { to: '/settings', icon: <Settings className="h-5 w-5" />, label: t('sidebar.settings') },
  ];

  return (
    <aside className={cn(
      'flex shrink-0 flex-col border-r bg-background transition-all duration-300',
      sidebarCollapsed ? 'w-16' : 'w-64'
    )}>
      <nav className="flex-1 overflow-hidden flex flex-col p-2 gap-1">

        {uiMode === 'new' ? (
          <>
            {/* ★ 新 UI 模式 */}

            {/* 首页入口 */}
            <NavItem
              to="/"
              icon={<Home className="h-5 w-5" />}
              label="首页"
              collapsed={sidebarCollapsed}
            />

            {/* Agent 列表标题 */}
            {!sidebarCollapsed && (
              <div className="px-3 pt-3 pb-1 text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wider">
                数字员工
              </div>
            )}

            {/* Agent 列表 */}
            {agents.map((agent) => (
              <NavItem
                key={agent.id}
                to={`/employee/${agent.id}`}
                icon={
                  <span className="text-base w-5 h-5 flex items-center justify-center">
                    {agent.identity?.emoji || '🤖'}
                  </span>
                }
                label={agent.name}
                collapsed={sidebarCollapsed}
              />
            ))}

            {/* 分隔线 */}
            {!sidebarCollapsed && <div className="my-1 border-t border-border/50" />}

            {/* 功能页面 */}
            {newUiNavItems.map((item) => (
              <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />
            ))}
          </>
        ) : (
          <>
            {/* ★ 经典模式：保持原有逻辑 */}

            {/* New Chat 按钮 */}
            <button
              onClick={() => {
                const { messages } = useChatStore.getState();
                if (messages.length > 0) newSession();
                navigate('/');
              }}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground text-muted-foreground',
                sidebarCollapsed && 'justify-center px-2',
              )}
            >
              <MessageSquare className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span className="flex-1 text-left">{t('sidebar.newChat')}</span>}
            </button>

            {classicNavItems.map((item) => (
              <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />
            ))}

            {/* Session list — 经典模式下显示 */}
            {!sidebarCollapsed && sessions.length > 0 && (
              <div className="mt-1 overflow-y-auto max-h-72 space-y-0.5">
                {/* ... 现有的 sessionBuckets 渲染逻辑保持不变 ... */}
              </div>
            )}
          </>
        )}
      </nav>

      {/* Footer - 通用 */}
      <div className="p-2 space-y-2">
        {/* Profile 入口（仅新 UI 模式） */}
        {uiMode === 'new' && !sidebarCollapsed && (
          <NavItem
            to="/profile"
            icon={<User className="h-5 w-5" />}
            label="个人资料"
            collapsed={false}
          />
        )}

        {/* Dev Console（保持不变） */}
        {devModeUnlocked && !sidebarCollapsed && (
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={openDevConsole}>
            <Terminal className="h-4 w-4 mr-2" />
            {t('sidebar.devConsole')}
            <ExternalLink className="h-3 w-3 ml-auto" />
          </Button>
        )}

        {/* 折叠按钮（保持不变） */}
        <Button
          variant="ghost"
          size="icon"
          className="w-full"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* ConfirmDialog 保持不变 */}
    </aside>
  );
}
```

---

## 新增导入说明

需要在 Sidebar.tsx 中新增以下导入：

```typescript
import { useAgentsStore } from '@/stores/agents';
import { useGatewayStore } from '@/stores/gateway';
```

`useGatewayStore` 可能已经在其他 store 中间接引用，确保 Sidebar 的 `gatewayStatus` 可用于判断何时加载 Agent 列表。

---

## 要点说明

### Agent 列表自动刷新

- 当 Gateway 状态变为 `running` 时自动调用 `fetchAgents()`
- Agent 创建/删除后会触发 `window.dispatchEvent(new Event('agents-updated'))`（在 agents store 或页面中触发），Sidebar 可监听此事件刷新列表

### 折叠模式下的 Emoji 显示

折叠模式下 Agent 显示为 Emoji 图标（代替 lucide icon），这样即使侧边栏收起也能区分不同 Agent。

### i18n

新 UI 模式的标签暂时使用中文硬编码。后续可以添加到 i18n 翻译文件中。
