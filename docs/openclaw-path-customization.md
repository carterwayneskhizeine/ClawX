# OpenClaw 配置路径自定义指南

## 概述

本文档记录了将 OpenClaw 默认配置路径从 `~/.openclaw` 修改为 `D:\TheClaw\.openclaw` 的所有相关修改，以及端口从 `18789` 修改为 `18766` 的修改。

## 修改内容

### 1. 端口配置

#### 环境变量

**文件**: `.env.example`

**修改前**:
```env
OPENCLAW_GATEWAY_PORT=18789
```

**修改后**:
```env
OPENCLAW_GATEWAY_PORT=18766
```

#### 前端设置默认端口

**文件**: `src/stores/settings.ts`

**修改前**:
```typescript
gatewayPort: 18789,
```

**修改后**:
```typescript
gatewayPort: 18766,
```

#### Gateway 状态默认端口

**文件**: `src/stores/gateway.ts`

**修改前**:
```typescript
status: {
  state: 'stopped',
  port: 18789,
},
```

**修改后**:
```typescript
status: {
  state: 'stopped',
  port: 18766,
},
```

#### API 客户端回退端口

**文件**: `src/lib/api-client.ts`

**修改前**:
```typescript
const port = typeof status?.port === 'number' && status.port > 0 ? status.port : 18789;
```

**修改后**:
```typescript
const port = typeof status?.port === 'number' && status.port > 0 ? status.port : 18766;
```

#### 持久化存储默认端口

**文件**: `electron/utils/store.ts`

**修改前**:
```typescript
gatewayPort: 18789,
```

**修改后**:
```typescript
gatewayPort: 18766,
```

#### 配置常量

**文件**: `electron/utils/config.ts`

**修改前**:
```typescript
/** OpenClaw Gateway port */
OPENCLAW_GATEWAY: 18789,
```

**修改后**:
```typescript
/** OpenClaw Gateway port */
OPENCLAW_GATEWAY: 18766,
```

#### IPC 处理器

**文件**: `electron/main/ipc-handlers.ts` (2处)

**修改前**:
```typescript
const port = status.port || 18789;
```

**修改后**:
```typescript
const port = status.port || 18766;
```

#### Web 请求拦截器

**文件**: `electron/main/index.ts`

**修改前**:
```typescript
{ urls: ['http://127.0.0.1:18789/*', 'http://localhost:18789/*'] },
```

**修改后**:
```typescript
{ urls: ['http://127.0.0.1:18766/*', 'http://localhost:18766/*'] },
```

#### 测试文件

**文件**: `tests/unit/stores.test.ts` (4处)

**修改前**:
```typescript
gatewayPort: 18789,
// ...
status: { state: 'stopped', port: 18789 },
// ...
expect(state.status.port).toBe(18789);
// ...
setStatus({ state: 'running', port: 18789, pid: 12345 });
```

**修改后**:
```typescript
gatewayPort: 18766,
// ...
status: { state: 'stopped', port: 18766 },
// ...
expect(state.status.port).toBe(18766);
// ...
setStatus({ state: 'running', port: 18766, pid: 12345 });
```

---

### 2. 核心路径函数

**文件**: `electron/utils/paths.ts`

#### 新增函数

```typescript
/**
 * Get OpenClaw home directory (parent of .openclaw config dir)
 */
export function getOpenClawHomeDir(): string {
  return 'D:\\TheClaw';
}
```

#### 修改函数

```typescript
/**
 * Get OpenClaw config directory
 */
export function getOpenClawConfigDir(): string {
  return 'D:\\TheClaw\\.openclaw';
}
```

---

### 3. Gateway 环境变量

**文件**: `electron/gateway/manager.ts`

#### 添加的环境变量

```typescript
const forkEnv: Record<string, string | undefined> = {
  ...baseEnv,
  PATH: finalPath,
  ...providerEnv,
  ...uvEnv,
  ...proxyEnv,
  OPENCLAW_GATEWAY_TOKEN: gatewayToken,
  OPENCLAW_SKIP_CHANNELS: '',
  CLAWDBOT_SKIP_CHANNELS: '',
  HOME: getOpenClawHomeDir(),
  USERPROFILE: getOpenClawHomeDir(),
  OPENCLAW_HOME: getOpenClawHomeDir(),
  // Prevent OpenClaw from respawning itself inside the utility process
  OPENCLAW_NO_RESPAWN: '1',
};
```

**说明**:
- `OPENCLAW_HOME`: OpenClaw 使用的主目录
- `HOME`: Unix 风格主目录（用于跨平台兼容）
- `USERPROFILE`: Windows 主目录
- 所有三个变量都指向 `D:\TheClaw`

---

### 4. CLI 工具环境变量

**文件**: `electron/utils/openclaw-cli.ts`

#### 添加的环境变量

```typescript
env: {
  ...process.env,
  ELECTRON_RUN_AS_NODE: '1',
  OPENCLAW_NO_RESPAWN: '1',
  OPENCLAW_EMBEDDED_IN: 'ClawX',
  OPENCLAW_HOME: getOpenClawHomeDir(),
}
```

---

### 5. 配置文件路径更新

以下文件中的配置文件路径已更新为使用 `getOpenClawConfigDir()`:

