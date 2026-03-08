# Home.tsx 数字员工管理功能文档

## 概述

Home.tsx 是 AI Desktop Sandbox 应用的主页面，提供数字员工的创建、管理和交互功能。本文档详细说明了创建员工和数字员工管理面板的功能、按钮、逻辑以及涉及的相关代码文件。

## 功能模块

### 1. 创建员工（新增数字员工）面板

#### 位置
- 文件: `ui-react-prod/src/pages/Home.tsx`
- 行号: 807-888 (Modal 组件)

#### 触发方式
点击"创建员工"按钮（主页面 line 657-664）

#### 面板功能

| 功能项 | 行号 | 说明 |
|--------|------|------|
| **头像设置** | 816-822 | 显示当前头像，支持上传新头像 |
| **员工名称** | 824-828 | 必填项，输入员工名称 |
| **图标（Emoji）选择** | 830-872 | 从预设列表中选择 Emoji 图标 |
| **员工标识** | 874-883 | 仅新增时显示，英文/拼音标识，决定物理文件夹名称 |
| **角色背景/主题描述** | 884-886 | 可选项，描述员工的职责和背景 |

#### 面板按钮

| 按钮 | 类型 | 说明 |
|------|------|------|
| 保存 | primary | 提交表单，创建或更新员工 |
| 取消 | default | 关闭面板，不保存修改 |

#### 核心逻辑

##### handleAdd() - 初始化新增状态
**位置**: line 369-375

