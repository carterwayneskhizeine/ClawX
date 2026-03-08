# ClawX 前端重构计划：使用原生技术栈实现 ui-react-prod 功能

## 概述

使用 ClawX 原生技术栈（React + Radix/shadcn + TailwindCSS + Zustand + Electron IPC）重新实现 `ai-desktop-sandbox/ui-react-prod` 的核心前端功能。不移植源码，而是参照新 UI 的设计和功能点在 ClawX 内新建页面。

### 核心原则

1. **技术栈统一**：全部使用 ClawX 的 shadcn/ui + Zustand + `invokeIpc()`，不引入 Ant Design
2. **复用现有 Store**：新页面直接引用 `src/stores/chat.ts`、`src/stores/gateway.ts` 等成熟模块
3. **隐藏旧页面**：ClawX 原有的 Dashboard / Chat / Channels / Skills / Cron / Settings 页面从侧边栏隐藏，保留代码作为后端功能模块，新页面按需调用
4. **不迁移隐藏菜单**：ui-react-prod 中 `Ctrl+L` 触发的「更多功能」下拉菜单（Chat、Instances、Sessions、Cron、Usage、Agents、Skills、Nodes、Config、Debug、Terminal）不需要复制

---

## 1. 待实现的新页面清单

以下是从 ui-react-prod 提取的需要在 ClawX 中重新实现的页面：

| 序号 | 新页面 | 参照源 | 功能说明 | 优先级 |
|------|--------|--------|---------|--------|
| 1 | **首页仪表盘** | `Home.tsx` | 数字员工 Grid + 统计图表 + 创建/编辑/删除 Agent | P0 |
| 2 | **数字员工聊天** | `DigitalEmployees.tsx` | 每个 Agent 的独立聊天界面（流式对话） | P0 |
| 3 | **技能商店** | `Shop.tsx` | 技能卡片列表 + 安装/购买 | P2 |
| 4 | **学习课堂** | `Classroom.tsx` | 课程卡片 + 分类筛选 | P2 |
| 5 | **算力积分** | `ComputePoints.tsx` | 积分余额 + 充值 + 消费记录 | P2 |
| 6 | **系统设置** | `SystemSettings.tsx` | 主题/语言/Gateway 配置/开发者模式 | P1 |
| 7 | **个人资料** | `Profile.tsx` | 用户信息编辑 | P2 |
| 8 | **登录弹窗** | `LoginModal.tsx` | 用户登录/注册（含"本地模式"选项） | P1 |

---

## 2. 架构设计

### 2.1 路由结构（修改后）

```
src/App.tsx 路由表:
┌─────────────────────────────────────────────────────────┐
│ 新增路由（默认显示）                                       │
├─────────────────────────────────────────────────────────┤
│  /              →  HomeDashboard    (首页仪表盘)          │
│  /employee/:id  →  EmployeeChat     (数字员工聊天)        │
│  /shop          →  Shop             (技能商店)            │
│  /classroom     →  Classroom        (学习课堂)            │
│  /points        →  ComputePoints    (算力积分)            │
│  /sys-settings  →  SystemSettings   (系统设置)            │
│  /profile       →  Profile          (个人资料)            │
├─────────────────────────────────────────────────────────┤
│ 隐藏路由（原 ClawX 页面, Ctrl+P 切换可见性）               │
├─────────────────────────────────────────────────────────┤
│  /dashboard     →  Dashboard        (原仪表盘)            │
│  /chat          →  Chat             (原聊天页)            │
│  /channels      →  Channels         (频道管理)            │
│  /skills        →  Skills           (技能管理)            │
│  /cron          →  Cron             (定时任务)            │
│  /settings/*    →  Settings         (原设置页)            │
│  /setup/*       →  Setup            (安装向导)            │
└─────────────────────────────────────────────────────────┘
```

### 2.2 侧边栏改造

**现有 `Sidebar.tsx` 需要改造为两套导航模式：**

