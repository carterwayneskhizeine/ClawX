# 算力积分 (ComputePoints.tsx) UI 设计分析

## 页面结构

入场动画: `animate-in fade-in slide-in-from-bottom-4 duration-500`, space-y-8

### Header
- 主标题: `Title level={2} !mb-1` → "算力积分"
- 副标题: "监控并管理您的系统消耗"
- "充值算力积分" 按钮:
  ```
  type="primary" size="large"
  icon={<CreditCardOutlined />}
  rounded-full font-bold h-12 px-8
  shadow-lg shadow-blue-100 dark:shadow-blue-900/20
  ```

### Dashboard Section

`grid grid-cols-1 lg:grid-cols-3 gap-6`

#### 左侧: 积分卡 (lg:col-span-1)
```
bg-gradient-to-br from-blue-600 to-blue-800
dark: from-[#1c1c1c] to-[#141414] + border border-white/5
p-8 rounded-[2rem] shadow-xl text-white
flex flex-col justify-between
```

内容:
- **标签**: `ThunderboltOutlined` + "剩余算力积分" (text-base font-bold uppercase tracking-wider, opacity-80, mb-6)
- **数字**: `text-6xl font-black` (如 "12,500")
- **分割线**: `mt-8 pt-8 border-t border-white/10`
- **今日消耗**: `text-xs text-blue-200 dark:text-slate-500` + `text-lg font-bold`
- **本月平均**: 同上

#### 右侧: 趋势图 (lg:col-span-2)
```
bg-white dark:bg-[#1c1c1c] p-6 rounded-[2rem]
shadow-sm border border-slate-100 dark:border-white/5
```

- **标题行**: "算力积分消耗趋势（近30天）" + Tag "实时更新"
  - Tag: `color="blue" rounded-full px-3 py-1 font-bold border-none bg-blue-50 dark:bg-blue-900/30`
- **图表**: Recharts `AreaChart`, 高 250px
  - 渐变填充: `linearGradient colorUsage` (从 `#1677ff` opacity 0.1 → 0)
  - 线条: `stroke="#1677ff" strokeWidth={3}`
  - X轴: `{day}日` 格式

### 消耗记录 Section

```
Card rounded-[2rem] shadow-sm overflow-hidden
body padding: 0
```

**Header**: `px-8 py-6 border-b` + `HistoryOutlined` + "算力积分消耗记录"

**Table**:
- 列: 任务名称 | 执行时间 (起止双行) | 耗时 | 消耗/充值积分 | 剩余积分
- 充值: `text-green-500 +积分`, 消耗: `text-blue-600 -积分`
- 分页: `pageSize: 15, showQuickJumper, position: bottomCenter`

## 充值 Modal

```
Modal open={showRecharge} footer={null}
closeIcon: text-slate-400 hover:text-slate-600
width={576} centered
styles.content: { padding: 0, borderRadius: '1.25rem', overflow: 'hidden' }
```

### 结构
```
┌──────────────────────────────────────────┐
│ Header: px-8 py-5 border-b              │
│ "算力积分充值" (text-xl font-bold)        │
│ "选择适合您的套餐..." (Text secondary)    │
├──────────────────────────────────────────┤
│ 套餐 Grid: p-6 grid grid-cols-2 gap-4   │
│ ┌─────────┐ ┌─────────┐                │
│ │ Plan 1  │ │ Plan 2  │                │
│ ├─────────┤ ├─────────┤                │
│ │ Plan 3  │ │ Plan 4  │                │
│ │ [推荐]  │ │         │                │
│ └─────────┘ └─────────┘                │
├──────────────────────────────────────────┤
│ Footer: px-8 py-5                        │
│ bg-slate-50/80 dark:bg-[#1c1c1c]/80     │
│ border-t                                 │
│ 应付金额: ¥ {price}    [取消] [立即支付]   │
└──────────────────────────────────────────┘
```

### 套餐卡片
```
p-4 rounded-2xl border transition-all cursor-pointer relative group

选中: border-blue-500 bg-blue-50/20 dark:bg-blue-900/20
未选: border-slate-100 dark:border-white/5 hover:border-blue-200

图标方块: w-8 h-8 rounded-xl
  选中: bg-blue-500 text-white
  未选: bg-slate-50 dark:bg-white/5 text-slate-400

积分数字: text-2xl font-bold
标签: text-[10px] uppercase tracking-wider "算力积分"
价格: ¥{price} + 划线原价 ¥{price*1.5}

推荐标签 (Plan P3):
  absolute bottom-0 right-0
  bg-gradient-to-tr from-orange-500 to-amber-400
  text-white text-xs font-bold
  px-3 py-1 rounded-tl-2xl rounded-br-2xl shadow-sm
```

### Footer 按钮
- **取消**: `size="large" rounded-xl font-medium px-6`
- **立即支付**: `type="primary" size="large" rounded-xl font-bold px-8 shadow-sm shadow-blue-100`
- **金额显示**: `text-3xl font-bold text-blue-600 dark:text-blue-400 tracking-tight`
