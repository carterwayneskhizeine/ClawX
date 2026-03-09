# 02 — API 客户端层设计与实现

## 为什么需要新的 HTTP 客户端

ClawX 已有 `src/lib/api-client.ts`，但它是面向 **Electron IPC / Gateway RPC** 的多协议传输层。后端业务 API（登录、算力、充值等）是标准 REST 服务，需要一个独立的 HTTP 客户端。

参考实现：`D:\Code\openclaw-manager\src\lib\api.ts`

## 新建文件：`src/lib/auth-api.ts`

### 结构概览

```typescript
// 1. 基础配置
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ai-api.fantasy-lab.com';

// 2. TypeScript 接口（从 openclaw-manager 复制）
// 3. 通用请求函数 request<T>()
// 4. 导出 authApi 对象
```

### TypeScript 接口定义

从 openclaw-manager 的 `src/lib/api.ts` 复制以下接口：

```typescript
/** 用户信息 */
export interface UserInfo {
    user_id: string;
    username: string;
    org_id: string;
    org_name?: string;
}

/** 鉴权响应 */
export interface AuthResponse extends UserInfo {
    token: string;
}

/** 登录请求 */
export interface LoginRequest {
    username: string;
    password: string;
}

/** 注册请求 */
export interface RegisterRequest {
    username: string;
    password: string;
    org_name?: string;
}

/** NewAPI 令牌响应 — 核心：动态模型配置 */
export interface NewApiTokenResponse {
    newapi_base_url: string;
    newapi_token: string;
}

/** 算力余额 */
export interface ComputeBalanceResponse {
    user_id: string;
    compute_balance: number;
    token_equivalent: number;
    valid_until: string | null;
    today_consumption: number;
    month_total_consumption: number;
    month_avg_consumption: number;
}

/** 算力流水项 */
export interface ComputeLedgerItem {
    id: string;
    delta_compute: number;
    delta_tokens: number;
    snapshot_rate_p: number;
    type: string;
    ref_id: string | null;
    remark: string | null;
    created_at: number;
    balance_after: number;
    task_name: string;
}

/** 算力流水响应 */
export interface ComputeLedgerResponse {
    items: ComputeLedgerItem[];
    total: number;
}

/** 充值套餐 */
export interface RechargePackage {
    package_id: string;
    name: string;
    original_price_cents: number;
    current_price_cents: number;
    compute_amount: number;
}

/** 充值套餐列表响应 */
export interface RechargePackagesResponse {
    items: RechargePackage[];
}
```

### 通用请求函数

```typescript
import { useAuthStore } from '@/stores/auth';

async function request<T>(
    path: string,
    options: RequestInit = {},
    isBinary = false
): Promise<T> {
    const url = `${API_BASE_URL}${path}`;

    // 从 Zustand store 读取 token（不直接读 localStorage）
    const token = useAuthStore.getState().token;

    const headers: HeadersInit = { ...options.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        let errorMessage = '请求失败';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
            errorMessage = `HTTP error! status: ${response.status}`;
        }

        // 401 时自动清除过期 token
        if (response.status === 401) {
            useAuthStore.getState().logout();
        }

        throw new Error(errorMessage);
    }

    if (isBinary) return (await response.blob()) as unknown as T;
    return response.json();
}
```

**与 openclaw-manager 的差异**：
- 使用 `useAuthStore.getState().token` 而非直接 `localStorage.getItem('auth_token')`，保持与 ClawX Zustand 架构一致
- 新增 401 自动登出处理

### 导出 API 对象

```typescript
export const authApi = {
    // 认证
    login: (data: LoginRequest) =>
        request<AuthResponse>('/api/login', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    register: (data: RegisterRequest) =>
        request<AuthResponse>('/api/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // 用户信息
    getMe: () => request<UserInfo>('/api/me'),

    // 动态模型配置 — 登录后最关键的接口
    getNewApiToken: () => request<NewApiTokenResponse>('/api/me/newapi-token'),

    // 算力
    getComputeBalance: () =>
        request<ComputeBalanceResponse>('/api/me/compute-balance'),

    getComputeLedger: (params: { limit?: number; offset?: number } = {}) => {
        const query = new URLSearchParams();
        if (params.limit !== undefined) query.append('limit', params.limit.toString());
        if (params.offset !== undefined) query.append('offset', params.offset.toString());
        const qs = query.toString();
        return request<ComputeLedgerResponse>(
            `/api/me/compute-ledger${qs ? `?${qs}` : ''}`
        );
    },

    // 充值套餐（后续充值页使用）
    getRechargePackages: () =>
        request<RechargePackagesResponse>('/api/recharge/packages'),
};
```

### 环境变量

在 `.env` 或 `.env.local` 中可覆盖 API 地址：

```
VITE_API_URL=https://ai-api.fantasy-lab.com
```

开发时如需指向本地后端：

```
VITE_API_URL=http://localhost:3000
```