```
新 UI 模式（默认）:               原 ClawX 模式（Ctrl+P 切换）:
┌──────────────────────────┐     ┌──────────────────────────┐
│ 🏠 ClawX 首页             │     │ 💬 Chat                  │
│ ─────────────────────── │     │ 📊 Dashboard             │
│ 📊 数字员工               │     │ 📡 Channels              │
│   ├─ 🤖 通用助手          │     │ 🧩 Skills                │
│   ├─ 🧹 数据清洗官        │     │ ⏰ Cron                  │
│   └─ ✍️ 文案策划          │     │ ⚙️ Settings              │
│ 🛒 技能商店               │     │                          │
│ 📖 学习课堂               │     │                          │
│ ⚡ 算力积分               │     │                          │
│ ⚙️ 系统设置               │     │                          │
│ ─────────────────────── │     │                          │
│ 👤 用户信息               │     │                          │
└──────────────────────────┘     └──────────────────────────┘
       Ctrl+P 切换 ↔
```

### 2.3 数据流架构

```
┌──────────────────────────────────┐
│  新页面层 (New UI Pages)          │
│  - HomeDashboard.tsx             │
│  - EmployeeChat.tsx              │
│  - Shop/Classroom/Points...     │
└───────────┬──────────────────────┘
            │ 直接引用
            ▼
┌──────────────────────────────────┐
│  现有 Store 层 (Zustand)          │
│  - chat.ts (流式对话)             │ ← ★ 核心复用
│  - gateway.ts (Gateway 连接)      │ ← ★ 核心复用
│  - settings.ts (配置)             │ ← ★ 核心复用
│  - channels.ts / skills.ts ...    │
└───────────┬──────────────────────┘
            │
            ▼
┌──────────────────────────────────┐
│  API 层                          │
│  - invokeIpc() → Electron IPC    │
│  - gateway:rpc → OpenClaw        │
│  - 新增: agents.create/delete     │
│  - 新增: agents.update            │
└──────────────────────────────────┘
```

---

## 3. 核心功能实现方案

### 3.1 ★ 多 Agent 管理（首页仪表盘 - 最核心功能）

这是 ui-react-prod 最核心的特色功能。需要重新实现以下三个操作：

#### 3.1.1 创建 Agent

**参照源码**: `Home.tsx` `handleSave()`（行 377-492）

**实现方案**: 使用 ClawX 的 `invokeIpc('gateway:rpc', ...)` 调用 Gateway API

```typescript
// src/stores/agents.ts （新建）
import { create } from 'zustand';
import { invokeIpc } from '@/lib/api-client';

interface AgentIdentity {
  name?: string;
  emoji?: string;
  theme?: string;
  avatarUrl?: string;
}

interface Agent {
  id: string;
  name: string;
  identity?: AgentIdentity;
  workspace?: string;
}

interface AgentsState {
  agents: Agent[];
  loading: boolean;
  // 加载 Agent 列表
  fetchAgents: () => Promise<void>;
  // 创建 Agent（两步：agents.create + agents.update 设置中文名）
  createAgent: (params: {
    agentId: string;      // 英文 ID，如 "data-cleaner"
    displayName: string;  // 中文名，如 "数据清洗官"
    emoji?: string;       // Emoji 图标
    workspace?: string;   // 工作区路径（可选）
  }) => Promise<void>;
  // 编辑 Agent
  updateAgent: (agentId: string, params: { name?: string; avatar?: string }) => Promise<void>;
  // 删除 Agent
  deleteAgent: (agentId: string) => Promise<void>;
}
```

**关键细节（来自踩坑文档 `agent-set-identity-via-websocket-terminal-bug.md`）**:

1. `agents.create` 的 `name` 参数必须传**英文 ID**（因为会被 `normalizeAgentId()` 处理，中文会变成空字符串）
2. 创建后需要**带重试**地调用 `agents.update` 设置中文显示名（Gateway 配置缓存有 ~300ms debounce)
3. `agents.update` 的 Schema 限制了 `additionalProperties: false`，只能传 `agentId`, `name`, `workspace`, `model`, `avatar`，**不能传 `emoji`/`theme`**
4. UI 名称解析优先级：`agent.identity?.name || agent.name || agent.id`

