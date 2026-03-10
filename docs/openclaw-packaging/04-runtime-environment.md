# 运行时环境变量详解

本文档详细介绍 ClawX 启动 OpenClaw Gateway 时设置的环境变量，以及各个组件如何使用这些变量。

## 核心环境变量

### OPENCLAW_HOME

**作用：** 指定 OpenClaw 的配置根目录

**ClawX 中的值：** `D:\TheClaw`

**设置位置：**
- `electron/gateway/manager.ts` - Gateway 进程启动
- `electron/utils/plugin-setup.ts` - 插件安装
- `electron/main/ipc-handlers.ts` - IPC 命令执行
- `electron/utils/channel-config.ts` - 配置读写

**重要性：** 这是最重要的环境变量。所有 OpenClaw 配置、技能、插件数据都存放在此目录下。如果未正确设置，会导致：
- 配置文件写到错误的目录
- 插件无法加载
- 技能无法使用

### HOME / USERPROFILE

**作用：** 系统用户目录，用于解析 `~` 路径

**ClawX 中的值：** `D:\TheClaw`（与 OPENCLAW_HOME 相同）

**原因：** 确保 npm 安装脚本和 OpenClaw 子进程正确解析 `~/.openclaw` 路径

## Gateway 启动环境变量

在 `electron/gateway/manager.ts` 中，Gateway 进程启动时设置以下环境变量：

```typescript
const forkEnv: Record<string, string | undefined> = {
  // 路径配置
  HOME: getOpenClawHomeDir(),
  USERPROFILE: getOpenClawHomeDir(),
  OPENCLAW_HOME: getOpenClawHomeDir(),
  
  // Gateway 配置
  OPENCLAW_GATEWAY_TOKEN: gatewayToken,
  OPENCLAW_GATEWAY_PORT: String(PORTS.OPENCLAW_GATEWAY),
  OPENCLAW_NO_RESPAWN: '1',
  
  // 嵌入模式标识
  OPENCLAW_EMBEDDED_IN: 'ClawX',
  
  // 跳过预装通道
  OPENCLAW_SKIP_CHANNELS: '',
  
  // 日志配置
  OPENCLAW_LOG_LEVEL: 'debug',
};
```

## 环境变量完整列表

| 环境变量 | 说明 | ClawX 中的值 |
|----------|------|--------------|
| `HOME` | 用户主目录 | `D:\TheClaw` |
| `USERPROFILE` | Windows 用户目录 | `D:\TheClaw` |
| `OPENCLAW_HOME` | OpenClaw 配置根目录 | `D:\TheClaw` |
| `OPENCLAW_GATEWAY_TOKEN` | Gateway 认证令牌 | 随机生成 |
| `OPENCLAW_GATEWAY_PORT` | Gateway 监听端口 | `18789` |
| `OPENCLAW_NO_RESPAWN` | 禁止自重启 | `1` |
| `OPENCLAW_EMBEDDED_IN` | 嵌入模式标识 | `ClawX` |
| `OPENCLAW_LOG_LEVEL` | 日志级别 | `debug` |
| `OPENCLAW_SKIP_CHANNELS` | 跳过的预装通道 | `""` |
| `OPENCLAW_RAW_STREAM` | 原始流输出 | 可选 |
| `OPENCLAW_RAW_STREAM_PATH` | 原始流文件路径 | 可选 |

## 不同场景下的环境变量

### 场景 1：Gateway 进程启动

**文件：** `electron/gateway/manager.ts`

```typescript
this.process = utilityProcess.fork(entryScript, gatewayArgs, {
  cwd: openclawDir,
  stdio: 'pipe',
  env: forkEnv as NodeJS.ProcessEnv,
  serviceName: 'OpenClaw Gateway',
});
```

### 场景 2：插件安装（npm ci）

**文件：** `electron/utils/plugin-setup.ts`

```typescript
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
```

### 场景 3：执行 OpenClaw CLI 命令

**文件：** `electron/main/ipc-handlers.ts`

```typescript
// 方式 1：使用 ELECTRON_RUN_AS_NODE
const cmdStr = `"${electronExe}" "${openclawMjs}" ${args}`;
env: {
  ...process.env,
  ELECTRON_RUN_AS_NODE: '1',
  OPENCLAW_HOME: getOpenClawHomeDir(),
}

// 方式 2：直接执行
env: {
  ...process.env,
  FORCE_COLOR: '0',
  OPENCLAW_HOME: getOpenClawHomeDir(),
}
```

### 场景 4：验证通道配置

**文件：** `electron/utils/channel-config.ts`

```typescript
await execAsync(command, {
  cwd: openclawDir,
  env: {
    ...process.env,
    OPENCLAW_HOME: getOpenClawHomeDir(),
  },
});
```

## 常见问题排查

### 问题：配置文件写到错误目录

**症状：** 配置文件出现在 `C:\Users\xxx\` 而非 `D:\TheClaw\`

**排查步骤：**
1. 检查是否所有 `exec()`/`spawn()` 调用都传递了 `OPENCLAW_HOME`
2. 搜索代码中是否有遗漏的位置
3. 确认 Gateway 进程的环境变量正确

### 问题：插件加载失败

**症状：** `Cannot find module '@larksuiteoapi/node-sdk'`

**排查步骤：**
1. 确认 `bundle-openclaw.mjs` 已包含扩展依赖收集步骤
2. 检查打包后的 `node_modules` 目录
3. 验证插件路径配置正确

### 问题：Electron 内嵌 Node 与系统 Node 不匹配

**症状：** 原生模块加载失败

**原因：**
| | Node 版本 | modules ABI |
|---|---|---|
| 系统 node | 22.22.0 | 127 |
| Electron 40 内嵌 | 24.13.1 | 143 |

**解决方案：** 使用 `ELECTRON_RUN_AS_NODE=1` + `process.execPath`

## 相关文档

- [OpenClaw 核心打包流程](./02-openclaw-bundling.md)
- [插件安装到 .openclaw 目录](./05-plugin-installation.md)
- [新增插件指南](./06-add-new-plugin.md)
