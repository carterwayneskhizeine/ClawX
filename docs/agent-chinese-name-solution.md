# 数字员工中文名称显示方案

## 问题背景

OpenClaw Gateway 在创建/更新数字员工时，虽然可以设置 `name` 字段，但 Gateway 内部并不持久化保存中文显示名称。每次调用 `agents.list` 返回的数据中：

- `identity` 对象为 `undefined`
- `name` 字段返回的是英文 ID（如 `"smoker666"`），而不是用户输入的中文名称

这导致在前端侧边栏和首页显示的员工名称都是英文 ID，而不是用户创建时输入的中文名称。

## 解决方案

采用**本地缓存 + 乐观更新**策略：

1. **创建员工时**：立即将用户输入的中文名称保存到 `localStorage`
2. **获取列表时**：优先从本地缓存读取名称，其次用 Gateway 返回的，最后用 ID 兜底
3. **删除员工时**：同时清理本地缓存
4. **持久化**：使用 `localStorage` 确保刷新页面后名称仍然保留

## 实现细节

### 数据结构

```typescript
// localStorage key
const AGENT_NAMES_STORAGE_KEY = 'clawx_agent_display_names';

// 缓存格式: { "agent-id": "中文名称", ... }
agentDisplayNames: Record<string, string>
```

### 核心逻辑 (src/stores/agents.ts)

#### 1. 初始化加载
```typescript
agentDisplayNames: loadAgentDisplayNames(), // 从 localStorage 读取
```

#### 2. 获取列表时
```typescript
// 优先使用本地缓存的名称
const cachedName = cachedNames[agent.id];
const displayName = cachedName || agent.name || agent.identity?.name || (agent.id === 'main' ? '通用助手' : agent.id);
```

#### 3. 创建员工时（乐观更新）
```typescript
// Step 0: 先保存显示名称到本地缓存
const newNames = { ...currentNames, [agentId]: displayName };
set({ agentDisplayNames: newNames });
saveAgentDisplayNames(newNames);

// 然后再调用 Gateway API...
```

#### 4. 删除员工时
```typescript
// 清理本地缓存
const newNames = { ...currentNames };
delete newNames[agentId];
saveAgentDisplayNames(newNames);
```

## 与原项目的对比

原项目 `ai-desktop-sandbox/ui-react-prod` 的处理方式：

```typescript
// 乐观更新 - 创建后立即添加到 UI
const newEmployee: DigitalEmployee = {
    id: id,
    name: values.name,  // 用户输入的中文名
    avatar: finalAvatar,
    emoji: values.emoji || '🤖',
    currentTask: '在线',
    status: EmployeeStatus.IDLE
};
setEmployees(prev => [...prev.filter(e => e.id !== id), newEmployee]);
```

本项目的改进：
- 不仅在内存中保存，还持久化到 `localStorage`
- 刷新页面后名称不会丢失
- 多个页面（侧边栏、首页、聊天页）都能正确显示

## 注意事项

1. **Gateway 不支持中文名**：这是 Gateway 本身的限制，前端通过本地缓存绕过
2. **名称映射依赖 agentId**：缓存的 key 是英文 ID，确保 ID 不变名称就正确
3. **清理缓存**：删除员工时必须同时清理本地缓存，否则下次创建同名 ID 会显示旧的名称
