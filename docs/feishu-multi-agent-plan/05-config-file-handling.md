# 配置文件处理

## 概述

需要修改 `electron/utils/channel-config.ts` 以支持多 Agent 飞书配置：
1. 支持 `channels.feishu.accounts.${agentId}` 配置路径
2. Agent 创建时自动初始化飞书配置
3. Agent 删除时清理飞书配置

## 修改 electron/utils/channel-config.ts

### 1. 新增类型定义

```typescript
/**
 * Feishu account configuration for a single agent
 */
export interface FeishuAccountConfig {
  enabled?: boolean;
  appId?: string;
  appSecret?: string;
  paired?: boolean;
  pairedAt?: string;
  feishuBotName?: string;
}

/**
 * Feishu channel configuration with multi-agent support
 */
export interface FeishuChannelConfig extends ChannelConfigData {
  dmPolicy?: 'open' | 'closed';
  allowFrom?: string[];
  accounts?: Record<string, FeishuAccountConfig>;
}
```

### 2. 修改 saveChannelConfig 函数

添加飞书多账号配置的专用处理：

```typescript
/**
 * Save Feishu configuration for a specific agent
 * Uses the nested accounts structure: channels.feishu.accounts.${agentId}
 */
export async function saveFeishuAccountConfig(
  agentId: string,
  config: FeishuAccountConfig
): Promise<void> {
  const currentConfig = await readOpenClawConfig();

  // Ensure nested structure exists
  if (!currentConfig.channels) {
    currentConfig.channels = {};
  }
  if (!currentConfig.channels.feishu) {
    currentConfig.channels.feishu = {};
  }
  if (!currentConfig.channels.feishu.accounts) {
    currentConfig.channels.feishu.accounts = {};
  }

  // Merge with existing config
  const existing = (currentConfig.channels.feishu.accounts as Record<string, FeishuAccountConfig>)[agentId] || {};
  (currentConfig.channels.feishu.accounts as Record<string, FeishuAccountConfig>)[agentId] = {
    ...existing,
    ...config,
  };

  // Ensure channel is enabled
  currentConfig.channels.feishu.enabled = true;
  currentConfig.channels.feishu.dmPolicy = currentConfig.channels.feishu.dmPolicy ?? 'open';
  currentConfig.channels.feishu.allowFrom = currentConfig.channels.feishu.allowFrom ?? ['*'];

  await writeOpenClawConfig(currentConfig);

  logger.info('Feishu account config saved', {
    agentId,
    configFile: CONFIG_FILE,
    enabled: config.enabled,
    paired: config.paired,
  });
}

/**
 * Get Feishu configuration for a specific agent
 */
export async function getFeishuAccountConfig(
  agentId: string
): Promise<FeishuAccountConfig | null> {
  const config = await readOpenClawConfig();
  const accounts = config.channels?.feishu?.accounts as Record<string, FeishuAccountConfig> | undefined;

  if (!accounts || !accounts[agentId]) {
    return null;
  }

  return accounts[agentId];
}

/**
 * Delete Feishu configuration for an agent
 */
export async function deleteFeishuAccountConfig(agentId: string): Promise<void> {
  const currentConfig = await readOpenClawConfig();

  const accounts = currentConfig.channels?.feishu?.accounts as Record<string, FeishuAccountConfig> | undefined;
  if (accounts && accounts[agentId]) {
    delete accounts[agentId];

    // If no more accounts, optionally disable the channel
    const remainingAccounts = Object.keys(accounts).length;
    logger.info(`Deleted Feishu config for ${agentId}, remaining accounts: ${remainingAccounts}`);

    await writeOpenClawConfig(currentConfig);
  }
}

/**
 * Initialize empty Feishu config for a new agent
 * Called when agent is created
 */
export async function initFeishuAccountConfig(agentId: string): Promise<void> {
  const currentConfig = await readOpenClawConfig();

  if (!currentConfig.channels) {
    currentConfig.channels = {};
  }
  if (!currentConfig.channels.feishu) {
    currentConfig.channels.feishu = {};
  }
  if (!currentConfig.channels.feishu.accounts) {
    currentConfig.channels.feishu.accounts = {};
  }

  const accounts = currentConfig.channels.feishu.accounts as Record<string, FeishuAccountConfig>;

  // Only init if not exists
  if (!accounts[agentId]) {
    accounts[agentId] = {
      enabled: false,
      paired: false,
    };

    await writeOpenClawConfig(currentConfig);
    logger.info(`Initialized empty Feishu config for new agent: ${agentId}`);
  }
}
```

