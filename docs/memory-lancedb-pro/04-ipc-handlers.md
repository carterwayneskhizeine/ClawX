# 04 - IPC Handlers 设计

> 遵循飞书绑定的架构模式，在 `electron/main/ipc-handlers.ts` 新增 `memory:*` 系列 handler，并在 `electron/preload/index.ts` 白名单中注册。

---

## 4.1 需要新增的 IPC Channels

| Channel | 说明 | 调用时机 |
|---------|------|---------|
| `memory:installPlugin` | 写入 openclaw.json 的 plugins 配置 | 首次安装时（UI 引导） |
| `memory:getStats` | 查询记忆统计（各 scope 条目数） | 打开记忆管理面板时 |
| `memory:listByScope` | 列出指定 scope 的记忆条目 | 查看某个 agent 的记忆 |
| `memory:deleteScope` | 删除指定 scope 的所有记忆 | 删除 agent 时自动调用 |
| `memory:searchScope` | 搜索指定 scope 中的记忆 | 前端搜索功能 |
| `memory:getPluginStatus` | 检查插件是否已安装并启用 | UI 状态显示 |

---

## 4.2 Handler 实现模板

### 参考模式（来自 feishu handlers）

所有 handler 遵循以下结构：

```typescript
ipcMain.handle('memory:xxx', async (_, params) => {
  try {
    const { readOpenClawConfig, writeOpenClawConfig } = await import('../utils/channel-config');
    const { getOpenClawConfigDir, getOpenClawHomeDir } = await import('../utils/paths');

    // 业务逻辑...

    logger.info(`[memory:xxx] success`);
    return { success: true, data: result };
  } catch (err) {
    logger.error(`[memory:xxx] Error:`, err);
    return { success: false, error: String(err) };
  }
});
```

---

### `memory:installPlugin`

```typescript
ipcMain.handle('memory:installPlugin', async (_, { jinaApiKey }: { jinaApiKey: string }) => {
  try {
    const { readOpenClawConfig, writeOpenClawConfig } = await import('../utils/channel-config');
    const { getOpenClawConfigDir } = await import('../utils/paths');

    const config = await readOpenClawConfig();
    const pluginPath = path.join(getOpenClawConfigDir(), 'workspace', 'plugins', 'memory-lancedb-pro');

    config.plugins = {
      load: { paths: [pluginPath] },
      entries: {
        'memory-lancedb-pro': {
          enabled: true,
          config: {
            embedding: {
              apiKey: jinaApiKey,
              model: 'jina-embeddings-v5-text-small',
              baseURL: 'https://api.jina.ai/v1',
              dimensions: 1024,
              taskQuery: 'retrieval.query',
              taskPassage: 'retrieval.passage',
              normalized: true,
            },
            dbPath: path.join(getOpenClawConfigDir(), 'memory', 'lancedb-pro'),
            autoCapture: true,
            autoRecall: false,
            autoRecallMinLength: 8,
            retrieval: {
              mode: 'hybrid',
              vectorWeight: 0.7,
              bm25Weight: 0.3,
              minScore: 0.45,
              rerank: 'cross-encoder',
              rerankApiKey: jinaApiKey,
              rerankModel: 'jina-reranker-v3',
              rerankEndpoint: 'https://api.jina.ai/v1/rerank',
              rerankProvider: 'jina',
              candidatePoolSize: 20,
              recencyHalfLifeDays: 14,
              recencyWeight: 0.1,
              filterNoise: true,
              lengthNormAnchor: 500,
              hardMinScore: 0.55,
              timeDecayHalfLifeDays: 60,
              reinforcementFactor: 0.5,
              maxHalfLifeMultiplier: 3,
            },
            enableManagementTools: false,
            sessionStrategy: 'systemSessionMemory',
            scopes: {
              default: 'global',
              definitions: {
                global: { description: 'Shared knowledge across all agents' },
              },
            },
            selfImprovement: {
              enabled: true,
              beforeResetNote: true,
              skipSubagentBootstrap: true,
              ensureLearningFiles: true,
            },
            mdMirror: { enabled: false, dir: 'memory-md' },
          },
        },
      },
      slots: { memory: 'memory-lancedb-pro' },
    };

    await writeOpenClawConfig(config);
    logger.info('[memory:installPlugin] Plugin config written successfully');
    return { success: true };
  } catch (err) {
    logger.error('[memory:installPlugin] Error:', err);
    return { success: false, error: String(err) };
  }
});
```

