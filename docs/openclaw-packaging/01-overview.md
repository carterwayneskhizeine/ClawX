# OpenClaw 打包机制概述

本文档详细介绍 ClawX 如何打包 OpenClaw 运行时、插件系统以及相关环境变量配置。

## 核心架构

ClawX 是基于 Electron 的桌面应用，其核心工作方式如下：

```
┌─────────────────────────────────────────────────────────────┐
│                      ClawX (Electron)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Renderer   │  │  Main Process │  │ Utility Process  │  │
│  │   (React)    │  │  (IPC Handlers)│  │  (OpenClaw GW)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                              │                              │
│                              ▼                              │
│                    D:\TheClaw\.openclaw\                   │
│                    (配置文件、日志、插件数据)                │
└─────────────────────────────────────────────────────────────┘
```

## 目录结构

| 路径 | 说明 |
|------|------|
| `D:\TheClaw` | OpenClaw 主目录（由 ClawX 硬编码） |
| `D:\TheClaw\.openclaw` | 配置文件、扩展、技能的存放目录 |
| `D:\TheClaw\.openclaw\openclaw.json` | 主配置文件 |
| `D:\TheClaw\.openclaw\workspace\plugins\` | 第三方插件安装目录 |
| `D:\TheClaw\.openclaw\extensions\` | 官方插件目录 |
| `D:\TheClaw\logs` | 日志文件 |

## 打包流程概览

ClawX 的完整打包流程分为以下几个步骤：

### 1. 前端构建
```bash
pnpm vite build
```
编译 React/TypeScript 前端代码到 `dist/` 目录。

### 2. 打包 OpenClaw 核心
```bash
zx scripts/bundle-openclaw.mjs
```
将 OpenClaw npm 包及其所有传递依赖收集到 `build/openclaw/` 目录。

### 3. 打包第三方插件
```bash
zx scripts/bundle-openclaw-plugins.mjs
```
将第三方插件（如 dingtalk）打包到 `build/openclaw-plugins/` 目录。

### 4. Electron 打包
```bash
npx electron-builder
```
使用 electron-builder 将应用打包成可执行文件。

## 关键文件位置

### 构建脚本
| 文件 | 用途 |
|------|------|
| `scripts/bundle-openclaw.mjs` | 打包 OpenClaw 核心运行时 |
| `scripts/bundle-openclaw-plugins.mjs` | 打包第三方插件 |
| `scripts/after-pack.cjs` | 打包后钩子，处理 node_modules 复制 |
| `electron-builder.yml` | electron-builder 主配置 |

### 运行时代码
| 文件 | 用途 |
|------|------|
| `electron/gateway/manager.ts` | Gateway 进程管理器 |
| `electron/utils/paths.ts` | 路径解析工具 |
| `electron/utils/plugin-setup.ts` | 插件安装逻辑 |
| `electron/main/ipc-handlers.ts` | IPC 处理器 |

### 插件资源
| 目录 | 用途 |
|------|------|
| `resources/plugins/memory-lancedb-pro/` | memory-lancedb-pro 插件源码 |
| `build/openclaw-plugins/dingtalk/` | 打包后的 dingtalk 插件 |

## 环境变量配置

ClawX 在启动 OpenClaw Gateway 时设置以下关键环境变量：

| 环境变量 | 值 | 说明 |
|----------|-----|------|
| `HOME` | `D:\TheClaw` | 主目录 |
| `USERPROFILE` | `D:\TheClaw` | Windows 用户目录 |
| `OPENCLAW_HOME` | `D:\TheClaw` | OpenClaw 配置根目录 |
| `OPENCLAW_GATEWAY_TOKEN` | 随机令牌 | Gateway 认证令牌 |
| `OPENCLAW_NO_RESPAWN` | `1` | 禁止 Gateway 自行重启 |
| `OPENCLAW_EMBEDDED_IN` | `ClawX` | 标识嵌入模式 |

## 相关文档

- [OpenClaw 核心打包流程](./02-openclaw-bundling.md)
- [插件打包机制](./03-plugin-bundling.md)
- [运行时环境变量详解](./04-runtime-environment.md)
- [插件安装到 .openclaw 目录](./05-plugin-installation.md)
- [新增插件指南](./06-add-new-plugin.md)
