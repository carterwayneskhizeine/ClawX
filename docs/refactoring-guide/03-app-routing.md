# 03 - App 路由与 Ctrl+P 切换

## 修改文件: `src/App.tsx`

需要修改 App 组件以支持新路由和 Ctrl+P 双模式切换。

---

## 修改概述

1. 导入新页面组件
2. 添加 `uiMode` state + Ctrl+P 键盘监听
3. 根据 uiMode 条件渲染不同的路由组
4. 添加模式指示器浮层

## 代码变更

### 新增导入（在现有 import 区域）

```typescript
import { useState } from 'react';  // 在现有 useEffect 导入旁新增 useState

// 新页面导入
import { HomeDashboard } from './pages/HomeDashboard';
import { EmployeeChat } from './pages/EmployeeChat';
import { Shop } from './pages/Shop';
import { Classroom } from './pages/Classroom';
import { ComputePoints } from './pages/ComputePoints';
import { SysSettings } from './pages/SysSettings';
import { Profile } from './pages/Profile';
```

### 修改 App 函数体

在 `function App()` 内部，添加 uiMode state 和 Ctrl+P 监听：

```typescript
function App() {
  const navigate = useNavigate();
  const location = useLocation();
  // ... 现有 store hooks 保持不变 ...

  // ★ 新增：UI 模式切换
  const [uiMode, setUiMode] = useState<'new' | 'classic'>('new');

  // ★ 新增：Ctrl+P 快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setUiMode((prev) => {
          const nextMode = prev === 'new' ? 'classic' : 'new';
          // 切换模式时导航到对应的首页
          if (nextMode === 'new') {
            navigate('/');
          } else {
            navigate('/');  // 经典模式首页也是 /
          }
          return nextMode;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // ... 现有 useEffect (initSettings, initGateway, theme 等) 保持不变 ...
```

### 修改路由渲染（替换 return 部分）

将现有的 `<Routes>` 替换为条件渲染：

```tsx
  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={300}>
        <Routes>
          {/* Setup wizard (shown on first launch) */}
          <Route path="/setup/*" element={<Setup />} />

          {uiMode === 'new' ? (
            <>
              {/* 新 UI 路由 */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<HomeDashboard />} />
                <Route path="/employee/:id" element={<EmployeeChat />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/classroom" element={<Classroom />} />
                <Route path="/points" element={<ComputePoints />} />
                <Route path="/sys-settings" element={<SysSettings />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </>
          ) : (
            <>
              {/* 经典 ClawX 路由 */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<Chat />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/channels" element={<Channels />} />
                <Route path="/skills" element={<Skills />} />
                <Route path="/cron" element={<Cron />} />
                <Route path="/settings/*" element={<Settings />} />
              </Route>
            </>
          )}
        </Routes>

        {/* ★ 模式指示器 */}
        <div
          className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[99999]
            px-3 py-1 rounded-full bg-black/60 text-white text-[11px]
            pointer-events-none opacity-40 select-none"
        >
          Ctrl+P 切换 UI · 当前: {uiMode === 'new' ? '新版' : '经典'}
        </div>

        {/* Global toast notifications */}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          style={{ zIndex: 99999 }}
        />
      </TooltipProvider>
    </ErrorBoundary>
  );
```

---

## 传递 uiMode 给 Sidebar

Sidebar 需要知道当前 UI 模式来渲染不同的导航菜单。有两种方式：

### 方式 A（推荐）：通过 settings store 持久化

在 `src/stores/settings.ts` 中添加 `uiMode` 字段：

```typescript
// settings.ts 中新增
interface SettingsState {
  // ... 现有字段 ...
  uiMode: 'new' | 'classic';
  setUiMode: (mode: 'new' | 'classic') => void;
}

// 在 create 中新增
uiMode: 'new',
setUiMode: (mode) => set({ uiMode: mode }),
```

然后 App.tsx 中去掉 `useState`，改用 store：

```typescript
const uiMode = useSettingsStore((s) => s.uiMode);
const setUiMode = useSettingsStore((s) => s.setUiMode);
```

### 方式 B（简单）：通过 Context 传递

如果不需要持久化，直接用 React Context 即可，或者在 App.tsx 中用 `useState` 搭配 custom event 通知 Sidebar。

---

## 注意事项

- 两套路由共用同一个 `<MainLayout />`，但 Sidebar 内容会根据 uiMode 不同而变化（见 04-sidebar-dual-mode.md）
- `Ctrl+P` 被浏览器/Electron 默认用于打印，`e.preventDefault()` 可以阻止
- 模式指示器使用 `pointer-events-none` 不影响其他操作