```typescript
// 创建流程伪代码
async function createAgent({ agentId, displayName, emoji, workspace }) {
  // Step 1: 创建 Agent + 写入 IDENTITY.md
  await invokeIpc('gateway:rpc', 'agents.create', {
    name: agentId,
    workspace: workspace || `D:\\TheClaw\\.openclaw\\workspace-${agentId}`,
    emoji: emoji || '🤖'
  });

  // Step 2: 带重试设置中文显示名（写入 openclaw.json 的 name 字段）
  for (let i = 0; i < 3; i++) {
    try {
      await invokeIpc('gateway:rpc', 'agents.update', {
        agentId,
        name: displayName,
      });
      return;
    } catch (err) {
      if (i < 2) await new Promise(r => setTimeout(r, 1500));
      else throw err;
    }
  }
}
```

#### 3.1.2 删除 Agent

**参照源码**: `Home.tsx` `handleDelete()`（行 274-355）

**ui-react-prod 的方案**用了三步：
1. 通过终端命令删除 Agent 记忆（`memory-pro delete-bulk`）
2. 通过 Gateway API 删除配置（`agents.delete`）
3. 通过终端命令删除物理文件夹（`rmdir /s /q`）

**ClawX 实现方案**：

```typescript
async function deleteAgent(agentId: string) {
  // Step 1: 删除 Agent 配置（Gateway API）
  await invokeIpc('gateway:rpc', 'agents.delete', { agentId });

  // Step 2: 删除物理文件夹（通过 Electron Main 进程 IPC）
  // 需要在 electron/main/ipc-handlers.ts 新增 IPC handler
  await invokeIpc('agent:cleanupFiles', { agentId });
}
```

> **注意**：需要在 Electron main 进程新增 `agent:cleanupFiles` IPC handler，使用 `fs.rm()` 递归删除 workspace 和 agent 目录，避免使用不可靠的 WebSocket 终端方案。

#### 3.1.3 模板文件复制

**参照源码**: `Home.tsx` 行 440-463, `digital-employee-creation-enhancement.md`

创建 Agent 后自动复制 `AGENTS.md` / `USER.md` / `TOOLS.md` 模板文件到新工作区。

**ClawX 实现方案**：同样通过新增 IPC handler 在 Electron main 进程中完成文件操作，替代原有的 WebSocket 终端执行 `copy /Y` 命令。

```typescript
// electron/main/ipc-handlers.ts 新增
ipcMain.handle('agent:copyTemplates', async (_, { agentId, templateDir, workspaceDir }) => {
  const templates = ['AGENTS.md', 'USER.md', 'TOOLS.md'];
  for (const file of templates) {
    const src = path.join(templateDir, file);
    const dst = path.join(workspaceDir, file);
    if (fs.existsSync(src)) {
      await fs.promises.copyFile(src, dst);
    }
  }
});
```

### 3.2 ★ 数字员工聊天页面

**参照源码**: `DigitalEmployees.tsx`（1079 行）

**关键差异**：ui-react-prod 使用 `GatewayBrowserClient`（WebSocket 直连）的方式做流式对话。而 ClawX 有更成熟的 `chat.ts` Store（1808 行），支持：
- 流式文本 + Thinking 展开
- Tool Use 状态追踪
- 文件附件上传（file:stage → chat:sendWithMedia）
- 会话管理（sessions.list / sessions.create / sessions.delete）
- 图片/文件提取和渲染
- 错误恢复 + 安全超时

**实现方案**：新建 `EmployeeChat.tsx`，**核心逻辑直接复用 `useChatStore`**，复用现有 `ChatMessage.tsx` / `ChatInput.tsx` 组件。