### 3. 修改 saveChannelConfig 中的飞书处理

更新原有的飞书处理逻辑，确保兼容多账号模式：

```typescript
// Special handling for Feishu: support both legacy and multi-agent modes
if (channelType === 'feishu') {
  const existingConfig = currentConfig.channels[channelType] || {};

  // Preserve existing accounts when saving top-level config
  transformedConfig.accounts = existingConfig.accounts || {};

  // Set defaults
  transformedConfig.dmPolicy = transformedConfig.dmPolicy ?? existingConfig.dmPolicy ?? 'open';
  let allowFrom = transformedConfig.allowFrom ?? existingConfig.allowFrom ?? ['*'];
  if (!Array.isArray(allowFrom)) {
    allowFrom = [allowFrom];
  }
  if (transformedConfig.dmPolicy === 'open' && !allowFrom.includes('*')) {
    allowFrom = [...allowFrom, '*'];
  }
  transformedConfig.allowFrom = allowFrom;
}
```

## 修改 agents.ts Store

### Agent 创建时初始化飞书配置

在 `createAgent` 函数中添加：

```typescript
createAgent: async ({ agentId, displayName, emoji, workspace }) => {
  set({ loading: true });
  try {
    // Step 0: 先保存显示名称到本地缓存（乐观更新）
    const currentNames = get().agentDisplayNames;
    const newNames = { ...currentNames, [agentId]: displayName };
    set({ agentDisplayNames: newNames });
    saveAgentDisplayNames(newNames);

    // Step 1: Create agent with English ID
    const workspacePath = workspace || `D:\\TheClaw\\.openclaw\\workspace-${agentId}`;
    await invokeIpc('gateway:rpc', 'agents.create', {
      name: agentId,
      workspace: workspacePath,
      emoji: emoji || '🤖',
    });

    // Step 2: Set display name via update with retries
    const updateDisplayName = async (retries = 3, delay = 1500) => {
      for (let i = 0; i < retries; i++) {
        try {
          await invokeIpc('gateway:rpc', 'agents.update', {
            agentId,
            name: displayName,
          });
          return;
        } catch (err) {
          if (i < retries - 1) {
            await new Promise((r) => setTimeout(r, delay));
          } else {
            throw err;
          }
        }
      }
    };
    await updateDisplayName();

    // Step 3: Copy template files via Electron IPC
    await invokeIpc('agent:copyTemplates', {
      agentId,
      workspaceDir: workspacePath,
    }).catch(err => console.warn('Template copy failed:', err));

    // Step 4: Initialize empty Feishu config for this agent
    await invokeIpc('feishu:initAccountConfig', { agentId })
      .catch(err => console.warn('Feishu config init failed:', err));

    await get().fetchAgents();
    dispatchAgentsUpdated();
  } finally {
    set({ loading: false });
  }
},
```

### Agent 删除时清理飞书配置

在 `deleteAgent` 函数中添加：

```typescript
deleteAgent: async (agentId) => {
  // ... existing code ...

  try {
    // Step 1: Delete agent config via Gateway API
    await invokeIpc('gateway:rpc', 'agents.delete', { agentId });

    // Step 2: Cleanup matching files via Electron IPC
    await invokeIpc('agent:cleanupFiles', { agentId }).catch(err =>
      console.warn('File cleanup failed:', err)
    );

    // Step 3: Cleanup Feishu config
    await invokeIpc('feishu:deleteAccountConfig', { agentId }).catch(err =>
      console.warn('Feishu config cleanup failed:', err)
    );

    // Step 4: 清理本地缓存的显示名称
    // ... existing code ...
  } catch (error) {
    // ... existing code ...
  }
},
```

## 修改 IPC Handlers

