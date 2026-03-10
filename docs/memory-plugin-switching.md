# Memory 插件切换指南

## 概述

ClawX/OpenClaw 支持多种 memory 插件：

| 插件 | 类型 | 特点 | 配置复杂度 |
|------|------|------|-----------|
| **memory-lancedb-pro** | 第三方增强版 | 高级向量搜索、混合检索、重排序 | 高 |
| **memory-lancedb** | 官方 LanceDB | 标准向量搜索 | 中 |
| **memory-core** | 官方基础版 | 简单稳定，无需额外配置 | 低 |

## 快速切换方法

### 方法：使用配置管理脚本（推荐）

**文件位置**: `scripts/memory-config-manager.js`

#### 1. 修改配置

编辑脚本顶部的 `CONFIG` 对象：

```javascript
const CONFIG = {
  // ========== 主要开关 ==========
  // true  = 使用 memory-lancedb-pro（第三方增强版）
  // false = 使用官方 memory 系统
  USE_MEMORY_LANCEDB_PRO: false,

  // ========== 官方插件选择 ==========
  // 可选值: "memory-lancedb" | "memory-core" | null
  OFFICIAL_MEMORY_PLUGIN: "memory-core",
  ...
};
```

#### 2. 应用配置

```bash
cd d:/Code/ClawX
node scripts/memory-config-manager.js apply
```

#### 3. 查看当前状态

```bash
node scripts/memory-config-manager.js status
```

#### 4. 重启 OpenClaw

```bash
openclaw restart
```

---

## 场景示例

### 场景 1：临时禁用 memory-lancedb-pro，使用官方基础版

```javascript
const CONFIG = {
  USE_MEMORY_LANCEDB_PRO: false,
  OFFICIAL_MEMORY_PLUGIN: "memory-core",
  ...
};
```

### 场景 2：使用官方 LanceDB memory

```javascript
const CONFIG = {
  USE_MEMORY_LANCEDB_PRO: false,
  OFFICIAL_MEMORY_PLUGIN: "memory-lancedb",
  ...
};
```

### 场景 3：完全禁用 memory

```javascript
const CONFIG = {
  USE_MEMORY_LANCEDB_PRO: false,
  OFFICIAL_MEMORY_PLUGIN: null,
  ...
};
```

### 场景 4：恢复使用 memory-lancedb-pro

```javascript
const CONFIG = {
  USE_MEMORY_LANCEDB_PRO: true,
  ...
};
```

---

## 手动修改方法

如果不想使用脚本，可以直接编辑 `D:/TheClaw/.openclaw/openclaw.json`：

### 切换到 memory-core（官方基础版）

```json
{
  "plugins": {
    "load": {
      "paths": []
    },
    "slots": {
      "memory": "memory-core"
    },
    "entries": {
      "memory-core": {
        "enabled": true,
        "config": {}
      }
    }
  }
}
```

### 切换到 memory-lancedb（官方 LanceDB）

```json
{
  "plugins": {
    "load": {
      "paths": []
    },
    "slots": {
      "memory": "memory-lancedb"
    },
    "entries": {
      "memory-lancedb": {
        "enabled": true,
        "config": {
          "embedding": {
            "apiKey": "${OPENAI_API_KEY}",
            "model": "text-embedding-3-small"
          },
          "autoCapture": true,
          "autoRecall": false
        }
      }
    }
  }
}
```

### 恢复 memory-lancedb-pro

```json
{
  "plugins": {
    "load": {
      "paths": [
        "D:\\TheClaw\\.openclaw\\workspace\\plugins\\memory-lancedb-pro"
      ]
    },
    "slots": {
      "memory": "memory-lancedb-pro"
    },
    "entries": {
      "memory-lancedb-pro": {
        "enabled": true,
        "config": {
          "embedding": {
            "apiKey": "your-api-key",
            "model": "Qwen/Qwen3-Embedding-0.6B",
            "baseURL": "https://api.siliconflow.cn/v1",
            "dimensions": 1024
          },
          "dbPath": "D:\\TheClaw\\.openclaw\\memory\\lancedb-pro",
          "autoCapture": true,
          "autoRecall": false
        }
      }
    }
  }
}
```

---

## 官方 memory 系统源码位置

- **memory-lancedb**: `D:/Code/openclaw/extensions/memory-lancedb/`
- **memory-core**: `D:/Code/openclaw/extensions/memory-core/`

---

## 注意事项

1. **重启生效**: 修改配置后需要重启 OpenClaw 服务
2. **数据保留**: 切换插件不会删除已有的 memory 数据
3. **备份**: 配置管理脚本会自动备份原配置到 `.bak.<timestamp>` 文件
4. **Embedding**: memory-lancedb 和 memory-lancedb-pro 需要配置 embedding API

## 当前状态

运行以下命令查看当前配置：

```bash
node scripts/memory-config-manager.js status
```
