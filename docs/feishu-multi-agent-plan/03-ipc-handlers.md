# Electron IPC Handlers 实现

## 概述

需要新增 3 个 IPC Handler：
1. `terminal:executeCommands` - 执行 CLI 命令序列
2. `feishu:getAgentConfig` - 读取指定 Agent 的飞书配置
3. `feishu:markPaired` - 标记 Agent 为已配对状态

## 修改文件

### 1. electron/preload/index.ts

在 `invoke` 方法的 `validChannels` 数组中添加新通道：

```diff
  // Agent file operations
  'agent:cleanupFiles',
  'agent:copyTemplates',
+ // Feishu multi-agent binding
+ 'terminal:executeCommands',
+ 'feishu:getAgentConfig',
+ 'feishu:markPaired',
```

### 2. electron/main/ipc-handlers.ts

#### 2.1 新增 Import

```typescript
import { spawn, SpawnOptions } from 'child_process';
import { promisify } from 'util';
```

#### 2.2 新增 Handler: terminal:executeCommands

```typescript
/**
 * Execute a sequence of CLI commands in a shell
 * Used for Feishu configuration binding/unbinding
 */
ipcMain.handle(
  'terminal:executeCommands',
  async (
    _,
    params: {
      commands: string[];
      workingDir: string;
      timeout?: number;
      shell?: string;
    }
  ): Promise<{ success: boolean; output: string; error?: string }> => {
    const { commands, workingDir, timeout = 30000, shell } = params;

    logger.info('[terminal:executeCommands] Executing commands:', {
      count: commands.length,
      workingDir,
      timeout,
    });

    const effectiveShell =
      shell || (process.platform === 'win32' ? 'cmd.exe' : 'bash');

    return new Promise((resolve) => {
      const outputs: string[] = [];
      let timeoutId: NodeJS.Timeout | null = null;

      // Spawn shell process
      const child = spawn(effectiveShell, [], {
        cwd: workingDir,
        env: {
          ...process.env,
          // Ensure UTF-8 encoding for Chinese characters
          LANG: 'en_US.UTF-8',
          FORCE_COLOR: '0',
        },
        windowsHide: true, // Hide console window on Windows
      });

      // Set timeout
      timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          output: outputs.join(''),
          error: `Command execution timed out after ${timeout}ms`,
        });
      }, timeout);

      // Collect stdout
      child.stdout.on('data', (data: Buffer) => {
        const output = data.toString('utf-8');
        outputs.push(output);
        logger.debug('[terminal:executeCommands] stdout:', output);
      });

      // Collect stderr
      child.stderr.on('data', (data: Buffer) => {
        const output = data.toString('utf-8');
        outputs.push(output);
        logger.debug('[terminal:executeCommands] stderr:', output);
      });

      // Handle process exit
      child.on('close', (code) => {
        if (timeoutId) clearTimeout(timeoutId);

        const output = outputs.join('');

        if (code === 0) {
          logger.info('[terminal:executeCommands] Commands completed successfully');
          resolve({ success: true, output });
        } else {
          logger.warn(`[terminal:executeCommands] Commands exited with code ${code}`);
          resolve({
            success: false,
            output,
            error: `Process exited with code ${code}`,
          });
        }
      });

      child.on('error', (error) => {
        if (timeoutId) clearTimeout(timeoutId);
        logger.error('[terminal:executeCommands] Failed to spawn shell:', error);
        resolve({
          success: false,
          output: outputs.join(''),
          error: `Failed to spawn shell: ${error.message}`,
        });
      });

      // Send commands to shell
      // Wait a bit for shell initialization, then send commands
      setTimeout(() => {
        commands.forEach((cmd, index) => {
          setTimeout(() => {
            if (!child.killed) {
              child.stdin.write(cmd + '\n');
              logger.debug(`[terminal:executeCommands] Sent command ${index + 1}:`, cmd);
            }
          }, index * 500); // 500ms delay between commands
        });

        // Close stdin after all commands
        setTimeout(() => {
          if (!child.killed) {
            child.stdin.end();
          }
        }, commands.length * 500 + 1000);
      }, 1000);
    });
  }
);
```

#### 2.3 新增 Handler: feishu:getAgentConfig

