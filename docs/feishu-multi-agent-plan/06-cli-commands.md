# CLI 命令序列与 Gateway 集成

## OpenClaw CLI 命令参考

### 1. 配置设置命令

#### 设置飞书账号配置

```bash
# 启用飞书通道
openclaw config set channels.feishu.enabled true

# 设置指定 Agent 的飞书配置
openclaw config set channels.feishu.accounts.${AGENT_ID}.enabled true
openclaw config set channels.feishu.accounts.${AGENT_ID}.appId "${APP_ID}"
openclaw config set channels.feishu.accounts.${AGENT_ID}.appSecret "${APP_SECRET}"
openclaw config set channels.feishu.accounts.${AGENT_ID}.paired false
```

### 2. Agent 绑定命令

#### 绑定飞书通道

```bash
# 将 Agent 与飞书账号绑定
openclaw agents bind --agent ${AGENT_ID} --bind feishu:${AGENT_ID}

# 示例
openclaw agents bind --agent data-cleaner --bind feishu:data-cleaner
```

#### 解绑飞书通道

```bash
# 解除 Agent 与飞书的绑定
openclaw agents unbind --agent ${AGENT_ID} --bind feishu:${AGENT_ID}
```

### 3. 配对码相关命令

根据 OpenClaw 文档 `openclaw-agents-cli-study_feishu-per-agent.md`：

```bash
# 用户向飞书机器人发送任意消息后，机器人返回配对码
# 前端将配对码发送到 Gateway 进行验证

# 通过 Gateway RPC 验证配对码（如果支持）
# 或通过 CLI 完成配对确认
openclaw config set channels.feishu.accounts.${AGENT_ID}.paired true
```

## 完整的命令执行序列

### 绑定流程

```typescript
// Step 1: 写入飞书配置
const step1Commands = [
  'openclaw config set channels.feishu.enabled true',
  `openclaw config set channels.feishu.accounts.${agentId}.enabled true`,
  `openclaw config set channels.feishu.accounts.${agentId}.appId "${appId}"`,
  `openclaw config set channels.feishu.accounts.${agentId}.appSecret "${appSecret}"`,
  `openclaw config set channels.feishu.accounts.${agentId}.paired false`,
];

// Step 2: 执行绑定命令（在用户提供配对码后）
const step2Commands = [
  `openclaw agents bind --agent ${agentId} --bind feishu:${agentId}`,
];
```

### 解绑流程

```typescript
const unbindCommands = [
  `openclaw agents unbind --agent ${agentId} --bind feishu:${agentId}`,
  `openclaw config set channels.feishu.accounts.${agentId}.enabled false`,
];
```

## 命令执行实现

### 使用 Node.js spawn

```typescript
import { spawn } from 'child_process';
import { getOpenClawConfigDir } from './paths';

interface ExecuteResult {
  success: boolean;
  output: string;
  error?: string;
}

export async function executeOpenClawCommands(
  commands: string[],
  options: { timeout?: number } = {}
): Promise<ExecuteResult> {
  const { timeout = 30000 } = options;
  const openclawDir = getOpenClawConfigDir();

  return new Promise((resolve) => {
    const outputs: string[] = [];
    const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';

    const child = spawn(shell, [], {
      cwd: openclawDir,
      env: {
        ...process.env,
        LANG: 'en_US.UTF-8',
      },
      windowsHide: true,
    });

    // Timeout handling
    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        success: false,
        output: outputs.join(''),
        error: `Command execution timed out after ${timeout}ms`,
      });
    }, timeout);

    // Collect output
    child.stdout.on('data', (data: Buffer) => {
      outputs.push(data.toString('utf-8'));
    });

    child.stderr.on('data', (data: Buffer) => {
      outputs.push(data.toString('utf-8'));
    });

    // Process completion
    child.on('close', (code) => {
      clearTimeout(timeoutId);
      const output = outputs.join('');

      if (code === 0) {
        resolve({ success: true, output });
      } else {
        resolve({
          success: false,
          output,
          error: `Process exited with code ${code}`,
        });
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        output: outputs.join(''),
        error: `Failed to spawn shell: ${error.message}`,
      });
    });

    // Execute commands with delays
    setTimeout(() => {
      commands.forEach((cmd, index) => {
        setTimeout(() => {
          if (!child.killed) {
            child.stdin.write(cmd + '\n');
          }
        }, index * 500);
      });

      // Close stdin after commands
      setTimeout(() => {
        if (!child.killed) {
          child.stdin.end();
        }
      }, commands.length * 500 + 1000);
    }, 1000);
  });
}
```

