# 04 — 登录后动态模型 API 配置流程

## 核心目标

登录成功后，调用 `GET /api/me/newapi-token` 获取服务器分配的模型 API 凭证（`newapi_base_url` + `newapi_token`），然后通过 Electron IPC 将其写入 `openclaw.json`，使 Gateway 能够使用这些模型。

## 参考实现

openclaw-manager 的 `src/App.tsx`（L243-286）：

```typescript
// 登录后自动同步
useEffect(() => {
    if (isAuthenticated) {
        const syncAuth = async () => {
            const newApi = await AuthService.getNewApiToken();
            if (newApi?.newapi_base_url && newApi?.newapi_token) {
                let wsUrl = newApi.newapi_base_url;
                // 转换 http → ws ...
                const settings = loadSettings();
                if (!settings.token || settings.gatewayUrl !== wsUrl) {
                    saveSettings({ ...settings, gatewayUrl: wsUrl, token: newApi.newapi_token });
                    connect(wsUrl, "", newApi.newapi_token);
                }
            }
        };
        syncAuth();
    }
}, [isAuthenticated]);
```

**关键差异**：openclaw-manager 是 WebSocket 网关模式（远程），ClawX 是本地 Gateway + `openclaw.json` 配置模式。所以 ClawX 不需要转换 ws 协议，而是需要写入配置文件。

## ClawX 实现方案

### 方案 A：复用现有 `provider:save` IPC（推荐）

利用已有的 `electron/main/ipc-handlers.ts` 中的 `provider:save` 处理器。

#### 在 `src/App.tsx` 中添加 useEffect

```typescript
import { authApi } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/auth';
import { invokeIpc } from '@/lib/api-client';

// 在 App 组件或 MainLayout 中：
useEffect(() => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    const syncCloudModels = async () => {
        try {
            // 1. 从服务器获取动态模型 API 凭证
            const { newapi_base_url, newapi_token } = await authApi.getNewApiToken();

            if (!newapi_base_url || !newapi_token) {
                console.warn('未获取到有效的模型 API 配置');
                return;
            }

            // 2. 通过 IPC 保存 provider 配置
            //    type='custom' 触发 updateAgentModelProvider 逻辑
            await invokeIpc('provider:save', {
                id: 'cloud-api',
                name: '云端模型服务',
                type: 'custom',
                baseUrl: `${newapi_base_url}/v1`,  // 确保以 /v1 结尾
                model: 'kimi-k2.5',  // 默认模型
                enabled: true,
            }, newapi_token);  // 第二参数为 apiKey

            // 3. 设置为默认模型
            await invokeIpc('provider:setDefault', 'cloud-api', 'kimi-k2.5');

            console.log('云端模型配置已同步');
        } catch (err) {
            console.error('同步云端模型配置失败:', err);
        }
    };

    syncCloudModels();
}, [/* token 变化时触发 */]);
```

#### `provider:save` 内部流程追踪

```
invokeIpc('provider:save', config, apiKey)
  │
  ├─ saveProvider(config)                    // 保存到 electron-store
  ├─ storeApiKey('cloud-api', apiKey)        // 保存密钥到安全存储
  ├─ saveProviderKeyToOpenClaw(ock, apiKey)   // 写入 auth-profiles.json
  ├─ syncProviderConfigToOpenClaw(ock, ...)   // 写入 openclaw.json models.providers
  ├─ updateAgentModelProvider(ock, {...})     // 写入 agents/*/agent/models.json
  └─ gatewayManager.debouncedRestart()       // 重启 gateway 加载新配置
```

### 方案 B：新建专用 IPC 通道

如果 `provider:save` 的通用逻辑不完全适配（如需要注册多个模型），可以新建 IPC 通道。

#### 在 `electron/main/ipc-handlers.ts` 中添加：

```typescript
ipcMain.handle('auth:sync-cloud-models', async (_, payload: {
    baseUrl: string;
    apiKey: string;
    models: Array<{ id: string; name: string }>;
}) => {
    const providerKey = 'cloud-api';

    // 1. 写入 openclaw.json
    await syncProviderConfigToOpenClaw(providerKey, payload.models[0]?.id, {
        baseUrl: payload.baseUrl,
        api: 'openai-completions',
    });

    // 2. 写入所有 agent 的 models.json（包含全部模型）
    await updateAgentModelProvider(providerKey, {
        baseUrl: payload.baseUrl,
        api: 'openai-completions',
        models: payload.models,
        apiKey: payload.apiKey,
    });

    // 3. 保存 API key 到 auth-profiles.json
    await saveProviderKeyToOpenClaw(providerKey, payload.apiKey);

    // 4. 设为默认模型
    await setOpenClawDefaultModel(providerKey, `${providerKey}/${payload.models[0]?.id}`);

    // 5. 重启 gateway
    gatewayManager.debouncedRestart();

    return { success: true };
});
```

#### 前端调用：

```typescript
await invokeIpc('auth:sync-cloud-models', {
    baseUrl: `${newapi_base_url}/v1`,
    apiKey: newapi_token,
    models: [
        { id: 'kimi-k2.5', name: 'kimi-k2.5' },
        { id: 'MiniMax-M2.5', name: 'MiniMax-M2.5' },
        { id: 'glm-5', name: 'glm-5' },
    ],
});
```

**注意**：选择方案 B 时需要在 `electron/preload/index.ts` 的白名单中添加 `'auth:sync-cloud-models'`。

## 写入后的 openclaw.json 预期结构

```json
{
  "models": {
    "providers": {
      "cloud-api": {
        "baseUrl": "http://8.140.19.149:3000/v1",
        "api": "openai-completions",
        "apiKey": "<从 auth-profiles 读取>",
        "models": [
          { "id": "kimi-k2.5", "name": "kimi-k2.5" },
          { "id": "MiniMax-M2.5", "name": "MiniMax-M2.5" },
          { "id": "glm-5", "name": "glm-5" }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "cloud-api/kimi-k2.5",
        "fallbacks": []
      }
    }
  }
}
```

## 触发时机

| 场景 | 处理 |
|------|------|
| 用户首次登录 | 获取 newapi-token → 写入配置 → 重启 gateway |
| 用户再次打开应用（已有 token） | 检查 token 有效性 → 刷新 newapi-token → 如有变化则更新配置 |
| Token 过期（401） | `request()` 中自动 logout → 用户重新登录 |

## 关键引用文件

- `electron/utils/openclaw-auth.ts` — `syncProviderConfigToOpenClaw()`、`updateAgentModelProvider()`、`saveProviderKeyToOpenClaw()`、`setOpenClawDefaultModel()`
- `electron/main/ipc-handlers.ts` L1908 — `provider:save` 处理器
- `electron/preload/index.ts` L74 — IPC 白名单