```typescript
/**
 * Get Feishu configuration for a specific agent
 * Reads from openclaw.json
 */
ipcMain.handle(
  'feishu:getAgentConfig',
  async (
    _,
    params: { agentId: string }
  ): Promise<AgentFeishuConfig | null> => {
    const { agentId } = params;

    try {
      // Import the channel-config utility
      const { readOpenClawConfig } = await import('../utils/channel-config');
      const config = await readOpenClawConfig();

      const feishuAccounts = config.channels?.feishu?.accounts;
      if (!feishuAccounts || typeof feishuAccounts !== 'object') {
        return null;
      }

      const accountConfig = (feishuAccounts as Record<string, unknown>)[agentId];
      if (!accountConfig || typeof accountConfig !== 'object') {
        return null;
      }

      const acct = accountConfig as Record<string, unknown>;

      // Map to our config format
      const result: AgentFeishuConfig = {
        enabled: acct.enabled === true,
        appId: typeof acct.appId === 'string' ? acct.appId : undefined,
        appSecret: typeof acct.appSecret === 'string' ? acct.appSecret : undefined,
        paired: acct.paired === true,
        pairedAt: typeof acct.pairedAt === 'string' ? acct.pairedAt : undefined,
        feishuBotName: typeof acct.feishuBotName === 'string' ? acct.feishuBotName : undefined,
      };

      logger.info(`[feishu:getAgentConfig] Loaded config for ${agentId}:`, {
        enabled: result.enabled,
        paired: result.paired,
      });

      return result;
    } catch (error) {
      logger.error(`[feishu:getAgentConfig] Failed to load config for ${agentId}:`, error);
      return null;
    }
  }
);
```

#### 2.4 新增 Handler: feishu:markPaired

```typescript
/**
 * Mark an agent's Feishu configuration as paired
 * Updates the paired flag and pairedAt timestamp in openclaw.json
 */
ipcMain.handle(
  'feishu:markPaired',
  async (_, params: { agentId: string }): Promise<{ success: boolean; error?: string }> => {
    const { agentId } = params;

    try {
      const { readOpenClawConfig, writeOpenClawConfig } = await import(
        '../utils/channel-config'
      );

      const config = await readOpenClawConfig();

      // Ensure the nested structure exists
      if (!config.channels) {
        config.channels = {};
      }
      if (!config.channels.feishu) {
        config.channels.feishu = {};
      }
      if (!config.channels.feishu.accounts) {
        config.channels.feishu.accounts = {};
      }

      const accounts = config.channels.feishu.accounts as Record<string, unknown>;

      if (!accounts[agentId] || typeof accounts[agentId] !== 'object') {
        return {
          success: false,
          error: `No Feishu configuration found for agent ${agentId}`,
        };
      }

      // Update the paired status
      accounts[agentId] = {
        ...(accounts[agentId] as Record<string, unknown>),
        paired: true,
        pairedAt: new Date().toISOString(),
      };

      await writeOpenClawConfig(config);

      logger.info(`[feishu:markPaired] Marked ${agentId} as paired`);
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[feishu:markPaired] Failed to mark ${agentId} as paired:`, error);
      return { success: false, error: errorMsg };
    }
  }
);
```

#### 2.5 Type Definition (for TypeScript)

在 ipc-handlers.ts 文件顶部添加类型定义：

```typescript
/**
 * Feishu configuration for a single agent
 */
interface AgentFeishuConfig {
  enabled: boolean;
  appId?: string;
  appSecret?: string;
  paired: boolean;
  pairedAt?: string;
  feishuBotName?: string;
}
```

## 备选方案：使用 WebSocket 终端

如果项目中已有 WebSocket PTY 终端实现（如 ai-desktop-sandbox 中的 `/api/pty`），可以使用以下替代方案：

```typescript
// 备选：使用 WebSocket 连接终端
ipcMain.handle(
  'terminal:executeViaWebSocket',
  async (_, params: { commands: string[]; timeout?: number }) => {
    const { commands, timeout = 30000 } = params;

    // 获取 Gateway 终端 WebSocket URL
    const gatewayManager = getGatewayManager();
    const wsUrl = gatewayManager.getTerminalWebSocketUrl();

    return new Promise((resolve) => {
      const ws = new WebSocket(wsUrl);
      const outputs: string[] = [];
      let timeoutId: NodeJS.Timeout;

      ws.on('open', () => {
        // 启动 shell session
        ws.send(
          JSON.stringify({
            method: 'shell.start',
            id: `feishu_bind_${Date.now()}`,
            params: {
              shell: process.platform === 'win32' ? 'cmd.exe' : 'bash',
              cols: 80,
              rows: 24,
            },
          })
        );

        // 延迟发送命令
        setTimeout(() => {
          commands.forEach((cmd, idx) => {
            setTimeout(() => {
              ws.send(JSON.stringify({ key: cmd + '\r', id: `feishu_bind_${Date.now()}` }));
            }, idx * 500);
          });
        }, 1000);
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.data?.raw) {
            // Strip ANSI escape codes
            const clean = msg.data.raw.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
            outputs.push(clean);
          }
        } catch {}
      });

      timeoutId = setTimeout(() => {
        ws.close();
        resolve({ success: true, output: outputs.join('') });
      }, timeout);

      ws.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({ success: false, error: error.message });
      });
    });
  }
);
```

## 测试验证

添加以下测试代码到 ipc-handlers.ts 的 register 函数末尾：

```typescript
// Debug: Test Feishu IPC handlers
if (process.env.NODE_ENV === 'development') {
  logger.info('[IPC] Feishu multi-agent handlers registered');
}
```