```typescript
const handleAdd = () => {
    setEditingEmployee(null);  // 清空编辑对象
    setAvatarUrl(`https://picsum.photos/seed/${Date.now()}/200`);  // 生成随机头像
    setSelectedEmoji('🤖');  // 默认 Emoji
    form.resetFields();  // 重置表单
    setIsEditModalVisible(true);  // 显示面板
};
```

##### handleSave() - 保存员工信息
**位置**: line 377-492

**新增员工流程**:
1. 表单验证
2. 生成唯一 ID（`agent-${Date.now().toString(36)}` 或用户输入）
3. 通过 Gateway API 创建 agent
   ```typescript
   await client.request("agents.create", {
       name: id,
       workspace: workspacePath,
       emoji: values.emoji || '🤖'
   });
   ```
4. 更新显示名称（重试机制，最多3次）
5. 复制模板文件到工作区
   ```typescript
   copyCommands = [
       `copy /Y "${themdPath}\\AGENTS.md" "${workspacePath}\\AGENTS.md"`,
       `copy /Y "${themdPath}\\USER.md" "${workspacePath}\\USER.md"`,
       `copy /Y "${themdPath}\\TOOLS.md" "${workspacePath}\\TOOLS.md"`
   ];
   ```
6. 乐观更新 UI（立即显示新员工）
7. 延迟刷新列表确保后端配置就绪

**编辑员工流程**:
1. 表单验证
2. 通过 Gateway API 更新 agent
   ```typescript
   await client.request("agents.update", {
       agentId: editingEmployee.id,
       name: values.name,
       avatar: finalAvatar,
   });
   ```
3. 刷新员工列表

##### beforeUpload() - 处理头像上传
**位置**: line 576-583

将上传的图片转换为 Base64 格式，设置为当前头像。

##### updateLocalState() - 更新本地状态
**位置**: line 553-574

当未连接到 Gateway 时，使用此函数更新本地员工状态。

#### 预设 Emoji 列表
**位置**: line 42-103

包含 100+ 个预设 Emoji，分为以下类别：
- 人物/职业（🤖, 👨‍💻, 👩‍💻 等）
- 科技/设备（📱, 💻, ⌨️ 等）
- 文件/办公（📊, 📈, 📁 等）
- 工具/维修（🔧, 🔨, ⚙️ 等）
- 网络/通讯（🌐, 🛰️ 等）
- 交通（🚀, ✈️, 🚗 等）
- 自然/天气（☀️, 🌧️, 🌊 等）
- 符号/状态（⭐, ✅, ⚠️ 等）
- 食物（🍎, 🍕, 🥭 等）
- 动物（🐶, 🐱, 🦊 等）
- 植物（🌸, 🌺, 🌻 等）

---

### 2. 数字员工管理面板

#### 位置
- 文件: `ui-react-prod/src/pages/Home.tsx`
- 行号: 785-804 (Modal 组件)

#### 触发方式
点击"进入管理"按钮（主页面 line 665-671）

#### 面板功能

显示所有数字员工的列表，支持分页显示（每页5条）。

#### 面板按钮

| 按钮 | 行号 | 说明 |
|------|------|------|
| 新增数字员工 | 794 | 打开新增员工面板 |
| 编辑 | 620 | 打开编辑员工面板 |
| 高级配置 | 622 | 打开高级配置面板 |
| 删除 | 626 | 删除员工（仅非主员工） |

#### 表格列定义

**位置**: line 585-633

| 列名 | 数据键 | 说明 |
|------|--------|------|
| 头像 | avatar | 显示员工头像（方形 Avatar） |
| 名称 | name | 显示员工名称 |
| 当前任务 | currentTask | 显示员工当前任务状态 |
| 状态 | status | 显示员工状态（空闲/忙碌/离线） |
| 操作 | action | 提供编辑、高级配置、删除按钮 |

#### 状态说明

**位置**: `ui-react-prod/src/types.ts:1-5`

| 状态 | 枚举值 | 颜色 |
|------|--------|------|
| 空闲 | EmployeeStatus.IDLE | 绿色 (#22c55e) |
| 忙碌 | EmployeeStatus.BUSY | 黄色 (#F4B400) |
| 离线 | EmployeeStatus.OFFLINE | 红色 |

#### 核心逻辑

##### handleEdit() - 打开编辑面板
**位置**: line 357-367

加载选中员工的信息到表单，显示编辑面板。

##### handleDelete() - 删除员工
**位置**: line 274-355

**删除流程**:
1. 检查 Gateway 连接状态
2. 删除 Agent 的记忆（memory-lancedb-pro scope）
   ```typescript
   executeTerminalCommands({
       commands: [`openclaw memory-pro delete-bulk --scope agent:${id}`],
       cwd: 'D:\\Digital_Employees\\digital_employees_configs\\.openclaw',
       ...
   });
   ```
3. 通过 Gateway API 删除 agent 配置
   ```typescript
   await client.request("agents.delete", { agentId: id });
   ```
4. 删除物理文件夹
   ```typescript
   commands = [
       `rmdir /s /q "${workspacePath}"`,  // 工作区
       `rmdir /s /q "${agentDirPath}"`   // Agent 目录
   ];
   ```
5. 刷新员工列表
6. 触发 `agents-updated` 事件

**注意事项**:
- 主员工（id === 'main'）不能删除
- 删除操作需要二次确认
- 即使物理文件夹删除失败，agent 配置也会被删除

##### executeTerminalCommands() - 执行终端命令
**位置**: line 171-272

通过 WebSocket 连接到本地终端，执行一系列命令序列。用于文件操作和配置管理。

**工作原理**:
1. 建立 WebSocket 连接
2. 启动 shell（Windows: cmd.exe, 其他: bash）
3. 按顺序发送命令
4. 检测命令完成（通过提示符匹配）
5. 发送下一条命令或结束

---

### 3. 高级配置面板

#### 位置
- 文件: `ui-react-prod/src/pages/Home.tsx`
- 行号: 907-945 (Modal 组件)

#### 触发方式
点击"高级配置"按钮（管理面板 line 621-624）

#### 面板功能

连接到集成协议，让数字员工支持自动化对话与外部触发。

#### 面板按钮

| 平台 | 行号 | 说明 |
|------|------|------|
| 飞书 Robot | 929-939 | 配置飞书机器人绑定 |

---

### 4. 飞书绑定配置面板

#### 位置
- 文件: `ui-react-prod/src/pages/Home.tsx`
- 行号: 947-983 (Modal 组件)

#### 触发方式
点击飞书 Robot 的"配置"按钮（高级配置面板 line 929-939）

#### 面板功能

绑定飞书账号，实现通过飞书与数字员工交互。

#### 面板表单

| 字段 | 行号 | 说明 |
|------|------|------|
| App ID | 957-958 | 飞书应用的 App ID（cli_开头） |
| App Secret | 960-961 | 飞书应用的 App Secret |
| 配对码 | 972-977 | 第一步绑定后，从飞书私聊机器人获取的8位配对码 |

#### 面板按钮

| 按钮 | 行号 | 说明 |
|------|------|------|
| 一键绑定并配置 | 963 | 提交 App ID 和 Secret |
| 确认配对 | 978 | 提交配对码完成绑定 |

#### 核心逻辑

##### handleBindFeishu() - 绑定飞书账号
**位置**: line 494-524

通过终端命令配置飞书账号：
```typescript
commands = [
    `openclaw config set channels.feishu.accounts.${agentId}.enabled true`,
    `openclaw config set channels.feishu.accounts.${agentId}.appId "${values.appId}"`,
    `openclaw config set channels.feishu.accounts.${agentId}.appSecret "${values.appSecret}"`,
    `openclaw agents bind --agent ${agentId} --bind feishu:${agentId}`
];
```

##### handleApprovePairing() - 审批配对
**位置**: line 526-551

通过终端命令审批配对：
```typescript
commands = [`openclaw pairing approve feishu ${pairingCode} --account ${agentId}`];
```

#### 绑定流程

1. 填写 App ID 和 App Secret
2. 点击"一键绑定并配置"
3. 在飞书私聊机器人发送消息（如"你好"）
4. 获取 8 位配对码
5. 填写配对码并点击"确认配对"
6. 完成绑定，飞书机器人可以开始使用

---

## 涉及的代码文件

### 核心文件

| 文件路径 | 说明 |
|---------|------|
| `ui-react-prod/src/pages/Home.tsx` | 主页面，包含所有数字员工管理功能 |
| `ui-react-prod/src/pages/DigitalEmployees.tsx` | 数字员工对话页面，处理聊天交互 |

### 类型定义

| 文件路径 | 说明 |
|---------|------|
| `ui-react-prod/src/types.ts` | 包含 `DigitalEmployee` 接口和 `EmployeeStatus` 枚举 |
| `ui-react-prod/src/types/gateway.ts` | Gateway API 类型定义 |

### 上下文和核心功能

| 文件路径 | 说明 |
|---------|------|
| `ui-react-prod/src/core/GatewayContext.tsx` | 提供 Gateway WebSocket 连接 |
| `ui-react-prod/src/core/chat-utils.ts` | 聊天消息处理工具函数 |

### 组件和工具

| 文件路径 | 说明 |
|---------|------|
| `ui-react-prod/src/components/SearchSessionsModal.tsx` | 搜索会话历史模态框 |
| `ui-react-prod/src/constants.tsx` | 常量定义，包含 MOCK_USER、MOCK_EMPLOYEES 等 |

---

## 数据流

### 创建员工流程

```
用户点击"创建员工"
    ↓