```typescript
// src/pages/EmployeeChat/index.tsx
import { useChatStore } from '@/stores/chat';

export function EmployeeChat() {
  const { id } = useParams(); // Agent ID from URL
  const sessionKey = `agent:${id}:default`;  // ★ 关键：Agent 路由前缀

  // 使用现有 chat store，只需传入不同的 sessionKey
  const { messages, sendMessage, loadHistory, ... } = useChatStore();

  useEffect(() => {
    // 切换到该 Agent 的会话
    useChatStore.getState().switchSession(sessionKey);
    loadHistory();
  }, [id]);

  // 复用现有的 ChatMessage + ChatInput 组件
  return (
    <div>
      {messages.map(m => <ChatMessage key={m.id} message={m} />)}
      <ChatInput onSend={(text) => sendMessage(text, sessionKey)} />
    </div>
  );
}
```

**Session Key 路由机制**（来自 `digital-employees-multiagent-setup.md`）：
- 格式：`agent:<agentId>:default`
- Gateway 自动根据 `agent:` 前缀解析并路由到对应 Agent 实例
- 每个 Agent 的会话历史完全隔离

### 3.3 系统设置页面

**参照源码**: `SystemSettings.tsx`（283 行）

功能包含：
- 主题切换（亮/暗/系统）→ 复用 `settings.ts` store
- 语言设置 → 复用 `settings.ts` store
- Gateway URL / Token 配置 → 复用 `settings.ts` store
- 开发者模式（切换到原 ClawX UI）→ **对应 Ctrl+P 切换**

### 3.4 其他页面（P2 优先级）

| 页面 | 实现复杂度 | 说明 |
|------|-----------|------|
| Shop.tsx | 低 | 纯展示页面，Mock 数据，卡片列表布局 |
| Classroom.tsx | 低 | 纯展示页面，课程卡片 + 分类 Tab |
| ComputePoints.tsx | 中 | 积分余额展示 + 充值弹窗 + 消费记录 Table |
| Profile.tsx | 低 | 用户信息表单 |
| LoginModal | 中 | 登录/注册表单 + 本地模式跳过 |

---

## 4. 新增/修改的文件清单

### 4.1 新建文件

| 文件路径 | 说明 |
|---------|------|
| `src/stores/agents.ts` | Agent 管理 Store（CRUD 操作） |
| `src/pages/HomeDashboard/index.tsx` | 首页仪表盘（Agent Grid + 统计） |
| `src/pages/EmployeeChat/index.tsx` | 数字员工聊天页面 |
| `src/pages/Shop/index.tsx` | 技能商店 |
| `src/pages/Classroom/index.tsx` | 学习课堂 |
| `src/pages/ComputePoints/index.tsx` | 算力积分 |
| `src/pages/SysSettings/index.tsx` | 系统设置（新版） |
| `src/pages/Profile/index.tsx` | 个人资料 |
| `src/components/common/LoginModal.tsx` | 登录弹窗 |
| `src/components/common/AgentCreateDialog.tsx` | 创建 Agent 对话框（含 Emoji 选择器） |
| `src/components/common/AgentManageDialog.tsx` | Agent 管理表格对话框 |
| `src/components/common/EmojiPicker.tsx` | Emoji 图标选择器组件 |

### 4.2 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `src/App.tsx` | 添加新路由 + Ctrl+P 切换逻辑 + UI 模式 state |
| `src/components/layout/Sidebar.tsx` | 双模式导航（新 UI / 原 ClawX） |
| `src/components/layout/MainLayout.tsx` | 可能需要适配新布局 |
| `src/stores/chat.ts` | 可能需要暴露 `switchSession(key)` 方法 |
| `electron/preload/index.ts` | 添加 `agent:cleanupFiles`, `agent:copyTemplates` 到白名单 |
| `electron/main/ipc-handlers.ts` | 新增 Agent 文件操作的 IPC handlers |

### 4.3 不需要修改的文件

