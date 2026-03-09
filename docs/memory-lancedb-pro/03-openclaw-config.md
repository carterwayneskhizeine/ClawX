# 03 - openclaw.json 配置方案

> 配置文件位置：`D:\TheClaw\.openclaw\openclaw.json`
>
> **关键原则**：`embedding`、`retrieval` 等嵌套对象**不能通过 `openclaw config set` CLI 写入**（CLI 只支持标量值），必须直接操作 JSON 文件。

---

## 3.1 需要添加的 plugins 字段

在现有 `openclaw.json` 的顶层，添加如下 `plugins` 字段：

```json
{
  "plugins": {
    "load": {
      "paths": [
        "D:\\TheClaw\\.openclaw\\workspace\\plugins\\memory-lancedb-pro"
      ]
    },
    "entries": {
      "memory-lancedb-pro": {
        "enabled": true,
        "config": {
          "embedding": {
            "apiKey": "jina_YOUR_API_KEY_HERE",
            "model": "jina-embeddings-v5-text-small",
            "baseURL": "https://api.jina.ai/v1",
            "dimensions": 1024,
            "taskQuery": "retrieval.query",
            "taskPassage": "retrieval.passage",
            "normalized": true
          },
          "dbPath": "D:\\TheClaw\\.openclaw\\memory\\lancedb-pro",
          "autoCapture": true,
          "autoRecall": false,
          "autoRecallMinLength": 8,
          "retrieval": {
            "mode": "hybrid",
            "vectorWeight": 0.7,
            "bm25Weight": 0.3,
            "minScore": 0.45,
            "rerank": "cross-encoder",
            "rerankApiKey": "jina_YOUR_API_KEY_HERE",
            "rerankModel": "jina-reranker-v3",
            "rerankEndpoint": "https://api.jina.ai/v1/rerank",
            "rerankProvider": "jina",
            "candidatePoolSize": 20,
            "recencyHalfLifeDays": 14,
            "recencyWeight": 0.1,
            "filterNoise": true,
            "lengthNormAnchor": 500,
            "hardMinScore": 0.55,
            "timeDecayHalfLifeDays": 60,
            "reinforcementFactor": 0.5,
            "maxHalfLifeMultiplier": 3
          },
          "enableManagementTools": false,
          "sessionStrategy": "systemSessionMemory",
          "scopes": {
            "default": "global",
            "definitions": {
              "global": { "description": "Shared knowledge across all agents" }
            }
          },
          "selfImprovement": {
            "enabled": true,
            "beforeResetNote": true,
            "skipSubagentBootstrap": true,
            "ensureLearningFiles": true
          },
          "mdMirror": {
            "enabled": false,
            "dir": "memory-md"
          }
        }
      }
    },
    "slots": {
      "memory": "memory-lancedb-pro"
    }
  }
}
```

**替换说明**：
- 将 `jina_YOUR_API_KEY_HERE` 替换为实际的 Jina AI API Key
- `dbPath` 使用绝对路径（Windows 反斜杠需转义）
- `load.paths` 使用插件的绝对安装路径

---

## 3.2 通过 IPC 写入配置（代码方式）

为了避免手动编辑 JSON，可以通过新增的 IPC handler 写入配置（参见 [04-ipc-handlers.md](./04-ipc-handlers.md)）。关键函数来自 `electron/utils/channel-config.ts`：

```typescript
import { readOpenClawConfig, writeOpenClawConfig } from '../utils/channel-config';

const config = await readOpenClawConfig();

// 合并 plugins 配置
config.plugins = {
  load: {
    paths: [`${getOpenClawConfigDir()}\\workspace\\plugins\\memory-lancedb-pro`]
  },
  entries: {
    'memory-lancedb-pro': {
      enabled: true,
      config: { /* 完整配置对象 */ }
    }
  },
  slots: {
    memory: 'memory-lancedb-pro'
  }
};

await writeOpenClawConfig(config);
```

路径动态生成使用 `getOpenClawConfigDir()` from `electron/utils/paths.ts`，**不要硬编码**路径。

---

## 3.3 配置项说明

### embedding 配置

| 字段 | 值 | 说明 |
|------|-----|------|
| `apiKey` | `jina_...` | Jina AI API Key |
| `model` | `jina-embeddings-v5-text-small` | 1024 维，性价比最高 |
| `baseURL` | `https://api.jina.ai/v1` | Jina API 端点 |
| `dimensions` | `1024` | 向量维度 |
| `taskQuery` | `retrieval.query` | 查询时使用的任务类型 |
| `taskPassage` | `retrieval.passage` | 存储时使用的任务类型 |

### 检索配置

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `mode` | `hybrid` | 混合检索（向量 + BM25 关键词） |
| `vectorWeight` | `0.7` | 向量相似度权重 |
| `bm25Weight` | `0.3` | 关键词匹配权重 |
| `rerank` | `cross-encoder` | 结果重排序方式 |
| `hardMinScore` | `0.55` | 相关性硬截断阈值，低于此值不返回 |
| `candidatePoolSize` | `20` | 重排序前的候选条目数 |

### 关键开关

| 字段 | 推荐值 | 说明 |
|------|--------|------|
| `autoCapture` | `true` | 自动在每次对话结束后存储记忆 |
| `autoRecall` | `false` | 禁用自动召回（由 agent 主动调用 memory_recall 工具） |
| `sessionStrategy` | `systemSessionMemory` | 使用 OpenClaw 内置会话记忆，确保 agentId 正确关联 |
| `enableManagementTools` | `false` | 不对外暴露管理工具（通过 CLI 管理即可） |

---

## 3.4 手动写入步骤

如果选择手动编辑（推荐在首次验证阶段使用）：

```bash
# 先备份现有配置
cp "D:/TheClaw/.openclaw/openclaw.json" "D:/TheClaw/.openclaw/openclaw.json.bak"

# 用文本编辑器打开并添加 plugins 字段
# 注意 JSON 格式：在最后一个字段后不加逗号
```

写入后运行验证命令（在 Git Bash + 正确环境下）：
```bash
OPENCLAW_HOME="D:/TheClaw" node "D:/Code/ClawX/build/openclaw/openclaw.mjs" plugins info memory-lancedb-pro
```

---

## 3.5 重启 Gateway

配置写入后，必须重启 Gateway：
- **开发环境**：在 ClawX UI 的 Gateway 控制面板点击重启
- **程序化**：通过 `gateway:restart` IPC
- **不推荐**：直接运行 `openclaw gateway restart`（无 TTY 环境下不稳定，参见飞书修复第 6 点）

预期重启后 gateway 日志应包含：
```
memory-lancedb-pro@x.x.x: plugin registered
```
