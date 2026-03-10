# 新增插件指南

本文档详细介绍如何在 ClawX 中新增一个插件，使其在应用程序启动时自动解压到 `D:\TheClaw\.openclaw\` 目录。

## 插件类型选择

根据插件用途，选择不同的打包方式：

| 类型 | 打包方式 | 示例 |
|------|----------|------|
| **Memory 插件** | 内置插件 | memory-lancedb-pro |
| **Channel 插件** | 打包到 OpenClaw | feishu, dingtalk, telegram |
| **独立 npm 包** | 第三方插件 | @soimy/dingtalk |

## 方式一：内置插件（推荐需要原生模块的插件）

适用于需要原生模块（如 LanceDB）或需要预装的插件。

### 步骤 1：创建插件源码目录

```
resources/plugins/<插件名>/
├── package.json
├── package-lock.json
├── index.ts
├── openclaw.plugin.json
├── cli.ts              # 可选
├── src/                # 可选
│   └── ...
└── skills/             # 可选
    └── ...
```

### 步骤 2：配置 package.json

```json
{
  "name": "my-custom-plugin",
  "version": "1.0.0",
  "description": "My custom plugin",
  "type": "module",
  "main": "index.ts",
  "dependencies": {
    "@lancedb/lancedb": "^0.26.2",
    "openai": "^6.21.0"
  },
  "openclaw": {
    "extensions": ["./index.ts"]
  }
}
```

### 步骤 3：配置 openclaw.plugin.json

```json
{
  "id": "my-custom-plugin",
  "name": "My Custom Plugin",
  "version": "1.0.0",
  "kind": "memory",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": {
        "type": "string",
        "description": "API Key for the service"
      },
      "dbPath": {
        "type": "string"
      }
    }
  },
  "required": ["apiKey"]
}
```

**关键字段：**
| 字段 | 说明 |
|------|------|
| `id` | 插件唯一标识符 |
| `kind` | 插件类型：`memory`, `context-engine`, `channel` 等 |
| `configSchema` | 配置项的 JSON Schema |
| `uiHints` | UI 提示（可选） |

### 步骤 4：实现入口文件

```typescript
// index.ts
import type { OpenClawPlugin } from 'openclaw';

export const plugin: OpenClawPlugin = {
  id: 'my-custom-plugin',
  name: 'My Custom Plugin',
  
  async onLoad(api) {
    // 插件加载逻辑
    console.log('My custom plugin loaded!');
  },
  
  async onEnable(config) {
    // 插件启用逻辑
  },
  
  async onDisable() {
    // 插件禁用逻辑
  },
};

export default plugin;
```

### 步骤 5：添加安装逻辑

编辑 `electron/utils/plugin-setup.ts`：

```typescript
// 1. 添加插件名称常量
const PLUGINS = [
  { name: 'memory-lancedb-pro', enabled: false },
  { name: 'my-custom-plugin', enabled: true },  // 新增
];

// 2. 实现安装函数
async function ensureMyCustomPluginInstalled(): Promise<void> {
  const PLUGIN_NAME = 'my-custom-plugin';
  const sourceDir = join(getResourcesDir(), 'plugins', PLUGIN_NAME);
  const targetDir = join(getOpenClawConfigDir(), 'workspace', 'plugins', PLUGIN_NAME);
  
  // 检查是否已安装
  if (existsSync(join(targetDir, 'node_modules', 'some-native-module'))) {
    return;
  }
  
  // 复制源码
  await cp(sourceDir, targetDir, { recursive: true, force: true });
  
  // 安装依赖
  await execAsync('npm ci --omit=dev', {
    cwd: targetDir,
    env: {
      ...process.env,
      HOME: getOpenClawHomeDir(),
      USERPROFILE: getOpenClawHomeDir(),
      OPENCLAW_HOME: getOpenClawHomeDir(),
    },
  });
}