### 错误处理

```typescript
export function parseCommandError(output: string): string {
  // 常见的 OpenClaw 错误模式
  const errorPatterns = [
    { pattern: /agent not found/i, message: 'Agent 不存在' },
    { pattern: /config key not found/i, message: '配置路径不存在' },
    { pattern: /permission denied/i, message: '权限不足' },
    { pattern: /invalid app id/i, message: 'App ID 格式不正确' },
    { pattern: /invalid app secret/i, message: 'App Secret 无效' },
    { pattern: /pairing failed/i, message: '配对失败，请检查配对码' },
  ];

  for (const { pattern, message } of errorPatterns) {
    if (pattern.test(output)) {
      return message;
    }
  }

  // 返回原始输出的最后几行
  const lines = output.split('\n').filter(l => l.trim());
  return lines.slice(-3).join('\n') || '执行失败';
}
```

## Gateway 集成

### Gateway 配置刷新

在修改配置后，需要通知 Gateway 重新加载配置：

```typescript
// 发送 SIGUSR1 信号或调用 reload 命令
export async function reloadGatewayConfig(): Promise<void> {
  try {
    // 方法 1: 通过 Gateway RPC
    await invokeIpc('gateway:rpc', 'system.reload', {});
  } catch (error) {
    console.warn('Gateway reload via RPC failed:', error);

    // 方法 2: 通过 CLI 命令
    await executeOpenClawCommands(['openclaw config reload']);
  }
}
```

### 配对码验证 RPC

如果 Gateway 支持配对码验证：

```typescript
export async function verifyPairingCode(
  agentId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await invokeIpc<{
      success: boolean;
      error?: string;
    }>('gateway:rpc', 'feishu.verifyPairing', {
      agentId,
      code,
    });

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '验证失败',
    };
  }
}
```

## 测试命令

开发调试时可用的测试命令：

```bash
# 读取当前配置
openclaw config get channels.feishu --json

# 查看特定 Agent 的飞书配置
openclaw config get channels.feishu.accounts.data-cleaner --json

# 列出所有 Agent 绑定
openclaw agents list --bindings

# 测试飞书连接
openclaw channels test feishu --agent data-cleaner
```

## 注意事项

1. **命令间隔**: 每条命令之间需要 500ms 延迟，确保顺序执行
2. **超时设置**: 默认 30 秒超时，绑定操作可能需要更长时间
3. **编码问题**: Windows 上需要设置 `LANG` 环境变量为 UTF-8
4. **错误恢复**: 部分命令失败时，后续命令可能仍能执行成功
5. **配置同步**: 配置修改后可能需要等待 300ms 才能被 Gateway 读取

## 备选方案：使用 OpenClaw JS API

如果 OpenClaw 提供了 Node.js SDK，可以替换 spawn 方案：

```typescript
import { OpenClaw } from '@openclaw/sdk';

const client = new OpenClaw({
  configDir: getOpenClawConfigDir(),
});

// 设置配置
await client.config.set(`channels.feishu.accounts.${agentId}`, {
  enabled: true,
  appId,
  appSecret,
});

// 绑定 Agent
await client.agents.bind(agentId, `feishu:${agentId}`);
```
