# 05 — 个人信息页真实数据对接

## 当前状态

`src/pages/Profile/index.tsx` 使用硬编码的 MOCK 数据（L29-35）：

```typescript
const MOCK_USER = {
    username: 'Carter Wayne',
    accountName: 'carter_nx_01',
    organization: 'OpenClaw AI 科技有限公司',
    email: 'carter@example.com',
    avatar: 'https://picsum.photos/seed/clawx-profile/300'
};
```

## 修改步骤

### 1. 从 auth store 读取用户信息

```typescript
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/lib/auth-api';

export function Profile() {
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);
    const [loading, setLoading] = useState(!user);

    // 如果 store 中没有用户信息，主动拉取
    useEffect(() => {
        if (!user) {
            authApi.getMe()
                .then((info) => setUser(info))
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [user, setUser]);

    if (loading) {
        return <LoadingSkeleton />;
    }

    // ...
}
```

### 2. 字段映射

| API 字段 (`UserInfo`) | UI 显示 | 说明 |
|----------------------|---------|------|
| `username` | 用户名 | 直接显示 |
| `user_id` | 账号 ID | 替代原来的 `accountName` |
| `org_name` | 所属组织 | 可能为 `undefined`，显示 "个人用户" 作为兜底 |

### 3. 替换引用

```typescript
// 替换前
<InfoItem icon={User} label="用户名" value={MOCK_USER.username} />
<InfoItem icon={IdCard} label="账号 ID" value={MOCK_USER.accountName} />
<InfoItem icon={Building2} label="所属组织" value={MOCK_USER.organization} />

// 替换后
<InfoItem icon={User} label="用户名" value={user?.username ?? '-'} />
<InfoItem icon={IdCard} label="账号 ID" value={user?.user_id ?? '-'} />
<InfoItem icon={Building2} label="所属组织" value={user?.org_name ?? '个人用户'} />
```

### 4. 头像处理

当前使用随机图片 URL。用户真实头像 API 暂未提供，可选方案：

- 保持使用生成头像（基于用户名 hash）
- 使用 `AvatarFallback` 显示用户名首字母

```typescript
<AvatarFallback className="text-4xl">
    {user?.username?.charAt(0)?.toUpperCase() ?? 'U'}
</AvatarFallback>
```

### 5. 删除 MOCK_USER

修改完成后删除整个 `MOCK_USER` 常量定义。

### 6. 密码修改

`ResetPasswordDialog` 当前无后端 API。如需对接：

- 后端需提供 `POST /api/me/change-password` 接口
- 暂时保留现有 UI，按钮点击时 toast 提示"功能开发中"

```typescript
const handleResetPassword = async () => {
    toast.info('密码修改功能开发中');
};
```
