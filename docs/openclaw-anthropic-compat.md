# OpenClaw Anthropic 兼容接口配置指南

OpenClaw 支持通过 **Custom Provider** 功能连接任何 Anthropic API 兼容的端点。这允许用户使用自托管的 Claude 模型服务或第三方代理。

## 使用方式

### 方式一：命令行参数（推荐）

```bash
openclaw onboard \
  --auth-choice custom-api-key \
  --custom-base-url "https://your-anthropic-compatible-endpoint.com/v1" \
  --custom-model-id "claude-sonnet-4-20250514" \
  --custom-compatibility anthropic \
  --custom-api-key "your-api-key"
```

**参数说明：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `--auth-choice custom-api-key` | 是 | 选择自定义 Provider |
| `--custom-base-url` | 是 | Anthropic 兼容端点的 Base URL |
| `--custom-model-id` | 是 | 模型 ID（如 `claude-sonnet-4-20250514`） |
| `--custom-compatibility anthropic` | 是 | 指定为 Anthropic 兼容模式 |
| `--custom-api-key` | 否 | API Key（也可通过环境变量 `CUSTOM_API_KEY` 设置） |
| `--custom-provider-id` | 否 | 自定义 Provider ID（默认自动从 URL 推导） |

### 方式二：交互式引导

```bash
openclaw onboard
```

在引导过程中：
1. 选择认证方式时选择 **Custom Provider**
2. 输入你的 Anthropic 兼容端点 URL
3. 输入模型 ID
4. 系统会自动检测兼容模式（OpenAI 或 Anthropic）

### 方式三：手动配置 config.yaml

也可以直接在配置文件中添加：

```yaml
models:
  providers:
    my-anthropic兼容:
      baseUrl: "https://your-endpoint.com/v1"
      api: anthropic
      apiKey: "your-api-key"
      models:
        - id: "claude-sonnet-4-20250514"
          name: "Claude Sonnet 4"
          contextWindow: 200000
          maxTokens: 8192
```

## 适用场景

- **自托管模型服务**：使用 Ollama、LiteLLM 等自托管的 Claude 兼容端点
- **第三方代理服务**：通过 API 代理使用 Claude 模型
- **企业内网部署**：在防火墙内运行 Claude 兼容服务

## 相关代码文件

- 核心实现：`src/commands/onboard-custom.ts`
- CLI 参数定义：`src/cli/program/register.onboard.ts:95-102`
- 认证选项：`src/commands/auth-choice-options.ts:183-187`

## 参考链接

- [OpenClaw 官方文档 - Configuration](https://docs.openclaw.ai/configuration)
- [GitHub 源码 - onboard-custom.ts](https://github.com/openclaw/openclaw/blob/main/src/commands/onboard-custom.ts)
