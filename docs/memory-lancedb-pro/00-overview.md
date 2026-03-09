# memory-lancedb-pro 安装计划总览

> ClawX 项目集成 memory-lancedb-pro 插件，为每个数字员工提供独立的向量记忆空间。
>
> 日期：2026-03-09
> 参考文档：
> - `ai-desktop-sandbox/electron_doc/OpenClaw-memory-lancedb-pro-安装文档.md`（本机 standalone 安装经验）
> - `ai-desktop-sandbox/electron_doc/digital-employees-memory-scopes-setup.md`（多 Agent scope 隔离方案）
> - `docs/feishu-binding-fixes.md`（飞书绑定踩坑经验，架构模式参考）

---

## 文档结构

| 文件 | 内容 |
|------|------|
| [01-analysis.md](./01-analysis.md) | 现状分析：ClawX vs. standalone 安装的差异 |
| [02-plugin-installation.md](./02-plugin-installation.md) | 手动安装插件步骤 |
| [03-openclaw-config.md](./03-openclaw-config.md) | openclaw.json 配置方案 |
| [04-ipc-handlers.md](./04-ipc-handlers.md) | 需要新增的 Electron IPC handlers |
| [05-frontend-integration.md](./05-frontend-integration.md) | 前端 UI 集成方案 |
| [06-agent-lifecycle.md](./06-agent-lifecycle.md) | Agent 创建/删除时的记忆级联管理 |
| [07-verification.md](./07-verification.md) | 验证与测试清单 |

---

## 核心差异：ClawX vs. 本机 Standalone

与 `ai-desktop-sandbox` 中 standalone 安装的最大差异：

| 项目 | Standalone（本机原生） | ClawX（本项目） |
|------|----------------------|----------------|
| OpenClaw 配置目录 | `D:\Digital_Employees\digital_employees_configs\.openclaw` | `D:\TheClaw\.openclaw` |
| 获取路径的方式 | 手动 `set OPENCLAW_STATE_DIR=...` | `getOpenClawHomeDir()` from `electron/utils/paths.ts` |
| 插件安装位置 | `D:\Digital_Employees\...\plugins\memory-lancedb-pro` | `D:\TheClaw\.openclaw\workspace\plugins\memory-lancedb-pro` |
| CLI 调用方式 | 直接 `openclaw` 命令 | `node openclaw.mjs` 通过 `terminal:executeCommands` IPC |
| 环境变量 | `OPENCLAW_STATE_DIR` | `OPENCLAW_HOME`（已由框架统一注入） |
| 前端集成 | `Home.tsx` 手动触发删除 | Zustand store + IPC handler，遵循 feishu 模式 |

---

## 关键风险点（来自飞书绑定经验）

1. **`OPENCLAW_HOME` 必须传递**：每个通过 `exec()` 调用 OpenClaw 的地方都必须注入此变量，否则操作的是默认路径而非 ClawX 配置目录。`terminal:executeCommands` 已正确处理，新增 handler 也必须遵循此模式。

2. **数组/对象无法通过 CLI 设置**：`openclaw config set` 仅支持标量值。插件配置中的 `embedding`、`retrieval` 等嵌套对象，必须通过 `readOpenClawConfig()` / `writeOpenClawConfig()` 直接操作 JSON。

3. **符号链接问题（Windows pnpm）**：`npm install` 后如果包是 pnpm symlink，需要用 `cp -rL` 替换为真实文件，否则 gateway 无法加载插件。

4. **gateway 重启时序**：修改 `openclaw.json` 后必须重启 gateway 才能加载新插件配置。应使用 `gateway:restart` 序列，而非简单的 `openclaw gateway restart` CLI（后者在无 TTY 环境下不稳定）。

---

## 实施顺序建议

```
Phase 1 - 手动安装验证（Step 1）
  └── 克隆插件 → npm install → 修改 openclaw.json → 重启 gateway → 验证

Phase 2 - 后端集成（Steps 2-3）
  ├── ipc-handlers.ts：新增 memory:* 系列 handler
  └── preload/index.ts：将新 IPC channel 加入白名单

Phase 3 - Agent 生命周期绑定（Step 4）
  ├── agents.ts：创建 agent 时初始化 memory scope
  └── agents.ts：删除 agent 时级联删除 memory scope

Phase 4 - 前端 UI（Step 5，可选）
  └── 记忆管理面板（统计、列表、删除）
```