添加新的 IPC handler 用于初始化/删除飞书配置：

```typescript
/**
 * Initialize empty Feishu config for a new agent
 */
ipcMain.handle(
  'feishu:initAccountConfig',
  async (_, params: { agentId: string }): Promise<{ success: boolean }> => {
    const { agentId } = params;
    try {
      const { initFeishuAccountConfig } = await import('../utils/channel-config');
      await initFeishuAccountConfig(agentId);
      return { success: true };
    } catch (error) {
      logger.error(`[feishu:initAccountConfig] Failed for ${agentId}:`, error);
      return { success: false };
    }
  }
);

/**
 * Delete Feishu account configuration
 */
ipcMain.handle(
  'feishu:deleteAccountConfig',
  async (_, params: { agentId: string }): Promise<{ success: boolean }> => {
    const { agentId } = params;
    try {
      const { deleteFeishuAccountConfig } = await import('../utils/channel-config');
      await deleteFeishuAccountConfig(agentId);
      return { success: true };
    } catch (error) {
      logger.error(`[feishu:deleteAccountConfig] Failed for ${agentId}:`, error);
      return { success: false };
    }
  }
);
```

## 配置文件示例

### 初始状态（新 Agent）

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "dmPolicy": "open",
      "allowFrom": ["*"],
      "accounts": {
        "data-cleaner": {
          "enabled": false,
          "paired": false
        }
      }
    }
  }
}
```

### 配置 AppID/Secret 后（未配对）

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "dmPolicy": "open",
      "allowFrom": ["*"],
      "accounts": {
        "data-cleaner": {
          "enabled": true,
          "appId": "cli_a9f6d8b1adb85cca",
          "appSecret": "TVj9CyZNdIXC0OZGdcxMPhGnhQ2Sj3gB",
          "paired": false
        }
      }
    }
  }
}
```

### 配对完成后

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "dmPolicy": "open",
      "allowFrom": ["*"],
      "accounts": {
        "data-cleaner": {
          "enabled": true,
          "appId": "cli_a9f6d8b1adb85cca",
          "appSecret": "TVj9CyZNdIXC0OZGdcxMPhGnhQ2Sj3gB",
          "paired": true,
          "pairedAt": "2026-03-09T10:30:00.000Z"
        },
        "copywriter": {
          "enabled": true,
          "appId": "cli_b2c3d4e5f6g7h8i9",
          "appSecret": "SecretForCopywriterAgent",
          "paired": true,
          "pairedAt": "2026-03-09T11:00:00.000Z"
        }
      }
    }
  }
}
```

## 向后兼容性

确保与旧版配置的兼容性：

```typescript
/**
 * Migrate legacy Feishu config to multi-agent format
 * If there's a top-level feishu config without accounts,
 * create a 'default' account with those settings
 */
export async function migrateLegacyFeishuConfig(): Promise<void> {
  const config = await readOpenClawConfig();
  const feishuConfig = config.channels?.feishu;

  if (!feishuConfig) return;

  // Check if already migrated (has accounts)
  if (feishuConfig.accounts && Object.keys(feishuConfig.accounts).length > 0) {
    return;
  }

  // Check if there's legacy config (has appId but no accounts)
  if (feishuConfig.appId) {
    logger.info('Migrating legacy Feishu config to multi-agent format');

    feishuConfig.accounts = {
      main: {
        enabled: feishuConfig.enabled ?? true,
        appId: feishuConfig.appId,
        appSecret: feishuConfig.appSecret,
        paired: true, // Assume paired if it was working
      }
    };

    // Remove legacy fields from top level
    delete (feishuConfig as Record<string, unknown>).appId;
    delete (feishuConfig as Record<string, unknown>).appSecret;

    await writeOpenClawConfig(config);
    logger.info('Feishu config migration complete');
  }
}
```

## 导出更新

确保在 `channel-config.ts` 中导出新增函数：

```typescript
export {
  saveFeishuAccountConfig,
  getFeishuAccountConfig,
  deleteFeishuAccountConfig,
  initFeishuAccountConfig,
  migrateLegacyFeishuConfig,
};
```
