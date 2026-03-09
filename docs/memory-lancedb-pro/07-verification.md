# 07 - 验证与测试清单

---

## 7.1 阶段一：插件安装验证

完成 [02](./02-plugin-installation.md) 和 [03](./03-openclaw-config.md) 后执行：

```bash
# 设置环境变量（在当前终端会话）
export OPENCLAW_HOME="D:/TheClaw"

# 检查插件是否已注册
node "D:/Code/ClawX/build/openclaw/openclaw.mjs" plugins info memory-lancedb-pro
```

**预期输出**（包含以下关键行）：
```
memory-lancedb-pro@x.x.x: plugin registered
Status: loaded
Tools: memory_recall, memory_store, memory_forget, memory_update, self_improvement_log
```

**如果失败**：
- 检查 `openclaw.json` 中 `plugins.load.paths` 路径是否正确
- 检查 `npm install` 是否完成（`node_modules` 目录是否存在）
- 查看 gateway 日志：`node "D:/Code/ClawX/build/openclaw/openclaw.mjs" gateway logs`

---

## 7.2 阶段二：autoCapture 记忆存储验证

在 ClawX 中选择任意 agent，发送几条消息后：

```bash
export OPENCLAW_HOME="D:/TheClaw"

# 查看该 agent 的记忆条目数
node "D:/Code/ClawX/build/openclaw/openclaw.mjs" memory-pro list --scope agent:<agentId>

# 示例
node "D:/Code/ClawX/build/openclaw/openclaw.mjs" memory-pro list --scope agent:data-cleaner
```

**预期**：返回包含对话摘要的记忆条目列表。

**如果为空**：
- 确认 `autoCapture: true` 已配置
- 确认 `sessionStrategy: "systemSessionMemory"` 已配置
- 查看对话时 gateway 日志中是否有 `agent_end` 事件处理的相关输出
- 确认 agent 发送的消息有实质内容（`autoRecallMinLength: 8` 要求至少 8 个字符）

---

## 7.3 阶段三：记忆 scope 隔离验证

与两个不同 agent 分别对话后：

```bash
# Agent 1 的记忆
node "D:/Code/ClawX/build/openclaw/openclaw.mjs" memory-pro list --scope agent:data-cleaner

# Agent 2 的记忆
node "D:/Code/ClawX/build/openclaw/openclaw.mjs" memory-pro list --scope agent:copywriter
```

**验证点**：
- 两个 scope 的记忆内容完全隔离，互不影响
- Agent 1 的专属对话内容只出现在 `agent:data-cleaner` scope 中

---

## 7.4 阶段四：级联删除验证

在 ClawX UI 中删除一个 agent（如 `test-agent`），然后：

```bash
# 验证记忆已删除
node "D:/Code/ClawX/build/openclaw/openclaw.mjs" memory-pro list --scope agent:test-agent
```

**预期**：返回空列表或 scope 不存在的提示。

**如果记忆未删除**：
- 检查 `src/stores/agents.ts` 中是否正确调用了删除命令
- 检查 `terminal:executeCommands` 是否收到了正确的命令格式
- 查看 electron 主进程日志是否有报错

---

## 7.5 阶段五：IPC Handler 验证（开发环境）

在 Electron DevTools Console 中直接测试 IPC：

```javascript
// 检查插件状态
const status = await window.electron.ipcRenderer.invoke('memory:getPluginStatus');
console.log(status);
// 预期: { success: true, installed: true, enabled: true }

// 手动触发记忆清理（测试用）
const result = await window.electron.ipcRenderer.invoke('terminal:executeCommands', {
  commands: ['openclaw memory-pro stats'],
  timeout: 10000,
});
console.log(result.output);
```

---

## 7.6 全局检查清单

| 检查项 | 验证方法 | 状态 |
|--------|---------|------|
| 插件文件存在 | `ls D:/TheClaw/.openclaw/workspace/plugins/memory-lancedb-pro/` | ⬜ |
| npm install 完成 | `ls D:/TheClaw/.openclaw/workspace/plugins/memory-lancedb-pro/node_modules/` | ⬜ |
| openclaw.json 包含 plugins 配置 | 查看 JSON 文件 | ⬜ |
| Gateway 启动日志包含插件注册 | `openclaw gateway logs` | ⬜ |
| 对话后记忆自动存储 | `memory-pro list --scope agent:<id>` | ⬜ |
| 不同 agent 记忆隔离 | 对比两个 agent 的 scope 内容 | ⬜ |
| 删除 agent 时记忆级联删除 | 删除后查询 scope 为空 | ⬜ |
| preload.ts 白名单包含新 IPC | 检查 `index.ts` 中的 channels 列表 | ⬜ |

---

## 7.7 常用诊断命令

```bash
export OPENCLAW_HOME="D:/TheClaw"
OC="node D:/Code/ClawX/build/openclaw/openclaw.mjs"

# 查看所有 scope 的统计
$OC memory-pro stats

# 搜索记忆
$OC memory-pro search "关键词" --scope agent:data-cleaner

# 导出备份
$OC memory-pro export --scope agent:data-cleaner --output backup.json

# 列出最近记忆
$OC memory-pro list --scope global --limit 10

# 查看 gateway 实时日志
$OC gateway logs --follow
```

---

## 7.8 已知问题预防

| 问题 | 预防措施 |
|------|---------|
| 写入默认 `~/.openclaw` 而非 `D:\TheClaw` | 确认所有 `exec()` 调用都通过 `terminal:executeCommands`，该 handler 已注入 `OPENCLAW_HOME` |
| Windows 符号链接导致 `Cannot find module` | 验证 `node_modules` 中关键包是否为真实目录，不是 symlink |
| gateway 重启后插件未加载 | 检查 `openclaw.json` JSON 格式是否合法（无尾随逗号等） |
| agent 记忆混入其他 agent | 确认 `sessionStrategy: "systemSessionMemory"` 已配置 |
| `memory-pro delete-bulk` 未找到命令 | 先运行 `node openclaw.mjs plugins info memory-lancedb-pro` 确认插件已加载 |
