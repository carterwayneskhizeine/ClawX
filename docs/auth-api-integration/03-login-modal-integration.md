# 03 — LoginModal 真实登录/注册对接

## 当前状态

`src/components/auth/LoginModal.tsx` 使用 mock 登录逻辑（L35-46）：

```typescript
// 当前：setTimeout 模拟 + 硬编码 token
setTimeout(() => {
    setLoading(false);
    if (username === 'admin' && password === 'admin') {
        onSuccess('mock-jwt-token');
    } else if (username && password) {
        onSuccess('mock-jwt-token-guest');
    } else {
        setError('用户名或密码不能为空');
    }
}, 1000);
```

## 修改步骤

### 1. 扩展 `src/stores/auth.ts`

当前 store 只存 `token` 和 `isLocalMode`，需要增加用户信息：

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 从 auth-api.ts 导入类型
import type { UserInfo } from '@/lib/auth-api';

interface AuthState {
    token: string | null;
    user: UserInfo | null;          // 新增
    isLocalMode: boolean;

    setToken: (token: string | null) => void;
    setUser: (user: UserInfo | null) => void;  // 新增
    setLocalMode: (value: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isLocalMode: false,

            setToken: (token) => set({ token, isLocalMode: false }),
            setUser: (user) => set({ user }),
            setLocalMode: (isLocalMode) => set({ isLocalMode, token: null, user: null }),
            logout: () => set({ token: null, user: null, isLocalMode: false }),
        }),
        {
            name: 'clawx-auth',
        }
    )
);
```

### 2. 修改 `LoginModal.tsx` 中的 `handleSubmit`

```typescript
import { authApi } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/auth';

// 在 handleSubmit 中替换 mock 逻辑：
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
        setError('请先阅读并同意用户协议');
        return;
    }

    if (!username || !password) {
        setError('用户名或密码不能为空');
        return;
    }

    setLoading(true);
    setError('');

    try {
        if (mode === 'register') {
            const result = await authApi.register({
                username,
                password,
                org_name: orgName || undefined,
            });
            // 保存用户信息到 store
            useAuthStore.getState().setUser(result);
            onSuccess(result.token);
        } else {
            const result = await authApi.login({ username, password });
            useAuthStore.getState().setUser(result);
            onSuccess(result.token);
        }
    } catch (err: any) {
        setError(err.message || '操作失败，请稍后重试');
    } finally {
        setLoading(false);
    }
};
```

### 3. 不需要改的部分

- UI 布局和 CSS 无需改动
- `onSuccess(token)` 回调接口不变 — `App.tsx` 中已有 `setToken` 处理
- 微信扫码登录区域保持"暂未开放"状态
- 本地模式入口 `onLocalMode` 保持不变
- 用户协议弹窗不变

### 4. 错误场景处理

后端返回的错误信息会通过 `request()` 函数解析后抛出，常见错误：

| HTTP 状态码 | 含义 | 用户看到的提示 |
|-------------|------|---------------|
| 400 | 参数错误 | 后端返回的 `message` 字段 |
| 401 | 密码错误/token 过期 | "用户名或密码错误" |
| 409 | 用户名已存在（注册） | "该用户名已被注册" |

现有的 `<div className="login-error-msg">{error}</div>` 已能展示这些错误，无需额外改动。
