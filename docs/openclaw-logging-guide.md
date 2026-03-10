# OpenClaw 日志输出配置指南

本文档介绍如何配置 OpenClaw 输出不同级别的日志，包括如何保存完整的原始日志。

## 日志级别

OpenClaw 支持以下日志级别（从低到高）：

| 级别 | 说明 |
|------|------|
| `silent` | 静默，不输出任何日志 |
| `fatal` | 致命错误 |
| `error` | 错误 |
| `warn` | 警告 |
| `info` | 信息（默认） |
| `debug` | 调试信息 |
| `trace` | 最详细的追踪信息 |

## 配置方式

### 方式一：配置文件 (推荐)

在 `~/.openclaw/openclaw.json` 中配置：

```json
{
  "logging": {
    "file": "/data/openclaw/openclaw.log",
    "level": "debug",
    "consoleLevel": "info",
    "consoleStyle": "json"
  }
}
```

**配置项说明：**

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `logging.file` | string | 日志文件路径（默认：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`） |
| `logging.level` | string | 文件日志级别 |
| `logging.consoleLevel` | string | 控制台日志级别 |
| `logging.consoleStyle` | string | 控制台格式：`pretty`/`compact`/`json` |
| `logging.maxFileBytes` | number | 单个日志文件最大字节数（默认：500MB） |

### 方式二：环境变量

```bash
# 设置全局日志级别（同时影响文件和控制台）
export OPENCLAW_LOG_LEVEL=debug
```

### 方式三：CLI 参数

```bash
# 全局日志级别
openclaw --log-level debug status

# Gateway 详细日志（仅控制台）
openclaw gateway run --verbose
```

**注意**：`--verbose` 只影响控制台输出，不会改变文件日志级别。如需同时保存详细日志到文件，请使用配置文件或 `OPENCLAW_LOG_LEVEL` 环境变量。

## 保存原始模型流 (Raw Stream)

OpenClaw 支持将模型原始流事件保存到 JSONL 文件：

### 方式一：CLI 参数

```bash
openclaw gateway run \
  --raw-stream \
  --raw-stream-path /data/openclaw/raw-stream.jsonl
```

### 方式二：环境变量

```bash
export OPENCLAW_RAW_STREAM=1
export OPENCLAW_RAW_STREAM_PATH=/data/openclaw/raw-stream.jsonl
```

默认路径：`~/.openclaw/logs/raw-stream.jsonl`

## 实时查看日志

### 使用 OpenClaw CLI

```bash
# 查看最近 200 行日志
openclaw logs

# 实时跟踪日志
openclaw logs --follow

# JSON 格式输出
openclaw logs --follow --json

# 指定本地时间
openclaw logs --follow --local-time
```

### 直接读取日志文件

```bash
# 查看今天的日志
tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log

# 或使用配置的路径
tail -f /data/openclaw/openclaw.log
```

## 长期留存方案

如需将日志发送到外部观测系统（如 Loki、Grafana、Datadog）：

```json
{
  "plugins": {
    "allow": ["diagnostics-otel"],
    "entries": {
      "diagnostics-otel": {
        "enabled": true
      }
    }
  },
  "diagnostics": {
    "enabled": true,
    "otel": {
      "enabled": true,
      "endpoint": "http://otel-collector:4318",
      "protocol": "http/protobuf",
      "logs": true,
      "traces": true,
      "metrics": true
    }
  },
  "logging": {
    "file": "/data/openclaw/openclaw.log",
    "level": "debug"
  }
}
```

## 关键区别

| 选项 | 作用范围 | 用途 |
|------|----------|------|
| `--verbose` | 仅控制台 | 实时调试，不保存到文件 |
| `--log-level` | CLI 全局 | 临时调整，不持久化 |
| `logging.level` | 文件日志 | 持久化保存 |
| `OPENCLAW_LOG_LEVEL` | 文件+控制台 | 环境变量覆盖 |

## 相关代码文件

- 日志级别定义：`src/logging/levels.ts`
- 日志配置类型：`src/config/types.base.ts:168-179`
- 日志 CLI 命令：`src/cli/logs-cli.ts`
- Raw Stream 实现：`src/agents/pi-embedded-subscribe.raw-stream.ts`
- Gateway 运行选项：`src/cli/gateway-cli/run.ts:495-504`

## 参考链接

- [OpenClaw 官方文档 - Logging](https://docs.openclaw.ai/gateway/logging)
- [GitHub - logs-cli.ts](https://github.com/openclaw/openclaw/blob/main/src/cli/logs-cli.ts)
