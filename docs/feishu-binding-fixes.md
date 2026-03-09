# 飞书绑定问题修复总结

## 修复的问题

### 1. 飞书插件依赖缺失 (`@larksuiteoapi/node-sdk`)

**现象**：`openclaw doctor` 报 `feishu: failed to load plugin: Error: Cannot find module '@larksuiteoapi/node-sdk'`

**根因**：`scripts/bundle-openclaw.mjs` 在 Windows 上执行 BFS 依赖收集时，`@larksuiteoapi/node-sdk` 在 `build/openclaw/node_modules/` 中仍为指向 pnpm 虚拟存储的符号链接，而非真实文件拷贝。符号链接在运行时环境中无法正确解析。

**修复**：手动删除符号链接，使用 `cp -rL` 从 pnpm 存储复制真实文件：

```bash
rm "build/openclaw/node_modules/@larksuiteoapi/node-sdk"
cp -rL "node_modules/.pnpm/@larksuiteoapi+node-sdk@1.59.0/node_modules/@larksuiteoapi/node-sdk" \
       "build/openclaw/node_modules/@larksuiteoapi/node-sdk"
```

**注意**：`build/openclaw/node_modules` 中还有其他包也是符号链接。如需彻底修复，应停止网关后重新运行 `pnpm zx scripts/bundle-openclaw.mjs`（网关运行时该目录会被锁定导致 EBUSY）。

---

### 2. `OPENCLAW_HOME` 环境变量缺失（关键问题）

**现象**：飞书绑定时 `openclaw config set` 写入了 `C:\Users\<user>\.openclaw\openclaw.json`（默认路径），而非项目指定的 `D:\TheClaw\.openclaw\openclaw.json`。

**根因**：`paths.ts` 中 `getOpenClawHomeDir()` 正确返回 `D:\TheClaw`，Gateway Manager 启动网关进程时也正确传递了 `OPENCLAW_HOME`。但以下两处调用 `exec()` 时遗漏了该环境变量：

| 文件 | 函数 | 用途 |
|------|------|------|
| `electron/main/ipc-handlers.ts` | `terminal:executeCommands` | 执行 `openclaw config set` 等 CLI 命令 |
| `electron/utils/channel-config.ts` | `validateChannelConfig` | 执行 `openclaw doctor --json` 校验配置 |

**修复**：

```typescript
// ipc-handlers.ts - terminal:executeCommands
const { getOpenClawResolvedDir, getOpenClawHomeDir } = await import('../utils/paths');
exec(cmdStr, {
  cwd: openclawDir,
  env: { ...process.env, FORCE_COLOR: '0', OPENCLAW_HOME: getOpenClawHomeDir() },
  //                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 新增
});

// channel-config.ts - validateChannelConfig
exec(`node openclaw.mjs doctor --json 2>&1`, {
  cwd: openclawPath,
  env: { ...process.env, OPENCLAW_HOME: getOpenClawHomeDir() },
  //                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 新增
});
```

**经验教训**：凡是通过 `child_process.exec/spawn` 调用 OpenClaw CLI 的地方，都必须传递 `OPENCLAW_HOME` 环境变量。可全局搜索 `exec(` 或 `spawn(` 结合 `openclaw` 关键字排查遗漏。Gateway Manager 中已正确设置，可作为参考模板。

---

### 3. `allowFrom` 数组值被 CLI 存为字符串

**现象**：网关启动崩溃，报错 `TypeError: list?.some is not a function`

**根因**：`openclaw config set channels.feishu.allowFrom '["*"]'` 会将值存为字符串 `"[*]"` 而非 JSON 数组 `["*"]`。OpenClaw 的 `hasWildcard()` 函数对该字段调用 `.some()` 时因类型不匹配而崩溃。

**修复**：
- 从 `buildConfigCommands` 中移除 `allowFrom` 的 CLI 设置命令
- 改为在 CLI 命令执行后，通过 IPC 调用 `channel:saveConfig` 写入，利用 `channel-config.ts` 中 `saveChannelConfig` 的逻辑确保数据类型正确：

```typescript
// agentFeishu.ts - startBinding
await invokeIpc('channel:saveConfig', 'feishu', {
  enabled: true,
  dmPolicy: 'open',
  allowFrom: ['*'],
});
```

**经验教训**：`openclaw config set` CLI 只能设置标量值（字符串、数字、布尔），不能设置数组或对象。对于复杂类型的配置项，应通过 `channel-config.ts` 的文件 I/O 接口（`saveChannelConfig` / `saveFeishuAccountConfig`）直接操作 JSON。

---

### 4. 缺少 `dmPolicy` / `allowFrom` 导致用户无法对话

**现象**：飞书机器人回复 "access not configured"，要求用户提供配对码。

**根因**：`buildConfigCommands` 只设置了 `accounts.<agentId>` 下的凭证字段，未设置频道级别的 `dmPolicy: "open"` 和 `allowFrom: ["*"]`。没有这两个字段，OpenClaw 默认将所有用户视为未授权。