// 3. 在应用启动时调用
export async function initializePlugins(): Promise<void> {
  await ensureMemoryPluginInstalled();
  await ensureMyCustomPluginInstalled();  // 新增
}
```

### 步骤 6：配置 openclaw.json

```typescript
async function ensurePluginConfig(): Promise<void> {
  const config = await readOpenClawConfig();
  
  // 添加插件路径
  if (!config.plugins.load) config.plugins.load = { paths: [] };
  config.plugins.load.paths.push(targetDir);
  
  // 添加插件条目
  if (!config.plugins.entries) config.plugins.entries = {};
  config.plugins.entries['my-custom-plugin'] = {
    enabled: true,
    config: {
      apiKey: '',
      dbPath: join(getOpenClawConfigDir(), 'my-custom-plugin', 'data'),
    },
  };
  
  await writeOpenClawConfig(config);
}
```

## 方式二：第三方插件（通过 npm 安装）

适用于已有 npm 包的插件。

### 步骤 1：在 bundle-openclaw-plugins.mjs 中注册

```javascript
const PLUGINS = [
  { npmName: '@soimy/dingtalk', pluginId: 'dingtalk' },
  { npmName: '@myorg/my-plugin', pluginId: 'my-plugin' },  // 新增
];
```

### 步骤 2：配置 after-pack.cjs

在打包后钩子中添加复制逻辑：

```javascript
// 复制插件到 extensions 目录
const pluginDir = join(__dirname, '..', 'build', 'openclaw-plugins', 'my-plugin');
const targetDir = join(resourcesPath, 'openclaw-plugins', 'my-plugin');

if (fs.existsSync(pluginDir)) {
  fs.cpSync(pluginDir, targetDir, { recursive: true });
}
```

### 步骤 3：按需安装

在 IPC handler 中实现按需安装逻辑：

```typescript
// electron/main/ipc-handlers.ts
ipcMain.handle('my-plugin:install', async () => {
  const sourceDir = join(process.resourcesPath, 'openclaw-plugins', 'my-plugin');
  const targetDir = join(getOpenClawConfigDir(), 'extensions', 'my-plugin');
  
  cpSync(sourceDir, targetDir, { recursive: true, dereference: true });
});
```

## 方式三：打包到 OpenClaw 主包

适用于 OpenClaw 官方插件（如 feishu、telegram）。

### 步骤 1：在 OpenClaw 仓库中创建扩展

```
extensions/my-extension/
├── package.json
├── index.ts
├── openclaw.plugin.json
└── src/
    └── ...
```

### 步骤 2：配置 OpenClaw package.json

```json
{
  "name": "@openclaw/my-extension",
  "version": "2026.3.8",
  "dependencies": {
    "some-package": "^1.0.0"
  },
  "openclaw": {
    "extensions": ["./index.ts"]
  }
}
```

### 步骤 3：重新打包 OpenClaw

```bash
# 重新运行 bundle-openclaw.mjs
zx scripts/bundle-openclaw.mjs
```

`bundle-openclaw.mjs` 会自动扫描 `extensions/*/package.json` 并收集依赖。

## 环境变量注意事项

无论使用哪种方式，在执行 npm 安装或运行 OpenClaw CLI 时都必须设置：

```typescript
env: {
  HOME: getOpenClawHomeDir(),           // D:\TheClaw
  USERPROFILE: getOpenClawHomeDir(),    // D:\TheClaw
  OPENCLAW_HOME: getOpenClawHomeDir(),  // D:\TheClaw
}
```

## 验证插件安装

### 1. 检查文件是否复制

```bash
ls D:\TheClaw\.openclaw\workspace\plugins\my-custom-plugin
ls D:\TheClaw\.openclaw\extensions\my-plugin
```

### 2. 检查配置文件

```bash
cat D:\TheClaw\.openclaw\openclaw.json | jq '.plugins'
```

### 3. 运行 OpenClaw doctor

```bash
$env:OPENCLAW_HOME="D:\TheClaw"
node resources\openclaw\openclaw.mjs doctor
```

## 相关文档

- [OpenClaw 核心打包流程](./02-openclaw-bundling.md)
- [插件打包机制](./03-plugin-bundling.md)
- [运行时环境变量详解](./04-runtime-environment.md)
- [插件安装到 .openclaw 目录](./05-plugin-installation.md)
