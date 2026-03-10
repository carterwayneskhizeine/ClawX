# 插件打包机制

ClawX 支持两种类型的插件打包方式：
1. **第三方插件** - 通过 `bundle-openclaw-plugins.mjs` 打包
2. **内置插件** - 预装在 `resources/plugins/` 目录

## 第三方插件打包

### bundle-openclaw-plugins.mjs

此脚本将第三方 npm 插件打包到 `build/openclaw-plugins/` 目录。

**当前支持的插件：**
```javascript
const PLUGINS = [
  { npmName: '@soimy/dingtalk', pluginId: 'dingtalk' },
];
```

### 打包流程

#### 1. 复制插件源码

```javascript
const realPluginPath = fs.realpathSync(pkgPath);
const outputDir = path.join(OUTPUT_ROOT, pluginId);
fs.cpSync(realPluginPath, outputDir, { recursive: true, dereference: true });
```

#### 2. 收集传递依赖

```javascript
// 从 pnpm 虚拟存储收集依赖
const queue = [];
const collected = new Map();

queue.push({ nodeModulesDir: rootVirtualNM, skipPkg: npmName });

// BFS 遍历
while (queue.length > 0) {
  const { nodeModulesDir, skipPkg } = queue.shift();
  for (const { name, fullPath } of listPackages(nodeModulesDir)) {
    // 跳过 peerDependencies（由 host 提供）
    if (SKIP_PACKAGES.has(name)) continue;
    
    collected.set(realPath, name);
    
    // 递归处理传递依赖
    const depVirtualNM = getVirtualStoreNodeModules(realPath);
    queue.push({ nodeModulesDir: depVirtualNM, skipPkg: name });
  }
}
```

#### 3. 复制依赖到插件目录

```javascript
const outputNodeModules = path.join(outputDir, 'node_modules');
fs.mkdirSync(outputNodeModules, { recursive: true });

for (const [realPath, pkgName] of collected) {
  const dest = path.join(outputNodeModules, pkgName);
  fs.cpSync(realPath, dest, { recursive: true, dereference: true });
}
```

### 输出结构

```
build/openclaw-plugins/
└── dingtalk/
    ├── package.json
    ├── index.ts
    ├── openclaw.plugin.json
    └── node_modules/
        ├── axios/
        ├── crypto/
        └── ...
```

### after-pack.cjs 处理

打包后钩子会将插件从 `build/openclaw-plugins/` 复制到最终输出：

```javascript
// 从打包资源安装到 ~/.openclaw/extensions/
const sourceDir = join(process.resourcesPath, 'openclaw-plugins', 'dingtalk');
cpSync(sourceDir, targetDir, { recursive: true, dereference: true });
```

目标路径：`D:\TheClaw\.openclaw\extensions\dingtalk\`

## 内置插件打包

某些插件直接预装在 `resources/plugins/` 目录，不通过 npm 安装。

### memory-lancedb-pro 示例

**源码位置：** `resources/plugins/memory-lancedb-pro/`

**目录结构：**
```
resources/plugins/memory-lancedb-pro/
├── package.json           <- npm 包配置
├── package-lock.json     <- 依赖锁定
├── index.ts              <- 入口文件
├── openclaw.plugin.json  <- 插件清单
├── cli.ts                <- CLI 工具
├── src/                  <- 源代码
│   ├── embedder.ts
│   ├── retriever.ts
│   └── ...
└── skills/               <- 技能文件
    └── lesson/
        └── SKILL.md
```

### package.json 配置

```json
{
  "name": "memory-lancedb-pro",
  "version": "1.1.0",
  "description": "OpenClaw enhanced LanceDB memory plugin...",
  "type": "module",
  "main": "index.ts",
  "dependencies": {
    "@lancedb/lancedb": "^0.26.2",
    "@sinclair/typebox": "0.34.48",
    "openai": "^6.21.0"
  },
  "openclaw": {
    "extensions": ["./index.ts"]
  }
}
```

### openclaw.plugin.json 配置

```json
{
  "id": "memory-lancedb-pro",
  "name": "Memory (LanceDB Pro)",
  "version": "1.1.0",
  "kind": "memory",
  "configSchema": {
    "type": "object",
    "properties": {
      "embedding": {
        "type": "object",
        "required": ["apiKey"]
      },
      "dbPath": { "type": "string" },
      "autoCapture": { "type": "boolean" },
      "retrieval": { "type": "object" }
    }
  }
}
```

**关键字段说明：**
| 字段 | 说明 |
|------|------|
| `id` | 插件唯一标识符 |
| `kind` | 插件类型（`memory`, `context-engine` 等） |
| `configSchema` | 配置项的 JSON Schema |
| `uiHints` | UI 提示信息（标签、占位符、帮助文本） |

## 飞书插件打包

飞书插件的源码位于 OpenClaw 仓库 `extensions/feishu/`，打包时通过 `bundle-openclaw.mjs` 的扩展依赖收集机制一起打包。

### 飞书插件配置

**openclaw.plugin.json：**
```json
{
  "id": "feishu",
  "channels": ["feishu"],
  "skills": ["./skills"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

**package.json：**
```json
{
  "name": "@openclaw/feishu",
  "version": "2026.3.8",
  "dependencies": {
    "@larksuiteoapi/node-sdk": "^1.59.0",
    "@sinclair/typebox": "0.34.48",
    "https-proxy-agent": "^7.0.6",
    "zod": "^4.3.6"
  },
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "feishu",
      "label": "Feishu",
      "aliases": ["lark"]
    }
  }
}
```

## 相关文档

- [运行时环境变量详解](./04-runtime-environment.md)
- [插件安装到 .openclaw 目录](./05-plugin-installation.md)
- [新增插件指南](./06-add-new-plugin.md)