| 文件/目录 | 说明 |
|---------|------|
| `src/stores/gateway.ts` | 直接复用，零修改 |
| `src/stores/settings.ts` | 直接复用 |
| `src/stores/channels.ts` | 不涉及 |
| `src/stores/skills.ts` | 不涉及 |
| `src/lib/api-client.ts` | 直接复用 `invokeIpc()` |
| `src/pages/Chat/*` | 保留不动，ChatMessage/ChatInput 组件被新页面引用 |
| `src/pages/Dashboard/*` | 保留不动，隐藏在侧边栏 |
| `electron/gateway/manager.ts` | 不涉及 |

---

## 5. 关键适配点

### 5.1 Gateway RPC 调用方式对比

```typescript
// ui-react-prod (WebSocket 直连)
const { client } = useGateway();
const res = await client.request("agents.list", {});

// ClawX (Electron IPC → Gateway)
import { invokeIpc } from '@/lib/api-client';
const res = await invokeIpc('gateway:rpc', 'agents.list', {});

// 或通过 gateway store
const { rpc } = useGatewayStore();
const res = await rpc('agents.list', {});
```

### 5.2 Agent 工作区路径

ui-react-prod 硬编码为：
```
D:\Digital_Employees\digital_employees_configs\.openclaw\workspace-<agentId>
```

ClawX 已自定义路径为（参见 `openclaw-path-customization.md`）：
```
D:\TheClaw\.openclaw\workspace-<agentId>
```

需要使用 `getOpenClawConfigDir()` 动态获取路径，替代硬编码。

### 5.3 主题系统适配

ui-react-prod 使用 Ant Design `ConfigProvider` 做主题切换。ClawX 使用 TailwindCSS `dark:` variant + `useSettingsStore` 做主题切换。新页面须全部使用 TailwindCSS dark mode 方案。

### 5.4 认证流程

ui-react-prod 有独立的 `AuthService` 连接 `ai-api.fantasy-lab.com`。ClawX 环境中建议：

- **方案 A（推荐，快速）**：新增 `LoginModal` 弹窗，保留远程登录能力，增加"本地模式"按钮一键跳过
- **方案 B（长期）**：将用户认证整合到 ClawX Setup Wizard，统一管理

### 5.5 Emoji 选择器

ui-react-prod 使用 Ant Design `Popover` + 150+ 预设 Emoji Grid。ClawX 中用 Radix `Popover` + 相同的 Emoji 数据实现。

---

## 6. 实施阶段

### Phase 1：基础框架（~2 天）

1. 创建 `src/stores/agents.ts`，实现 Agent CRUD
2. 修改 `App.tsx` 添加新路由和 Ctrl+P 切换逻辑
3. 修改 `Sidebar.tsx` 实现双模式导航
4. 新增 `electron/main/ipc-handlers.ts` Agent 文件操作 handlers
5. 更新 `electron/preload/index.ts` IPC 白名单

### Phase 2：首页仪表盘（~2 天）

6. 创建 `HomeDashboard` 页面
   - Agent 卡片 Grid（shadcn Card 组件）
   - 创建 Agent 对话框（含 Emoji 选择器 + 英文 ID 输入）
   - 管理 Agent 对话框（表格 + 编辑/删除操作）
   - 统计图表区域（暂用简单 CSS 条形图，后期可加 recharts）

### Phase 3：数字员工聊天（~2 天）

7. 创建 `EmployeeChat` 页面
   - 复用 `useChatStore` + `ChatMessage` + `ChatInput`
   - 基于 `agent:<agentId>:default` 的 Session Key 路由
   - 会话列表侧边栏（可选项）

### Phase 4：辅助页面 + 设置（~2 天）

8. 创建 SystemSettings 页面（主题/语言/Gateway/开发者模式切换）
9. 创建 LoginModal 组件
10. 创建 Shop / Classroom / ComputePoints / Profile 页面（可用 Mock 数据先行）

### Phase 5：测试 + 打磨（~1 天）

11. 全面功能测试
12. 暗色主题样式验证
13. Ctrl+P 切换逻辑验证
14. Agent 创建/删除全链路验证

---

## 7. Ctrl+P 切换实现方案