handleAdd() - 初始化状态
    ↓
用户填写表单（头像、名称、Emoji、ID、主题）
    ↓
用户点击"保存"
    ↓
handleSave() - 表单验证
    ↓
通过 Gateway API 创建 agent (agents.create)
    ↓
更新显示名称 (agents.update)
    ↓
复制模板文件到工作区 (terminal commands)
    ↓
乐观更新 UI
    ↓
刷新员工列表
    ↓
触发 agents-updated 事件
```

### 删除员工流程

```
用户点击"删除"
    ↓
Popconfirm 二次确认
    ↓
handleDelete() - 检查连接状态
    ↓
删除 Agent 记忆 (terminal: openclaw memory-pro delete-bulk)
    ↓
删除 Agent 配置 (agents.delete)
    ↓
删除物理文件夹 (terminal: rmdir /s /q)
    ↓
刷新员工列表
    ↓
触发 agents-updated 事件
```

### 飞书绑定流程

```
用户点击"高级配置" → "飞书 Robot" → "配置"
    ↓
填写 App ID 和 App Secret
    ↓
点击"一键绑定并配置"
    ↓
handleBindFeishu() - 执行终端命令
    ↓
在飞书私聊机器人发送消息
    ↓
获取 8 位配对码
    ↓
填写配对码
    ↓
点击"确认配对"
    ↓
handleApprovePairing() - 执行终端命令
    ↓
完成绑定
```

---

## Gateway API 调用

| API 方法 | 参数 | 说明 |
|---------|------|------|
| `agents.list` | `{}` | 获取所有 agent 列表 |
| `agents.create` | `{ name, workspace, emoji }` | 创建新 agent |
| `agents.update` | `{ agentId, name, avatar }` | 更新 agent 信息 |
| `agents.delete` | `{ agentId }` | 删除 agent |
| `chat.send` | `{ sessionKey, message, deliver, idempotencyKey, attachments }` | 发送聊天消息 |
| `chat.history` | `{ sessionKey, limit }` | 获取聊天历史 |
| `chat.abort` | `{ sessionKey, runId }` | 中断当前聊天 |
| `sessions.list` | `{ agentId, limit, includeDerivedTitles, includeLastMessage }` | 获取会话列表 |
| `sessions.delete` | `{ key, deleteTranscript }` | 删除会话 |

---

## 注意事项

1. **Gateway 连接**: 大部分操作都需要 Gateway 连接（`client && connected`），未连接时会显示错误提示。

2. **主员工限制**: ID 为 'main' 的员工不能删除。

3. **文件路径**: 代码中硬编码了 Windows 路径（`D:\\Digital_Employees\\digital_employees_configs\\.openclaw`），在其他平台上可能需要调整。

4. **终端命令**: 终端命令检测依赖于提示符模式匹配，可能需要根据系统环境调整。

5. **乐观更新**: 创建员工时使用乐观更新，立即在 UI 中显示，提高用户体验。

6. **错误处理**: 创建、更新、删除操作都有完整的错误处理和用户提示。

7. **文件大小限制**: 附件文件大小限制为 5MB。

---

## 相关文档

- [Pinokio 文档](https://docs.pinokio.computer/) - 上游项目文档
- [OpenClaw Gateway API](./openclaw-gateway-api.md) - Gateway API 详细文档（如有）