**修复**：在绑定流程中增加 `dmPolicy` 和 `allowFrom` 的设置（见上方第 3 点）。

---

### 5. 多 Agent 串台（路由绑定缺失）

**现象**：给第二个飞书机器人发消息，回复的却是第一个 Agent（main）的内容。

**根因**：`startBinding` 流程只写入了账号凭证（`channels.feishu.accounts.<agentId>`），没有在 `bindings` 数组里创建路由规则。`approvePairing` 步骤才创建 binding，但由于第二个机器人收不到配对码（消息被错误路由到 main），导致 `approvePairing` 从未被调用。

**修复**：新增 `feishu:ensureBinding` IPC handler，在 `startBinding` 保存配置后立即写入路由绑定：

```typescript
// ipc-handlers.ts
ipcMain.handle('feishu:ensureBinding', async (_, { agentId }) => {
  const config = await readOpenClawConfig();
  if (!config.bindings) config.bindings = [];
  const exists = config.bindings.some(
    (b) => b.agentId === agentId && b.match?.channel === 'feishu'
  );
  if (!exists) {
    config.bindings.push({
      type: 'route',
      agentId,
      match: { channel: 'feishu', accountId: agentId },
    });
    await writeOpenClawConfig(config);
  }
});

// agentFeishu.ts - startBinding，在 channel:saveConfig 之后
await invokeIpc('feishu:ensureBinding', { agentId });
```

**经验教训**：路由绑定（`bindings`）和账号凭证（`accounts`）是两个独立的配置。配置凭证不会自动建立路由，必须显式写入 binding。

---

### 6. `openclaw doctor --fix` 在无 TTY 环境下失败

**现象**：绑定流程报错 `Command failed: node openclaw.mjs doctor --fix`。

**根因**：`doctor --fix` 是交互式 TUI 命令（使用 clack prompts），通过 `child_process.exec()` 运行时没有 TTY，在某些配置状态下会直接以非零状态码退出。

**修复**：从 `buildConfigCommands` 中移除 `openclaw doctor --fix`。绑定流程现在通过专用 IPC（`feishu:ensureBinding`、`channel:saveConfig`）直接管理配置，不再需要 doctor 来修正。

**经验教训**：`openclaw doctor --fix` 是运维诊断工具，不适合嵌入自动化脚本流程。

---

### 7. Agent 创建/删除时飞书账号配置未同步

**现象**：创建新 Agent 时，`feishu:initAccountConfig` IPC 调用失败（handler 不存在）；删除 Agent 时，飞书账号配置和路由绑定残留。

**根因**：`src/stores/agents.ts` 已有调用 `feishu:initAccountConfig` 和 `feishu:deleteAccountConfig` 的代码，但 `electron/main/ipc-handlers.ts` 中从未实现这两个 handler。

**修复**：实现两个 handler：

```typescript
// feishu:initAccountConfig - Agent 创建时初始化空账号
accounts[agentId] = { enabled: false, paired: false };

// feishu:deleteAccountConfig - Agent 删除时清理
delete accounts[agentId];
config.bindings = config.bindings.filter(
  (b) => !(b.agentId === agentId && b.match?.channel === 'feishu')
);
```

同时在 `electron/preload/index.ts` 的白名单中加入三个新 IPC：`feishu:ensureBinding`、`feishu:initAccountConfig`、`feishu:deleteAccountConfig`。

---

### 8. Agent ID 大小写不一致导致账号 key 错误

**现象**：用户在"员工标识"输入框中输入 `Trump`，`feishu:initAccountConfig` 创建的账号 key 为 `Trump`，但 gateway 内部将 agent id 统一存为小写 `trump`，导致 binding 匹配不到对应账号。

**根因**：`AgentFormDialog.tsx` 的 agentId 输入框允许大写字母，未做转换就传给下游使用。

**修复**：在输入框的 onChange 中强制转为小写：

```tsx
// AgentFormDialog.tsx
onChange={(e) => setAgentId(e.target.value.toLowerCase())}
```

---

## 环境变量速查

在 ClawX 项目中，以下环境变量在调用 OpenClaw CLI 时需要注意：

| 环境变量 | 用途 | 获取方式 |
|----------|------|----------|
| `OPENCLAW_HOME` | OpenClaw 配置根目录（`.openclaw` 的父目录） | `getOpenClawHomeDir()` from `electron/utils/paths.ts` |
| `OPENCLAW_NO_RESPAWN` | 防止 OpenClaw 在 utility process 内自行重启 | 硬编码 `'1'` |
| `OPENCLAW_EMBEDDED_IN` | 标识嵌入环境 | 硬编码 `'ClawX'` |
| `FORCE_COLOR` | 关闭 CLI 彩色输出（方便解析） | 硬编码 `'0'` |

**排查清单**：新增任何通过 `exec()` / `spawn()` / `utilityProcess.fork()` 调用 OpenClaw 的代码时，务必检查是否传递了 `OPENCLAW_HOME`。参考 `electron/gateway/manager.ts` 中的 `env` 配置作为标准模板。

---

## 涉及的文件

