# 飞书绑定依赖报错问题总结

## 核心表现
在完成飞书多 Agent 配置逻辑并调用 `gateway:restart` 重启网关后，系统可以正常运行基础流程，但是 OpenClaw 底层的 `feishu` 插件加载失败。

运行 `openclaw doctor` 时，查看到如下报错信息：

```
◇  Plugin diagnostics ─────────────────────────────────────────────────────────╮
│                                                                              │
│  - ERROR feishu: failed to load plugin: Error: Cannot find module            │
│    '@larksuiteoapi/node-sdk'                                                 │
│  Require stack:                                                              │
│  - D:\Code\ClawX\build\openclaw\extensions\feishu\src\client.ts              │
│    (D:\Code\ClawX\build\openclaw\extensions\feishu\index.ts)                 │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────╯
```

## 问题分析
1. **缺失依赖**：OpenClaw 打包后的运行时环境（`D:\Code\ClawX\build\openclaw`）下的 `extensions/feishu` 缺少运行所需的官方飞书 SDK 依赖：`@larksuiteoapi/node-sdk`。
2. **导致后果**：由于底层通道插件 `feishu` 在网关启动时因为缺少依赖而直接 Crash（加载失败），导致新保存的多 Agent 凭证配置（App ID/Secret）无法被正常挂载与监听。用户在飞书端发送任何消息给机器人，网关都无法收到，也就无法下发和验证“配对码”。

## 已尝试的解决方案及失败原因
我尝试了通过终端帮你在本地对应环境安装该依赖，但由于环境与包管理器差异，未能成功：

1. **尝试安装到打包输出目录 (`build/openclaw`)**
   - 使用 `pnpm install @larksuiteoapi/node-sdk` 可以成功将包写入 `node_modules`。
   - 但当我们试图调用 `pnpm build` 或 `npm run prepack` 重新打包底层时，由于该目录仅是构建结果的输出目录，部分打包脚本和文件缺失（报错 `/bin/bash: scripts/bundle-a2ui.sh: 没有那个文件或目录`），导致无法完成编译与注册。

2. **尝试直接安装在本地源码库 (`D:\Code\openclaw`)**
   - 尝试使用 `npm install @larksuiteoapi/node-sdk`，触发了 NPM 内部错误 `Cannot read properties of null (reading 'matches')`。
   - 尝试使用 `pnpm install` 进程被手动取消。

## 寻求大师协助的最佳路径
需要向大师（或负责 OpenClaw 底层的开发者）咨询：

> **“在本地编译/运行定制化打包的 OpenClaw 网关时，遇到内置的 feishu 插件缺失 `@larksuiteoapi/node-sdk` 的问题。由于环境原因本地执行依赖补加与重构建失败，应该如何在 OpenClaw 的工作区/源码树中正确引入该飞书依赖并重新编译更新到 `ClawX\build\openclaw` 中？”**

这通常需要在上一级的 OpenClaw 项目源码（位于 `d:\Code\openclaw` ）中的 package.json 里加入此依赖，并通过标准的工程构建命令生成包含完整依赖的包。

## 相关背景文档
此问题的发生主要在执行“ClawX 多 Agent 飞书绑定与打通”任务节点时发现的。相关的产品与技术设计背景可参阅以下文档（存放在 `d:\Code\ClawX\docs\feishu-multi-agent-plan` 目录下）：

- [飞书多 Agent 对接功能演进主文档 (`README.md`)](../feishu-multi-agent-plan/README.md)
  - 核心定义：介绍了多账号从传统的全局绑定走向局部单 Agent 绑定的设计理念与计划。
- [多账号路由设计 (`01-multi-account-routing.md`)](../feishu-multi-agent-plan/01-multi-account-routing.md)
   - 此阶段正在实现的 CLI 调用序列、网关更新方式与多租户机制要求了该依赖包。
- [配置文件格式升级 (`05-config-file-handling.md`)](../feishu-multi-agent-plan/05-config-file-handling.md)
   - 记录了在 `channels.feishu.accounts` 节点下存储各 Agent 的凭证（包含引发此次校验操作的 App ID/Secret）的变更说明。
- [CLI 命令交互与 Gateway 集成 (`06-cli-commands.md`)](../feishu-multi-agent-plan/06-cli-commands.md)
   - 记录了本次导致失败的飞书配置下发与 Gateway 校验时调用 `gateway:restart` （进而拉起 `feishu` 插件失败）的上下文。