```typescript
// src/App.tsx
function App() {
  const [uiMode, setUiMode] = useState<'new' | 'classic'>('new');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setUiMode(prev => prev === 'new' ? 'classic' : 'new');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <ErrorBoundary>
      <TooltipProvider>
        {/* 两套 UI 共享同一个 Router，但各自有不同的 Layout */}
        <Routes>
          <Route path="/setup/*" element={<Setup />} />

          {uiMode === 'new' ? (
            <Route element={<NewMainLayout />}>
              <Route path="/" element={<HomeDashboard />} />
              <Route path="/employee/:id" element={<EmployeeChat />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/classroom" element={<Classroom />} />
              <Route path="/points" element={<ComputePoints />} />
              <Route path="/sys-settings" element={<SysSettings />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          ) : (
            <Route element={<MainLayout />}>
              <Route path="/" element={<Chat />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/channels" element={<Channels />} />
              <Route path="/skills" element={<Skills />} />
              <Route path="/cron" element={<Cron />} />
              <Route path="/settings/*" element={<Settings />} />
            </Route>
          )}
        </Routes>

        {/* 模式指示器 */}
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[99999]
          px-3 py-1 rounded-full bg-black/60 text-white text-[11px]
          pointer-events-none opacity-40">
          Ctrl+P 切换 UI · 当前: {uiMode === 'new' ? '新版' : '经典'}
        </div>

        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </ErrorBoundary>
  );
}
```

---

## 8. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| `agents.create` 创建后 `agents.update` 报 "agent not found" | Agent 中文名设置失败 | 带重试机制（3 次，间隔 1.5s），已验证有效 |
| `agents.update` 不接受 `emoji` 参数 | Emoji 无法通过 update 修改 | Emoji 只在 `agents.create` 时传入，编辑时不修改 emoji |
| Chat Store `switchSession` 可能需要改造 | 多 Agent 会话切换不流畅 | 评估 chat.ts 现有 sessionKey 切换能力，必要时扩展 |
| 两套 UI 共存时 CSS 可能冲突 | 样式错乱 | 都用 TailwindCSS，不会冲突 |
| Agent 删除后物理文件未清理 | 磁盘残留 | 通过 Electron IPC 在 main 进程做文件操作，比 WebSocket 终端可靠 |

---

## 9. 与 ui-react-prod 实现方式的关键差异

| 功能点 | ui-react-prod 方案 | ClawX 重新实现方案 |
|--------|-------------------|-------------------|
| Gateway 通信 | `GatewayBrowserClient` (WebSocket 直连) | `invokeIpc('gateway:rpc')` (Electron IPC) |
| 流式聊天 | 自研 `chat-utils.ts` (360行) | 复用 `chat.ts` Store (1808行), 功能更完整 |
| Agent CRUD | WebSocket 终端 + Gateway API 混合 | 纯 Gateway API + Electron IPC 文件操作 |
| 文件操作 | WebSocket 终端 (`copy /Y`, `rmdir`) | Electron Main 进程 `fs.promises` |
| UI 组件库 | Ant Design v6 | shadcn/ui + Radix UI |
| 状态管理 | React Context + useState | Zustand |
| 主题 | Ant Design ConfigProvider | TailwindCSS dark mode |
| 路由 | HashRouter | BrowserRouter (Electron) |

---

## 10. 预估工作量

| 阶段 | 内容 | 预估 |
|------|------|------|
| Phase 1 | 基础框架 + Store + IPC | 2 天 |
| Phase 2 | 首页仪表盘 | 2 天 |
| Phase 3 | 数字员工聊天 | 2 天 |
| Phase 4 | 辅助页面 + 设置 | 2 天 |
| Phase 5 | 测试打磨 | 1 天 |
| **合计** | | **~9 天** |

---

## 修改历史

| 日期 | 版本 | 修改内容 |
|------|------|---------|
| 2026-03-08 | 1.0 | 初始版本：使用 ClawX 原生技术栈重构计划 |
