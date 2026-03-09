# OpenClaw Control UI 访问问题

## 问题描述

在 ClawX 设置页面中点击"打开开发者控制台"按钮后，浏览器打开 `http://127.0.0.1:18766/?token=xxx` 显示 "Not Found" 错误。

## 问题原因

OpenClaw Gateway 默认只提供 **WebSocket 服务器**（用于 RPC 通信），**不提供 HTTP 服务**。

ClawX 在启动 OpenClaw Gateway 时传入的参数为（见 `electron/gateway/manager.ts`）：

```typescript
const gatewayArgs = ['gateway', '--port', String(this.status.port), '--token', gatewayToken, '--allow-unconfigured'];
```

这些参数只启动了 WebSocket 服务器，没有启用 HTTP 服务器来提供 Control UI。

访问 `http://127.0.0.1:18766/?token=xxx` 会返回 "Not Found"，因为：
1. Gateway 没有启动 HTTP 服务器
2. 或者 Control UI 的路径在 OpenClaw 新版本中发生了变化

## 解决方案

### 方案一：使用 WebSocket 连接（推荐）

由于 Gateway 主要通过 WebSocket 提供服务，Control UI 可能需要通过 WebSocket 连接。可以考虑：

1. 使用 Electron 的 `BrowserWindow` 直接在应用内嵌入 Control UI（如果支持）
2. 或者使用其他方式访问 OpenClaw 的管理功能

### 方案二：查找 OpenClaw HTTP 启动参数

需要检查 OpenClaw Gateway 是否支持通过启动参数启用 HTTP 服务器：

```bash
# 查看 OpenClaw Gateway 可用参数
openclaw gateway --help
```

可能的参数包括：
- `--http-port <port>` - 启用 HTTP 服务器并指定端口
- `--enable-http` - 启用 HTTP 服务
- `--control-ui-path <path>` - 指定 Control UI 的路径

或者通过环境变量：
- `OPENCLAW_HTTP_PORT`
- `OPENCLAW_ENABLE_HTTP`

### 方案三：手动启动 Control UI

OpenClaw 的 Control UI 可能需要作为独立服务启动：

```bash
# 查找 Control UI 相关的启动命令
openclaw --help
```

## 相关代码位置

| 文件 | 说明 |
|------|------|
| `electron/gateway/manager.ts:1222` | Gateway 启动参数构建位置 |
| `electron/main/ipc-handlers.ts:1488-1499` | Control UI URL 生成逻辑 |
| `src/pages/Settings/index.tsx:127-142` | 前端调用逻辑 |

## 后续步骤

1. 查看 OpenClaw 官方文档了解 Control UI 的启动方式
2. 如果 OpenClaw 支持 HTTP 服务，修改 `manager.ts` 添加相应参数
3. 如果 Control UI 需要独立启动，考虑在设置页面提供正确的启动方式
