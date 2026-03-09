# 01 — 总览：用户登录与动态模型 API 对接

## 目标

将 ClawX 新 UI 中的登录、个人信息、算力积分等页面从 **MOCK 数据** 切换到 **真实后端 API** 调用，并在登录后自动将服务器返回的模型配置写入 `openclaw.json`，实现动态模型切换。

## 后端 API

| 项 | 说明 |
|----|------|
| **Base URL** | `https://ai-api.fantasy-lab.com` |
| **鉴权** | `Authorization: Bearer <JWT>`（登录/注册接口除外） |
| **OpenAPI 文档** | `https://ai-api.fantasy-lab.com/api-docs` |
| **完整接口文档** | 见 `docs/api-for-frontend.md` |

## 参考实现

`D:\Code\openclaw-manager` 已完成相同功能的对接，核心参考文件：

- `src/lib/api.ts` — HTTP 客户端与所有接口定义
- `src/core/auth.ts` — AuthService（token/user 管理）
- `src/App.tsx`（L243-286）— 登录后自动同步 newapi-token 到网关

## 核心数据流

```
┌─────────────┐    POST /api/login     ┌──────────────┐
│  LoginModal  │ ─────────────────────> │  后端服务器   │
│  (Renderer)  │ <───── JWT + UserInfo  │              │
└──────┬──────┘                        └──────────────┘
       │ setToken(jwt)
       ▼
┌──────────────┐   GET /api/me/newapi-token   ┌──────────────┐
│ useAuthStore │ ────────────────────────────> │  后端服务器   │
│  (Zustand)   │ <── { base_url, token }      │              │
└──────┬──────┘                               └──────────────┘
       │ invokeIpc('provider:save', ...)
       ▼
┌──────────────┐   syncProviderConfigToOpenClaw()
│ Electron Main│ ──────────────────────────────>  ~/.openclaw/openclaw.json
│ (IPC Handler)│   updateAgentModelProvider()
│              │   saveProviderKeyToOpenClaw()
└──────┬──────┘
       │ gatewayManager.debouncedRestart()
       ▼
┌──────────────┐
│   Gateway    │  使用新 baseUrl + apiKey 调用模型
│  (OpenClaw)  │  可用模型：kimi-k2.5, MiniMax-M2.5, glm-5
└──────────────┘
```

## 需要修改/新建的文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/auth-api.ts` | **新建** | 后端 HTTP 客户端（仅用于业务 API，非 IPC） |
| `src/stores/auth.ts` | **修改** | 扩展 `user` 字段，增加 `setUser` / `fetchUserInfo` |
| `src/components/auth/LoginModal.tsx` | **修改** | 替换 mock setTimeout 为真实 API 调用 |
| `src/App.tsx` | **修改** | 添加登录后 useEffect — 获取 newapi-token → 写入 provider 配置 |
| `src/pages/Profile/index.tsx` | **修改** | 移除 MOCK_USER，读取 auth store 中的真实用户信息 |
| `src/pages/ComputePoints/index.tsx` | **修改** | 调用 compute-balance / compute-ledger API |
| `src/pages/ComputePoints/constants.ts` | **修改** | 清理 MOCK 数据（可保留 UI 常量） |

## 建议实施顺序

1. 创建 `src/lib/auth-api.ts`（独立，无依赖）→ 见 [02-api-client-layer.md](02-api-client-layer.md)
2. 扩展 `src/stores/auth.ts` → 见 [03-login-modal-integration.md](03-login-modal-integration.md)
3. 修改 LoginModal 为真实登录 → 见 [03-login-modal-integration.md](03-login-modal-integration.md)
4. 添加登录后 newapi-token 同步 → 见 [04-newapi-token-flow.md](04-newapi-token-flow.md)
5. 更新 Profile 页 → 见 [05-profile-page.md](05-profile-page.md)
6. 更新 ComputePoints 页 → 见 [06-compute-points-page.md](06-compute-points-page.md)
