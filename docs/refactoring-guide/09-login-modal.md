# 09 - 登录弹窗

## 新建文件: `src/components/common/LoginModal.tsx`

登录弹窗提供两种模式：
1. **远程登录** — 连接到 `ai-api.fantasy-lab.com` 认证
2. **本地模式** — 跳过登录，直接使用本地 Gateway

---

## 完整代码

```tsx
/**
 * Login Modal
 * Authentication dialog with local mode bypass.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Monitor } from 'lucide-react';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess: (token: string) => void;
  onLocalMode: () => void;
}

export function LoginModal({
  open,
  onOpenChange,
  onLoginSuccess,
  onLocalMode,
}: LoginModalProps) {
  const [isLogin, setIsLogin] = useState(true);  // true = login, false = register
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = 'https://ai-api.fantasy-lab.com';

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || (isLogin ? '登录失败' : '注册失败'));
      }

      if (data.token) {
        onLoginSuccess(data.token);
        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalMode = () => {
    onLocalMode();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative bg-background rounded-xl border shadow-2xl w-full max-w-sm mx-4 p-6">
        {/* Logo / Title */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🤖</div>
          <h2 className="text-xl font-bold">ClawX</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? '登录您的账户' : '创建新账户'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-username">用户名</Label>
            <Input
              id="login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入用户名"
              disabled={loading}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password">密码</Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              disabled={loading}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLogin ? '登录' : '注册'}
          </Button>

          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? '没有账户？立即注册' : '已有账户？去登录'}
          </Button>

          {/* 分隔线 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">或</span>
            </div>
          </div>

          {/* 本地模式 */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleLocalMode}
          >
            <Monitor className="h-4 w-4" />
            使用本地模式
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            本地模式不需要登录，数据仅保存在本机
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## 使用方式

在 `App.tsx` 或 `HomeDashboard` 中集成：

```tsx
import { LoginModal } from '@/components/common/LoginModal';

// 在组件中
const [showLogin, setShowLogin] = useState(false);

// 判断是否需要登录（可选 — 本地模式可跳过）
useEffect(() => {
  const token = localStorage.getItem('clawx:auth-token');
  const isLocalMode = localStorage.getItem('clawx:local-mode') === 'true';
  if (!token && !isLocalMode) {
    setShowLogin(true);
  }
}, []);

// JSX
<LoginModal
  open={showLogin}
  onOpenChange={setShowLogin}
  onLoginSuccess={(token) => {
    localStorage.setItem('clawx:auth-token', token);
  }}
  onLocalMode={() => {
    localStorage.setItem('clawx:local-mode', 'true');
  }}
/>
```

---

## 要点说明

### 关于认证的设计决策

1. **本地模式优先**: ClawX 作为桌面应用，用户很可能直接使用本地 Gateway，无需远程认证。因此"本地模式"按钮应该突出显示。
2. **可选远程登录**: 如果未来需要云端能力（同步、计费），可以通过登录连接到远程 API。
3. **Token 存储**: 使用 `localStorage` 存储 token，key 前缀 `clawx:` 避免冲突。

### 此弹窗何时显示

- 首次启动且未选择本地模式时
- 用户主动点击"登录"按钮时（可在 Profile 页面或 Sidebar 提供入口）
- Token 过期后（可选）