| 文件 | 修改内容 |
|------|----------|
| `electron/main/ipc-handlers.ts` | `terminal:executeCommands` 增加 `OPENCLAW_HOME`；新增 `feishu:ensureBinding`、`feishu:initAccountConfig`、`feishu:deleteAccountConfig` handler |
| `electron/utils/channel-config.ts` | `validateChannelConfig` 增加 `OPENCLAW_HOME` 环境变量 |
| `electron/preload/index.ts` | 白名单加入三个新 feishu IPC |
| `src/stores/agentFeishu.ts` | 移除 `openclaw doctor --fix`；`startBinding` 中调用 `feishu:ensureBinding` |
| `src/components/common/AgentFormDialog.tsx` | agentId 输入框强制小写 |
| `build/openclaw/node_modules/@larksuiteoapi/node-sdk` | 符号链接替换为真实文件（本地修复，不入 git） |
| `electron/main/ipc-handlers.ts` | `feishu:markPaired` 改写独立状态文件；`feishu:getAgentConfig` 从独立文件读取；`feishu:initAccountConfig` 移除 `paired: false` 写入 |
| `src/stores/agentFeishu.ts` | `buildConfigCommands` 移除 `openclaw config set ...paired false` |

---

## 第二轮修复（2026-03-09）

### 9. `paired` 字段破坏飞书 Zod 严格校验，导致第二个机器人绑定失败

**现象**：绑定第一个飞书机器人成功后，再绑定第二个时，第一条命令就失败：
```
[错误] Command failed: "ClawX.exe" "openclaw.mjs" config set channels.feishu.enabled true
```
该命令与第一次绑定完全相同，却返回非零退出码。

**根因**：飞书插件的 Zod schema（`FeishuAccountConfigSchema`）使用了 `.strict()` 模式，**拒绝任何未在 schema 中定义的字段**。

ClawX 在绑定流程中向 `channels.feishu.accounts.<agentId>` 写入了以下字段：

| 字段 | 来源 | 是否在 feishu schema 中 |
|------|------|------------------------|
| `enabled` | `openclaw config set` | ✅ 合法 |
| `appId` | `openclaw config set` | ✅ 合法 |
| `appSecret` | `openclaw config set` | ✅ 合法 |
| `paired` | `openclaw config set` + `feishu:markPaired` | ❌ **非法** |
| `pairedAt` | `feishu:markPaired` | ❌ **非法** |

写入 `paired: false` 后，`openclaw.json` 变为"无效配置"。第二次绑定的第一条 `openclaw config set` 命令在执行前调用 `loadValidConfig()` 读取并验证配置，Zod strict 验证失败 → 进程以非零码退出 → `"Command failed: ..."`。

**修复**：将 `paired`、`pairedAt`、`feishuBotName` 从 openclaw 配置中彻底剥离，改存到 ClawX 自管理的独立文件 `{userData}/feishu-pairing.json`：

```typescript
// 读取配对状态（不走 openclaw 配置）
async function readFeishuPairingState() { ... }  // 读 feishu-pairing.json
async function writeFeishuPairingState(state) { ... }  // 写 feishu-pairing.json

// feishu:markPaired：只写 feishu-pairing.json，不碰 openclaw.json
pairingState[agentId] = { paired: true, pairedAt: new Date().toISOString() };
await writeFeishuPairingState(pairingState);

// feishu:getAgentConfig：从两处合并
const acct = openclaw.channels.feishu.accounts[agentId]; // 凭证来自 openclaw.json
const pairing = pairingState[agentId];                   // 状态来自 feishu-pairing.json

// buildConfigCommands：移除 paired 行
// 不再执行 openclaw config set ...accounts.agentId.paired false
```

**已有损坏配置的迁移**：如果 `openclaw.json` 中已存在 `paired`/`pairedAt` 字段（由旧版本写入），下次 `openclaw config set` 仍会失败。需手动从 JSON 文件中删除这些字段，或通过解绑后重新绑定触发清理。

**经验教训**：凡是写入 openclaw 配置的字段，必须先确认它在对应 Zod schema 中存在（且不受 `.strict()` 限制）。ClawX 内部的状态追踪字段（如"是否已配对"）应存储在 ClawX 自己的数据目录（`app.getPath('userData')`）中，而非 openclaw 的配置文件。

---

### 10. 飞书配对免输验证码（行为观察，非 Bug）

**现象**：绑定第一个和第二个飞书机器人时，均无需输入配对码，直接即可收发消息。

**原因**：这是飞书 SDK 的会话复用机制。在多个 openclaw 项目中使用过同一个 `appId`/`appSecret` 后，飞书服务端已建立了信任关系。即便是新的 `.openclaw` 配置目录，同一 App 凭证的 WebSocket 长连接会被识别为已知客户端，跳过配对握手。

**结论**：配对码流程对于首次部署某个 App ID 的用户仍然有效，但对于之前已配对过的 App ID，飞书会自动恢复会话。ClawX 的 UI 不需要为此做特殊处理——有配对码时走配对流程，没有时直接可用。
