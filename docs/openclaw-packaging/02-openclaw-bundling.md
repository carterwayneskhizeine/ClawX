# OpenClaw 核心打包流程

本文档详细介绍 `bundle-openclaw.mjs` 脚本如何将 OpenClaw npm 包及其依赖打包到可分发的目录中。

## 问题背景

pnpm 使用内容寻址的虚拟存储（virtual store），结构如下：

```
.pnpm/
  openclaw@2026.3.8/node_modules/
    openclaw/           <- 实际文件
    chalk/              <- 符号链接 -> ../chalk@5.4.1/node_modules/chalk
    @clack/prompts/    <- 符号链接 -> ../@clack+prompts@0.4.1/node_modules/@clack/prompts

  @clack+prompts@0.4.1/node_modules/
    @clack/prompts/    <- 实际文件
    @clack/core/       <- 符号链接（传递依赖！）

  chalk@5.4.1/node_modules/
    chalk/             <- 实际文件
```

简单的 `cp -r node_modules/openclaw` 会丢失所有运行时依赖，因为：
1. 符号链接指向的目录不在同一棵树下
2. 传递依赖（如 `@clack/core`）完全被忽略

## 解决方案

`bundle-openclaw.mjs` 使用 BFS（广度优先搜索）遍历 pnpm 虚拟存储，收集所有传递依赖到一个扁平的 `node_modules` 结构中。

## 打包流程详解

### 步骤 1：解析 OpenClaw 路径

```javascript
const openclawLink = path.join(NODE_MODULES, 'openclaw');
const openclawReal = fs.realpathSync(openclawLink);
```

跟随 pnpm 符号链接，找到实际的包位置。

### 步骤 2：获取虚拟存储根目录

```javascript
function getVirtualStoreNodeModules(realPkgPath) {
  let dir = realPkgPath;
  while (dir !== path.dirname(dir)) {
    if (path.basename(dir) === 'node_modules') {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}
```

这个函数找到包含该包的虚拟存储 `node_modules` 目录。

### 步骤 3：BFS 收集传递依赖

```javascript
const queue = [];
queue.push({ nodeModulesDir: openclawVirtualNM, skipPkg: 'openclaw' });

while (queue.length > 0) {
  const { nodeModulesDir, skipPkg } = queue.shift();
  const packages = listPackages(nodeModulesDir);

  for (const { name, fullPath } of packages) {
    // 跳过已收集的包
    if (collected.has(realPath)) continue;
    
    // 发现新的传递依赖
    collected.set(realPath, name);
    
    // 递归处理该依赖的虚拟存储
    const depVirtualNM = getVirtualStoreNodeModules(realPath);
    if (depVirtualNM && depVirtualNM !== nodeModulesDir) {
      queue.push({ nodeModulesDir: depVirtualNM, skipPkg: name });
    }
  }
}
```

### 步骤 4：补充扩展依赖

OpenClaw 扩展（如 feishu）的依赖不在主包的虚拟存储中，需要额外处理：

```javascript
// 扫描 extensions/*/package.json
for (const extName of fs.readdirSync(extDir)) {
  const extPkgJson = path.join(extDir, extName, 'package.json');
  const extPkg = JSON.parse(fs.readFileSync(extPkgJson, 'utf8'));
  
  // 对于每个依赖，检查是否已收集
  for (const depName of Object.keys(extPkg.dependencies)) {
    if (!alreadyCollected) {
      // 从 pnpm store 找到并添加到收集列表
      collected.set(realPath, depName);
    }
  }
}
```

这解决了飞书插件依赖缺失的问题：
```
+ Extension dep: @larksuiteoapi/node-sdk (extensions/feishu)
+ Extension dep: axios (extensions/feishu)
+ Extension dep: protobufjs (extensions/feishu)
```

### 步骤 5：复制到扁平结构

```javascript
const outputNodeModules = path.join(OUTPUT, 'node_modules');
fs.mkdirSync(outputNodeModules, { recursive: true });

for (const [realPath, pkgName] of collected) {
  const dest = path.join(outputNodeModules, pkgName);
  fs.cpSync(realPath, dest, { recursive: true, dereference: true });
}
```

### 步骤 6：清理冗余文件

删除开发依赖、类型定义、测试文件等：

```javascript
const REMOVE_DIRS = new Set([
  'test', 'tests', '__tests__', '.github', 'docs', 'examples'
]);
const REMOVE_FILE_EXTS = ['.d.ts', '.d.ts.map', '.js.map', '.mjs.map', '.ts.map'];
```

### 步骤 7：修复损坏的模块

某些 npm 包转义的 CJS 输出存在问题，脚本会在打包后修复：

```javascript
const patches = {
  'node-domexception/index.js': [
    `'use strict';`,
    `// Shim: ...`,
    `const dom = globalThis.DOMException || class DOMException extends Error {...};`,
    `module.exports = dom;`,
  ].join('\n'),
};
```

## 输出结构

打包完成后，`build/openclaw/` 结构如下：

```
build/openclaw/
├── openclaw/           <- OpenClaw 主包
├── extensions/         <- 所有扩展（feishu, telegram, slack 等）
├── node_modules/       <- 扁平化的所有依赖
│   ├── chalk/
│   ├── @larksuiteoapi/
│   ├── @lancedb/
│   └── ...
├── openclaw.mjs        <- 入口文件
└── dist/
    └── entry.js
```

## electron-builder 配置

在 `electron-builder.yml` 中：

```yaml
extraResources:
  - from: build/openclaw/
    to: openclaw/
```

打包后的资源路径：
- 开发版：`resources/openclaw/`
- 打包版：`resources/app.asar.unpacked/openclaw/` 或通过 `process.resourcesPath` 访问

## 关键环境变量

运行时通过 `electron/gateway/manager.ts` 设置：

```typescript
const forkEnv = {
  HOME: getOpenClawHomeDir(),           // D:\TheClaw
  USERPROFILE: getOpenClawHomeDir(),    // D:\TheClaw
  OPENCLAW_HOME: getOpenClawHomeDir(),  // D:\TheClaw
  OPENCLAW_GATEWAY_TOKEN: gatewayToken,
  OPENCLAW_NO_RESPAWN: '1',
  OPENCLAW_EMBEDDED_IN: 'ClawX',
};
```

## 相关文档

- [插件打包机制](./03-plugin-bundling.md)
- [运行时环境变量详解](./04-runtime-environment.md)