---

### `memory:getPluginStatus`

```typescript
ipcMain.handle('memory:getPluginStatus', async () => {
  try {
    const { readOpenClawConfig } = await import('../utils/channel-config');
    const config = await readOpenClawConfig();
    const entry = config?.plugins?.entries?.['memory-lancedb-pro'];
    return {
      success: true,
      installed: !!entry,
      enabled: entry?.enabled === true,
    };
  } catch (err) {
    logger.error('[memory:getPluginStatus] Error:', err);
    return { success: false, installed: false, enabled: false, error: String(err) };
  }
});
```

---

### `memory:getStats`

通过 `terminal:executeCommands` 路由（复用已有 exec 环境，避免重复注入 `OPENCLAW_HOME`）：

```typescript
ipcMain.handle('memory:getStats', async () => {
  try {
    // 复用 terminal:executeCommands 已有的 exec 逻辑
    // 通过发送内部 IPC 调用或直接复用 runCommand helper
    const result = await executeOpenClawCommand('memory-pro stats --json');
    return { success: true, data: JSON.parse(result.stdout) };
  } catch (err) {
    logger.error('[memory:getStats] Error:', err);
    return { success: false, error: String(err) };
  }
});
```

**注意**：`memory-pro stats --json` 是否支持 `--json` 输出，需实际验证。如果不支持 JSON，则解析文本输出。

---

### `memory:deleteScope`

```typescript
ipcMain.handle('memory:deleteScope', async (_, { agentId }: { agentId: string }) => {
  try {
    const scope = `agent:${agentId}`;
    // 通过 terminal:executeCommands 执行 CLI 命令
    // 此 handler 通常由内部逻辑直接调用，不暴露给渲染进程
    const commands = [`openclaw memory-pro delete-bulk --scope ${scope}`];
    // ... 执行逻辑（参考 terminal:executeCommands 的 exec 实现）
    logger.info(`[memory:deleteScope] Deleted scope: ${scope}`);
    return { success: true };
  } catch (err) {
    logger.error('[memory:deleteScope] Error:', err);
    return { success: false, error: String(err) };
  }
});
```

**替代方案**：直接在 `agents.ts` 的删除流程里，通过 `invokeIpc('terminal:executeCommands', { commands: ['openclaw memory-pro delete-bulk --scope agent:xxx'] })` 调用，不额外新增 handler。这更简洁，参考 `ai-desktop-sandbox` 中 `Home.tsx` 的处理方式。

---

## 4.3 preload/index.ts 白名单更新

在 `electron/preload/index.ts` 的 `invoke` 白名单中添加：

```typescript
// Memory management
'memory:installPlugin',
'memory:getPluginStatus',
'memory:getStats',
'memory:listByScope',
'memory:deleteScope',
'memory:searchScope',
```

**参考位置**：现有 feishu IPC 声明之后（约 `feishu:deleteAccountConfig` 后面）。

---

## 4.4 内部 executeOpenClawCommand 工具函数（可选重构）

当前 `terminal:executeCommands` 是面向渲染进程的 IPC handler。在 main process 内部，如需直接执行命令（如 agent 删除时的级联操作），可抽取一个内部工具函数：

```typescript
// electron/utils/exec-openclaw.ts (新文件，可选)
import { exec } from 'child_process';
import { getOpenClawResolvedDir, getOpenClawHomeDir } from './paths';

export function execOpenClaw(command: string, timeout = 30000): Promise<{ stdout: string; stderr: string }> {
  const openclawDir = getOpenClawResolvedDir();
  const cmdStr = `node openclaw.mjs ${command.replace(/^openclaw\s+/, '')}`;

  return new Promise((resolve, reject) => {
    exec(cmdStr, {
      cwd: openclawDir,
      env: { ...process.env, FORCE_COLOR: '0', OPENCLAW_HOME: getOpenClawHomeDir() },
      windowsHide: true,
      timeout,
    }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
}
```

此函数可在 `feishu:deleteAccountConfig`、`memory:deleteScope` 等多处复用，避免重复的 exec 配置。**但这是可选的重构**，不是核心需求。