#### `electron/utils/skill-config.ts`

```typescript
import { getOpenClawDir, getOpenClawConfigDir, getOpenClawSkillsDir } from './paths';

const OPENCLAW_CONFIG_PATH = join(getOpenClawConfigDir(), 'openclaw.json');
```

#### `electron/utils/openclaw-workspace.ts`

```typescript
import { getResourcesDir, getOpenClawConfigDir } from './paths';

const openclawDir = getOpenClawConfigDir();
```

#### `electron/utils/openclaw-auth.ts`

```typescript
import { getOpenClawConfigDir } from './paths';

function getAuthProfilesPath(agentId = 'main'): string {
  return join(getOpenClawConfigDir(), 'agents', agentId, 'agent', AUTH_PROFILE_FILENAME);
}

const OPENCLAW_CONFIG_PATH = join(getOpenClawConfigDir(), 'openclaw.json');
```

#### `electron/utils/channel-config.ts`

```typescript
import { getOpenClawResolvedDir, getOpenClawConfigDir } from './paths';

const OPENCLAW_DIR = getOpenClawConfigDir();
const CONFIG_FILE = join(OPENCLAW_DIR, 'openclaw.json');
```

#### `electron/utils/whatsapp-login.ts`

```typescript
import { getOpenClawDir, getOpenClawResolvedDir, getOpenClawConfigDir } from './paths';

const authDir = join(getOpenClawConfigDir(), 'credentials', 'whatsapp', accountId);
```

#### `electron/main/ipc-handlers.ts`

```typescript
const targetDir = join(getOpenClawConfigDir(), 'extensions', 'dingtalk');
mkdirSync(join(getOpenClawConfigDir(), 'extensions'), { recursive: true });
const OUTBOUND_DIR = join(getOpenClawConfigDir(), 'media', 'outbound');
```

---

## 配置文件

OpenClaw 配置文件位于：`D:\TheClaw\.openclaw\openclaw.json`

**重要提示**:

1. **避免使用 plugins 配置**：如果配置文件中包含 `plugins` 部分，可能会导致 Gateway 启动失败（例如 `memory-core` 插件找不到的错误）。

2. **最小化配置**：如果遇到启动问题，可以使用最小化配置：

```json
{
  "commands": {
    "restart": true
  },
  "gateway": {
    "auth": {
      "mode": "token",
      "token": "your-gateway-token"
    },
    "mode": "local"
  },
  "browser": {
    "enabled": true,
    "defaultProfile": "openclaw"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "minimax-portal/MiniMax-M2.5",
        "fallbacks": []
      }
    }
  },
  "models": {
    "providers": {
      "minimax-portal": {
        "baseUrl": "https://api.minimaxi.com/anthropic",
        "api": "anthropic-messages",
        "models": [
          {
            "id": "MiniMax-M2.5",
            "name": "MiniMax-M2.5"
          }
        ],
        "apiKey": "minimax-oauth",
        "authHeader": true
      }
    }
  }
}
```

3. **需要插件时**：如果确实需要启用某个插件，可以添加：

```json
"plugins": {
  "entries": {
    "plugin-name": {
      "enabled": true
    }
  }
}
```

---

## 目录结构

```
D:\TheClaw\
└── .openclaw\
    ├── agents\
    │   └── main\
    │       └── agent\
    │           ├── auth-profiles.json
    │           └── models.json
    ├── credentials\
    ├── extensions\
    ├── media\
    ├── openclaw.json
    ├── skills\
    └── workspace\
```

---

## 故障排除

### Gateway 启动失败

如果 Gateway 启动失败并显示以下错误：

```
- plugins: plugin: unsafe plugin manifest path
- plugins.slots.memory: plugin not found: memory-core
- Config invalid
```

**解决方案**：从 `D:\TheClaw\.openclaw\openclaw.json` 中移除或注释掉 `plugins` 部分。

### AI 对话时找不到 API Key

如果出现以下错误：

```
No API key found for provider "anthropic". Auth store: C:\Users\用户名\.openclaw\agents\main\agent\auth-profiles.json
```

**解决方案**：
1. 确保 Gateway 使用了正确的环境变量（`OPENCLAW_HOME`、`HOME`、`USERPROFILE`）
2. 重启应用
3. 检查日志中 Gateway 的启动参数是否包含正确的环境变量

### 配置文件路径未更新

如果发现某些模块仍在使用旧路径：

1. 使用 `grep` 搜索 `homedir()` 或 `~/.openclaw` 的使用
2. 将硬编码路径替换为调用 `getOpenClawConfigDir()` 或 `getOpenClawHomeDir()`

---

## 测试命令

### 类型检查

```bash
pnpm run typecheck
```

### Lint 检查

```bash
pnpm run lint
```

### 启动应用

```bash
pnpm dev
```

---

## 参考资料

- OpenClaw 官方文档: https://docs.openclaw.ai
- OpenClaw GitHub: https://github.com/openclaw/openclaw

---

## 修改历史

| 日期 | 版本 | 修改内容 |
|------|------|----------|
| 2026-03-08 | 0.1.23 | 初始版本：端口改为 18766，配置路径改为 D:\TheClaw\.openclaw |
