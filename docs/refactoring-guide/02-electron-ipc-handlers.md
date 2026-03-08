# 02 - Electron IPC Handlers

## 涉及文件

| 操作 | 文件路径 |
|------|---------|
| 修改 | `electron/preload/index.ts` — 添加 IPC 白名单 |
| 修改 | `electron/main/ipc-handlers.ts` — 添加 Agent 文件操作 handlers |

---

## 修改 1: Preload 白名单

### 文件: `electron/preload/index.ts`

在 `invoke` 方法的 `validChannels` 数组中，添加两个新通道：

```diff
  // Session management
  'session:delete',
+ // Agent file operations
+ 'agent:cleanupFiles',
+ 'agent:copyTemplates',
  // OpenClaw extras
  'openclaw:getDir',
```

**位置**: 找到 `'session:delete'` 后面，在 `'openclaw:getDir'` 前面插入。

---

## 修改 2: IPC Handlers

### 文件: `electron/main/ipc-handlers.ts`

在 `registerIpcHandlers` 函数末尾（其他 `ipcMain.handle` 之后），添加以下两个 handler：

```typescript
  // ── Agent file operations ────────────────────────────────────

  /**
   * 清理 Agent 的物理文件夹
   * 删除 workspace 目录和 agent 配置目录
   */
  ipcMain.handle(
    'agent:cleanupFiles',
    async (_, params: { agentId: string }) => {
      const { agentId } = params;
      if (!agentId || agentId === 'main') {
        return { success: false, error: 'Cannot delete main agent or empty agentId' };
      }

      const configDir = gatewayManager.getOpenClawConfigDir();
      const workspaceDir = path.join(configDir, `workspace-${agentId}`);
      const agentDir = path.join(configDir, 'agents', agentId);

      const errors: string[] = [];

      // 删除 workspace 目录
      try {
        await fs.promises.rm(workspaceDir, { recursive: true, force: true });
        logger.info(`[agent:cleanupFiles] Deleted workspace: ${workspaceDir}`);
      } catch (err) {
        const msg = `Failed to delete workspace ${workspaceDir}: ${err}`;
        logger.warn(`[agent:cleanupFiles] ${msg}`);
        errors.push(msg);
      }

      // 删除 agent 配置目录
      try {
        await fs.promises.rm(agentDir, { recursive: true, force: true });
        logger.info(`[agent:cleanupFiles] Deleted agent dir: ${agentDir}`);
      } catch (err) {
        const msg = `Failed to delete agent dir ${agentDir}: ${err}`;
        logger.warn(`[agent:cleanupFiles] ${msg}`);
        errors.push(msg);
      }

      return {
        success: errors.length === 0,
        error: errors.length > 0 ? errors.join('; ') : undefined,
      };
    },
  );

  /**
   * 复制模板文件到 Agent 工作区
   * 将 themd/ 目录下的 AGENTS.md, USER.md, TOOLS.md 复制到新建的 workspace
   */
  ipcMain.handle(
    'agent:copyTemplates',
    async (_, params: { agentId: string; templateDir: string; workspaceDir: string }) => {
      const { templateDir, workspaceDir } = params;
      const templateFiles = ['AGENTS.md', 'USER.md', 'TOOLS.md'];
      const errors: string[] = [];

      for (const file of templateFiles) {
        const src = path.join(templateDir, file);
        const dst = path.join(workspaceDir, file);
        try {
          // 检查源文件是否存在
          await fs.promises.access(src);
          await fs.promises.copyFile(src, dst);
          logger.info(`[agent:copyTemplates] Copied ${file} to ${workspaceDir}`);
        } catch (err) {
          // 模板文件不存在是正常情况，降级为 debug 日志
          logger.debug(`[agent:copyTemplates] Skipped ${file}: ${err}`);
        }
      }

      return {
        success: errors.length === 0,
        error: errors.length > 0 ? errors.join('; ') : undefined,
      };
    },
  );
```

### 需要确认的 import

在 `ipc-handlers.ts` 文件顶部，确认已有以下导入（通常已存在）：

```typescript
import * as fs from 'fs';
import * as path from 'path';
```

### `getOpenClawConfigDir()` 方法

如果 `GatewayManager` 类没有 `getOpenClawConfigDir()` 方法，需要使用现有的路径获取方式。查看 `ipc-handlers.ts` 中 `openclaw:getConfigDir` handler 的实现，复用同样的逻辑：

```typescript
// 已有的 handler（参考其实现获取 configDir）
ipcMain.handle('openclaw:getConfigDir', () => {
  // 返回 OpenClaw 配置目录路径
});
```

将该路径提取为一个变量在新 handler 中使用。

---

## 要点说明

### 为什么不用 WebSocket 终端？

ui-react-prod 原来通过 WebSocket 终端执行 `rmdir /s /q` 和 `copy /Y` 命令。这有以下问题：

1. **cmd.exe `&&` 短路**：前一条命令退出码非 0 时后续命令不执行
2. **提示符误检测**：`/[>$#]\s*$/` 正则被命令输出中的 `>` 字符误触发
3. **PTY 缓冲区截断超长命令**
4. **中文/Emoji 编码问题**（即使 `chcp 65001`）

通过 Electron IPC 在 main 进程使用 Node.js `fs` API 做文件操作完全避免了这些问题。

### 安全考虑

- `agent:cleanupFiles` 拒绝删除 `main` agent
- 使用 `fs.promises.rm({ force: true })` 允许目录不存在的情况
- 模板复制失败不阻塞 Agent 创建流程
