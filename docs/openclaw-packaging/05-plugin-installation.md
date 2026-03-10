# 插件安装到 .openclaw 目录

本文档详细介绍 ClawX 启动时如何将预置插件自动安装到 `D:\TheClaw\.openclaw\` 目录。

## 概述

ClawX 使用两种方式安装插件：

| 方式 | 适用场景 | 安装位置 |
|------|----------|----------|
| **自动安装** | 内置插件（如 memory-lancedb-pro） | `D:\TheClaw\.openclaw\workspace\plugins\` |
| **按需安装** | 第三方插件（如 dingtalk） | `D:\TheClaw\.openclaw\extensions\` |

## 自动安装流程

### memory-lancedb-pro 插件示例

**触发时机：** ClawX 应用程序启动时

**执行函数：** `ensureMemoryPluginInstalled()` in `electron/utils/plugin-setup.ts`

```typescript
export async function ensureMemoryPluginInstalled(): Promise<void> {
  try {
    // 1. 检查预置插件是否存在
    const sourceDir = getPluginSourceDir();  // resources/plugins/memory-lancedb-pro/
    if (!existsSync(sourceDir)) {
      logger.debug(`${PLUGIN_NAME} not bundled in resources, skipping plugin setup`);
      return;
    }

    // 2. 检查是否已安装（通过检查原生模块是否存在）
    if (!(await isPluginInstalled())) {
      logger.info(`Installing ${PLUGIN_NAME} plugin (first-time setup)...`);
      await copyPluginSource();     // 复制源码
      await runNpmInstall();        // 安装依赖
      logger.info(`${PLUGIN_NAME} plugin installed successfully`);
    }

    // 3. 确保配置文件存在
    await ensurePluginConfig();
  } catch (error) {
    logger.warn(`Failed to install ${PLUGIN_NAME} plugin:`, error);
  }
}
```

### 步骤详解

#### 1. 复制源码

```typescript
async function copyPluginSource(): Promise<void> {
  const sourceDir = getPluginSourceDir();  // resources/plugins/memory-lancedb-pro/
  const targetDir = getPluginTargetDir(); // D:\TheClaw\.openclaw\workspace\plugins\memory-lancedb-pro/

  await mkdir(targetDir, { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true, force: true });
  logger.info(`Copied ${PLUGIN_NAME} source to ${targetDir}`);
}
```

#### 2. 安装依赖

```typescript
async function runNpmInstall(): Promise<void> {
  const targetDir = getPluginTargetDir();

  // 使用阿里云 npm 镜像
  const REGISTRY = '--registry https://registry.npmmirror.com';

  // 优先使用 npm ci（确定性）
  const hasLock = await fileExists(join(targetDir, 'package-lock.json'));
  const cmd = hasLock
    ? `npm ci --omit=dev --no-audit --no-fund ${REGISTRY}`
    : `npm install --omit=dev --no-audit --no-fund ${REGISTRY}`;

  const homeDir = getOpenClawHomeDir();
  await execAsync(cmd, {
    cwd: targetDir,
    timeout: 5 * 60 * 1000,
    windowsHide: true,
    env: {
      ...process.env,
      HOME: homeDir,
      USERPROFILE: homeDir,
      OPENCLAW_HOME: homeDir,
    },
  });
}
```

**关键点：**
- 设置 `HOME`、`USERPROFILE`、`OPENCLAW_HOME` 确保 npm 安装到正确目录
- 使用 `npm ci` 或 `npm install` 安装原生模块（如 LanceDB）

#### 3. 配置 openclaw.json

```typescript
async function ensurePluginConfig(): Promise<void> {
  const pluginPath = getPluginTargetDir();
  const config = await readOpenClawConfig();

  // 1. 添加插件加载路径
  if (!config.plugins) config.plugins = {};
  if (!config.plugins.load) config.plugins.load = { paths: [] };
  config.plugins.load.paths.push(pluginPath);

  // 2. 添加插件条目配置
  if (!config.plugins.entries) config.plugins.entries = {};
  config.plugins.entries[PLUGIN_NAME] = {
    enabled: true,
    config: {
      // 默认配置...
    },
  };

  // 3. 设置内存插槽
  if (!config.plugins.slots) config.plugins.slots = {};
  config.plugins.slots.memory = PLUGIN_NAME;

  await writeOpenClawConfig(config);
}
```

### 目标目录结构

安装完成后，`D:\TheClaw\.openclaw\` 结构如下：

```
D:\TheClaw\
├── .openclaw\
│   ├── openclaw.json           <- 主配置文件
│   ├── extensions\             <- 第三方插件
│   │   └── dingtalk\
│   │       ├── package.json
│   │       ├── index.ts
│   │       └── node_modules\
│   ├── workspace\
│   │   └── plugins\            <- 内置插件
│   │       └── memory-lancedb-pro\
│   │           ├── package.json
│   │           ├── index.ts
│   │           ├── openclaw.plugin.json
│   │           └── node_modules\
│   │               ├── @lancedb\
│   │               └── ...
│   └── skills\
└── logs\
```

## 按需安装流程

### DingTalk 插件示例

**触发时机：** 用户配置 DingTalk 通道时

**执行位置：** `electron/main/ipc-handlers.ts`

```typescript
// 从打包资源复制到 extensions 目录
const sourceDir = join(process.resourcesPath, 'openclaw-plugins', 'dingtalk');
const targetDir = join(getOpenClawConfigDir(), 'extensions', 'dingtalk');

cpSync(sourceDir, targetDir, { recursive: true, dereference: true });
```

## 飞书插件加载机制

飞书插件通过 `bundle-openclaw.mjs` 打包到 OpenClaw 主包中，因此：

1. 插件源码位于：`build/openclaw/extensions/feishu/`
2. 运行时由 OpenClaw Gateway 自动加载
3. 配置文件位于：`D:\TheClaw\.openclaw\openclaw.json`

**飞书配置结构：**
```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "accounts": {
        "main": {
          "appId": "cli_xxx",
          "appSecret": "xxx"
        }
      }
    }
  },
  "plugins": {
    "entries": {
      "feishu": {
        "enabled": true
      }
    }
  },
  "bindings": [
    {
      "type": "route",
      "agentId": "main",
      "match": {
        "channel": "feishu"
      }
    }
  ]
}
```

## 相关文档

- [运行时环境变量详解](./04-runtime-environment.md)
- [新增插件指南](./06-add-new-plugin.md)
