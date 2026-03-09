# 06 - Agent 生命周期与记忆级联管理

> 参考：`feishu-binding-fixes.md` 第 7 点（Agent 创建/删除时飞书账号配置未同步）
>
> 飞书绑定踩坑教训：`agents.ts` 已经有 `feishu:initAccountConfig` 和 `feishu:deleteAccountConfig` 的调用，但 handler 没有实现就上线了。记忆模块应该从一开始就同步实现 lifecycle hook，避免重蹈覆辙。

---

## 6.1 Agent 创建时的记忆初始化

### 需要做什么

memory-lancedb-pro 的 scope 是**动态创建**的，首次写入时自动建立，无需预先初始化。

因此，**Agent 创建时无需额外操作**。

当 agent 首次对话并触发 `agent_end` 钩子时，autoCapture 会自动：
1. 从 `ctx.agentId` 获取 agent ID
2. 调用 `getDefaultScope(agentId)` 返回 `agent:<agentId>`
3. 在 `agent:<agentId>` scope 下存储记忆（scope 自动创建）

这与 standalone 安装文档中「3.1 Scope 自动创建机制」一致。

---

## 6.2 Agent 删除时的级联记忆删除

### 修改位置

`src/stores/agents.ts` 中的 agent 删除逻辑（对应 feishu 经验中的 `feishu:deleteAccountConfig` 调用位置）。

### 实现方案

```typescript
// src/stores/agents.ts - deleteAgent 函数内
// 在删除 agent 配置之前，先删除其记忆 scope

const deleteAgent = async (agentId: string) => {
  // Step 1: 删除记忆 scope（异步，不阻塞主流程）
  // 使用现有的 terminal:executeCommands IPC，无需新增 handler
  invokeIpc('terminal:executeCommands', {
    commands: [`openclaw memory-pro delete-bulk --scope agent:${agentId}`],
    timeout: 30000,
  }).catch((err) => {
    console.warn(`[deleteAgent] Memory cleanup failed for ${agentId}:`, err);
    // 非致命错误，不阻断 agent 删除流程
  });

  // Step 2: 删除飞书账号配置（现有逻辑）
  await invokeIpc('feishu:deleteAccountConfig', { agentId });

  // Step 3: 删除 Agent 本体（现有逻辑）
  // ...
};
```

### 设计决策

**为什么异步不阻塞？**

- 记忆删除是"尽力而为"操作，即使失败也不影响 agent 删除本身
- 用户体验上，UI 应立即响应删除操作，不需要等待记忆清理
- 如果记忆删除失败，残留的 `agent:<agentId>` scope 数据不会影响其他 agent（scope 隔离）

**如果需要同步确认**（如显示删除进度），可以改为：

```typescript
// 同步等待，适合显示"正在清理记忆..."状态
try {
  await invokeIpc('terminal:executeCommands', {
    commands: [`openclaw memory-pro delete-bulk --scope agent:${agentId}`],
    timeout: 30000,
  });
} catch (err) {
  // 记录日志但继续删除流程
  console.warn('Memory cleanup failed:', err);
}
```

---

## 6.3 需要在 agents.ts 中查找的位置

实际实现时，需要阅读 `src/stores/agents.ts` 找到：

1. **删除函数**：可能是 `deleteAgent`、`removeAgent` 或类似名称
2. **调用时机**：在删除 agent API 调用之前，插入记忆清理命令
3. **现有 feishu 调用**：`feishu:deleteAccountConfig` 的调用位置，紧邻此处插入记忆删除

**搜索关键词**：`feishu:deleteAccountConfig` 在 `agents.ts` 中的位置。

---

## 6.4 命令格式说明

```bash
# 删除指定 agent 的所有记忆
openclaw memory-pro delete-bulk --scope agent:<agentId>

# 示例
openclaw memory-pro delete-bulk --scope agent:data-cleaner
openclaw memory-pro delete-bulk --scope agent:legal-advisor
```

通过 `terminal:executeCommands` 时，框架会自动：
- 将 `openclaw memory-pro delete-bulk ...` 转换为 `node openclaw.mjs memory-pro delete-bulk ...`
- 注入 `OPENCLAW_HOME` 环境变量（确保操作正确的配置目录）

---

## 6.5 验证方法

删除 agent 后，验证记忆是否清理：

```bash
# 在 Git Bash 中
OPENCLAW_HOME="D:/TheClaw" node "D:/Code/ClawX/build/openclaw/openclaw.mjs" \
  memory-pro list --scope agent:<deleted-agentId>

# 预期：返回空列表或 "scope not found" 错误
```
