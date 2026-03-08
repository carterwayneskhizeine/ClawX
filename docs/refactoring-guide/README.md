# ClawX UI 重构实现指南

> 基于 [ui-refactoring-plan.md](../ui-refactoring-plan.md)，使用 ClawX 原生技术栈重新实现 ui-react-prod 功能。

## 文档索引

按**建议实施顺序**排列：

| # | 文档 | 涉及文件 | 内容概要 |
|---|------|---------|---------|
| 01 | [agents-store](01-agents-store.md) | `src/stores/agents.ts` [新] | Agent CRUD Store（fetchAgents, createAgent, deleteAgent） |
| 02 | [electron-ipc-handlers](02-electron-ipc-handlers.md) | `electron/preload/index.ts` [改]<br>`electron/main/ipc-handlers.ts` [改] | 文件操作 IPC（agent:cleanupFiles, agent:copyTemplates） |
| 03 | [app-routing](03-app-routing.md) | `src/App.tsx` [改] | 新路由 + Ctrl+P 双模式切换 |
| 04 | [sidebar-dual-mode](04-sidebar-dual-mode.md) | `src/components/layout/Sidebar.tsx` [改] | Agent 列表导航 / 经典模式切换 |
| 05 | [home-dashboard](05-home-dashboard.md) | `src/pages/HomeDashboard/index.tsx` [新] | 首页仪表盘（Agent Grid + 统计） |
| 06 | [employee-chat](06-employee-chat.md) | `src/pages/EmployeeChat/index.tsx` [新] | 数字员工聊天（复用 useChatStore） |
| 07 | [agent-dialogs](07-agent-dialogs.md) | `src/components/common/` [新] ×3 | 创建/管理对话框 + Emoji 选择器 |
| 08 | [auxiliary-pages](08-auxiliary-pages.md) | `src/pages/` [新] ×5 | 商店/课堂/积分/系统设置/资料 |
| 09 | [login-modal](09-login-modal.md) | `src/components/common/LoginModal.tsx` [新] | 登录弹窗（含本地模式） |

## 前置条件

- `settings.ts` 中添加 `uiMode` / `setUiMode`（见 03-app-routing.md）
- `gateway.ts` 的 `rpc()` 或 `invokeIpc('gateway:rpc')` 可正常调用
- 确认 `ChatMessage` / `ChatInput` 组件的 export 方式（named 或 default）

## 新建文件总计

| 类型 | 数量 | 文件 |
|------|------|------|
| Store | 1 | `agents.ts` |
| Pages | 7 | HomeDashboard, EmployeeChat, Shop, Classroom, ComputePoints, SysSettings, Profile |
| Components | 4 | AgentCreateDialog, AgentManageDialog, EmojiPicker, LoginModal |
| **合计** | **12 个新文件** | |

## 修改文件总计

| 文件 | 修改量 |
|------|--------|
| `App.tsx` | 中等 — 新增路由 + uiMode |
| `Sidebar.tsx` | 大 — 双模式导航 |
| `settings.ts` | 小 — 添加 uiMode 字段 |
| `electron/preload/index.ts` | 小 — 2 行白名单 |
| `electron/main/ipc-handlers.ts` | 中等 — 2 个新 handler |
