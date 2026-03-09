# 实施路线图与风险处理

## 实施阶段

### Phase 1: 基础架构搭建（1-2 天）

#### 任务清单

| 序号 | 任务 | 文件 | 优先级 |
|------|------|------|--------|
| 1 | 更新 preload 白名单 | `electron/preload/index.ts` | P0 |
| 2 | 实现 IPC handlers | `electron/main/ipc-handlers.ts` | P0 |
| 3 | 扩展 channel-config | `electron/utils/channel-config.ts` | P0 |
| 4 | 创建 agentFeishu Store | `src/stores/agentFeishu.ts` | P0 |

#### 验收标准
- [ ] IPC 调用无报错
- [ ] 配置文件读写正常
- [ ] Store 状态管理正确

---

### Phase 2: UI 组件开发（2 天）

#### 任务清单

| 序号 | 任务 | 文件 | 优先级 |
|------|------|------|--------|
| 1 | 创建 BindingTerminalLog 组件 | `src/components/common/BindingTerminalLog.tsx` | P1 |
| 2 | 改造 AgentAdvancedConfigDialog | `src/components/common/AgentAdvancedConfigDialog.tsx` | P0 |
| 3 | 添加飞书状态显示（可选） | `AgentManageDialog.tsx`, `HomeDashboard.tsx` | P2 |

#### 验收标准
- [ ] 三步骤绑定流程正常工作
- [ ] 日志实时显示
- [ ] 错误状态正确处理

---

### Phase 3: 集成测试（1-2 天）

#### 测试场景

1. **正常绑定流程**
   ```
   创建 Agent → 打开高级配置 → 输入 AppID/Secret → 保存配置 →
   显示配对界面 → 输入配对码 → 完成绑定
   ```

2. **解绑流程**
   ```
   打开已绑定 Agent → 点击解绑 → 清理配置 → 恢复未绑定状态
   ```

3. **多 Agent 隔离测试**
   ```
   Agent A 绑定飞书账号 X
   Agent B 绑定飞书账号 Y
   验证两个账号独立工作，互不干扰
   ```

4. **错误恢复测试**
   ```
   - 输入错误的 AppID
   - 输入错误的配对码
   - 网络中断
   - Gateway 未启动
   ```

---

### Phase 4: 优化与文档（1 天）

#### 任务清单

- [ ] 添加中文错误提示
- [ ] 优化加载状态
- [ ] 完善日志输出
- [ ] 更新用户文档

---

## 风险评估与缓解措施

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| CLI 命令执行超时 | 中 | 高 | 增加超时时间到 60s；添加进度提示；支持取消操作 |
| AppSecret 泄露 | 低 | 高 | 加密存储；日志脱敏；只在内存中保存 |
| 配置文件格式不兼容 | 中 | 中 | 实现向后兼容；提供迁移脚本 |
| Gateway 配置未刷新 | 中 | 中 | 绑定后自动发送 reload 信号；添加重试机制 |
| 配对码过期 | 高 | 低 | 提示用户 10 分钟内完成；支持重新生成 |
| Windows 编码问题 | 中 | 中 | 强制 UTF-8；测试中文路径 |

---

## 关键设计决策

### 决策 1: CLI vs WebSocket 终端

**选项 A: Node.js spawn (推荐)**
- 优点：简单可靠，无需 WebSocket 连接
- 缺点：需要处理编码和超时

**选项 B: WebSocket PTY**
- 优点：复用现有终端基础设施
- 缺点：复杂度高，可能有稳定性问题

**决定**: 使用选项 A，通过 IPC 直接 spawn shell 执行命令。

### 决策 2: 配置存储位置

**选项 A: openclaw.json (推荐)**
- 优点：与 OpenClaw 原生配置一致
- 缺点：需要 CLI 命令修改

**选项 B: 独立配置文件**
- 优点：前端可直接读写
- 缺点：与 Gateway 配置不同步

**决定**: 使用选项 A，遵循 OpenClaw 配置规范。

### 决策 3: AppSecret 加密

**选项 A: Electron safeStorage**
- 优点：系统级加密
- 缺点：平台依赖

**选项 B: 明文存储（当前方案）**
- 优点：简单
- 缺点：不安全

**决定**: Phase 1 使用明文，Phase 2 升级到 safeStorage。

---

## 调试指南

### 启用详细日志

在 main process 添加环境变量：

```typescript
// electron/main/index.ts
if (process.env.NODE_ENV === 'development') {
  process.env.DEBUG = 'openclaw:*';
}
```

### 查看 IPC 通信

```typescript
// 在 ipc-handlers.ts 添加中间件
ipcMain.handle('terminal:executeCommands', async (event, params) => {
  console.log('[IPC] terminal:executeCommands', params);
  // ... handler logic
});
```

### 手动测试 CLI

```bash
# 进入 OpenClaw 目录
cd "D:\TheClaw\.openclaw"

# 测试配置设置
openclaw config set channels.feishu.accounts.test.enabled true
openclaw config get channels.feishu.accounts.test --json

# 测试绑定
openclaw agents bind --agent test --bind feishu:test
```

---

## 性能考量

### 配置读取优化

```typescript
// 添加本地缓存，避免频繁读取文件
const configCache = new Map<string, { data: AgentFeishuConfig; time: number }>();
const CACHE_TTL = 5000; // 5秒

export async function getFeishuAccountConfigCached(agentId: string): Promise<AgentFeishuConfig | null> {
  const cached = configCache.get(agentId);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const config = await getFeishuAccountConfig(agentId);
  if (config) {
    configCache.set(agentId, { data: config, time: Date.now() });
  }
  return config;
}
```

### 命令批处理

```typescript
// 合并多个配置命令为单个 openclaw config set 调用
// 如果 OpenClaw 支持批量设置
const batchCommand = `openclaw config set channels.feishu.accounts.${agentId} '${JSON.stringify({
  enabled: true,
  appId,
  appSecret,
  paired: false,
})}'`;
```

---

## 回滚计划

如果发现严重问题，快速回滚步骤：

1. **回滚配置**
   ```bash
   openclaw config set channels.feishu.enabled false
   ```

2. **回滚代码**
   ```bash
   git checkout -- electron/preload/index.ts
   git checkout -- electron/main/ipc-handlers.ts
   git checkout -- src/components/common/AgentAdvancedConfigDialog.tsx
   ```

3. **清理数据**
   ```typescript
   // 删除所有飞书账号配置
   Object.keys(config.channels.feishu.accounts).forEach(agentId => {
     delete config.channels.feishu.accounts[agentId];
   });
   ```

---

## 后续优化方向

1. **安全增强**
   - 使用 Electron safeStorage 加密 AppSecret
   - 配对码端到端加密

2. **用户体验**
   - 飞书机器人二维码扫描
   - 自动检测配对码（轮询 Gateway 状态）
   - 飞书消息测试功能

3. **功能扩展**
   - 支持企业微信多账号
   - 支持钉钉多账号
   - 账号绑定状态 Webhook 通知
