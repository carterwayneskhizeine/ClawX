# 06 — 算力积分页真实数据对接

## 当前状态

`src/pages/ComputePoints/index.tsx` 使用以下 MOCK 数据（来自 `constants.ts`）：

- `MOCK_USER` — 包含 `points`（余额）
- `MOCK_COMPUTE_LOGS` — 算力流水记录
- `RECHARGE_PLANS` — 充值套餐
- `DATA_30_DAYS` — 随机生成的 30 天图表数据

## 修改步骤

### 1. 算力余额卡片

替换 `userPoints` 为 API 数据：

```typescript
import { authApi, type ComputeBalanceResponse } from '@/lib/auth-api';

const [balance, setBalance] = useState<ComputeBalanceResponse | null>(null);

useEffect(() => {
    authApi.getComputeBalance()
        .then(setBalance)
        .catch((err) => toast.error('获取算力余额失败: ' + err.message));
}, []);
```

字段映射：

| API 字段 | UI 显示 | 格式 |
|----------|---------|------|
| `compute_balance` | 剩余算力积分 | 数值，保留整数 |
| `today_consumption` | 今日消耗 | 数值 |
| `month_total_consumption` | 本月累计消耗 | 数值 |
| `month_avg_consumption` | 本月日均消耗 | 数值，保留 1 位小数 |
| `valid_until` | 有效期至 | 日期格式化（可能为 null，显示"永久有效"） |
| `token_equivalent` | 折算 Token 数 | 可选展示 |

### 2. 算力流水表格

替换 `MOCK_COMPUTE_LOGS` 为分页 API 数据：

```typescript
import { authApi, type ComputeLedgerItem } from '@/lib/auth-api';

const [logs, setLogs] = useState<ComputeLedgerItem[]>([]);
const [total, setTotal] = useState(0);
const [currentPage, setCurrentPage] = useState(1);

const ITEMS_PER_PAGE = 10;

useEffect(() => {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    authApi.getComputeLedger({ limit: ITEMS_PER_PAGE, offset })
        .then((res) => {
            setLogs(res.items);
            setTotal(res.total);
        })
        .catch((err) => toast.error('获取流水记录失败: ' + err.message));
}, [currentPage]);

const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
```

**注意**：当前是客户端分页（全量数据 slice），改为服务端分页后不再需要本地 slice。

字段映射（表格列）：

| API 字段 | 表格列名 | 格式化 |
|----------|---------|--------|
| `task_name` | 任务名称 | 直接显示 |
| `type` | 类型 | `consumption` → "消耗"，`recharge` → "充值" |
| `delta_compute` | 变动积分 | 正数显示 `+N`（绿色），负数显示 `-N`（红色） |
| `balance_after` | 剩余积分 | 数值 |
| `created_at` | 时间 | Unix 时间戳 → `new Date(created_at * 1000).toLocaleString()` |
| `remark` | 备注 | 可选列，可能为 null |

### 3. 30 天用量图表

当前使用随机数据 `DATA_30_DAYS`。两种方案，先使用方案 A：

**方案 A**：用流水数据聚合（推荐）
```typescript
// 拉取近 30 天数据（可能需要较大 limit）
const res = await authApi.getComputeLedger({ limit: 200 });
// 按天聚合 delta_compute
const byDay = new Map<string, number>();
res.items.forEach(item => {
    const day = new Date(item.created_at * 1000).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + Math.abs(item.delta_compute));
});
```

**方案 B**：保持示意图表，待后端提供专用图表接口后再对接。

### 4. 充值套餐

替换 `RECHARGE_PLANS` 常量：

```typescript
const [packages, setPackages] = useState<RechargePackage[]>([]);

useEffect(() => {
    authApi.getRechargePackages()
        .then((res) => setPackages(res.items))
        .catch((err) => console.warn('获取套餐失败:', err));
}, []);
```

字段映射：

| API 字段 | UI 显示 |
|----------|---------|
| `name` | 套餐名称 |
| `current_price_cents` | 现价（需 ÷ 100 转元） |
| `original_price_cents` | 原价（划线价，÷ 100） |
| `compute_amount` | 算力积分数 |
| `package_id` | 下单时传给创建订单 API |

### 5. 充值下单流程（后续）

当前 `handleRecharge` 是本地模拟加积分。完整充值流程：

1. 用户选择套餐 → `POST /api/recharge/orders` 或 `POST /api/recharge/orders-with-qr`
2. 获取 `code_url`（微信支付二维码链接）或直接 PNG
3. 展示二维码 → 用户扫码支付
4. 前端轮询 `GET /api/recharge/orders/:out_trade_no/status`（每 3 秒）
5. `status === 'success'` 后刷新余额

此流程可作为第二期实现，暂时在充值按钮上 toast 提示"充值功能对接中"。

### 6. 类型文件更新

`src/pages/ComputePoints/types.ts` 中的 `ComputeLog` 类型需要与 API 的 `ComputeLedgerItem` 对齐。建议：

- 直接使用 `ComputeLedgerItem`（从 `@/lib/auth-api` 导入），删除旧的 `ComputeLog` 类型
- 或在 `types.ts` 中 re-export：`export type { ComputeLedgerItem as ComputeLog } from '@/lib/auth-api';`

### 7. 清理 `constants.ts`

完成对接后：
- 删除 `MOCK_USER`
- 删除 `MOCK_COMPUTE_LOGS`
- `RECHARGE_PLANS` 可删除（改为 API 获取）
- 保留纯 UI 常量（如 `ITEMS_PER_PAGE`）
