# 首页仪表盘 (Home.tsx) UI 设计分析

## 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│ 入场动画: animate-in fade-in slide-in-from-bottom-4 500ms   │
│ space-y-8 (各区域间距 32px)                                  │
├─────────────────────────────────────────────────────────────┤
│ Header (flex justify-between items-start)                    │
│ ┌───────────────────────────┐ ┌──────────────────────────┐ │
│ │ 控制面板 (Title level=2)   │ │ 🔄 发现新版本 (Button)    │ │
│ │ 欢迎您，这是您的数字员工概览 │ │ bg-green-500            │ │
│ └───────────────────────────┘ └──────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 数字员工状态 Section                                         │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 标题行 (flex justify-between)                          │   │
│ │ "数字员工状态 ({count})"    [+ 创建员工] [⚙ 进入管理]   │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Grid Layout: 1/2/3/5 列 (响应式)                       │   │
│ │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐             │   │
│ │ │Card │ │Card │ │Card │ │Card │ │Card │             │   │
│ │ │     │ │     │ │     │ │     │ │     │             │   │
│ │ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘             │   │
│ └───────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ 算力统计仪表盘 Section (pb-12)                                │
│ ┌──────────────────────┐  ┌──────────────────────────────┐ │
│ │ 饼图 + 积分信息 Card   │  │ 柱状图 (近7天使用趋势) Card   │ │
│ │ (Col xs=24 lg=12)    │  │ (Col xs=24 lg=12)           │ │
│ └──────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 各元素详细分析

### Header 区域

#### 标题
- **主标题**: `Title level={2}` - "控制面板", `!mb-1`
- **副标题**: `Text type="secondary"` - "欢迎您，这是您的数字员工概览"

#### "发现新版本" 按钮
```
type="primary"
icon={<CloudDownloadOutlined />}
className="rounded-xl shadow-sm bg-green-500 hover:bg-green-600
           dark:bg-green-500 dark:hover:bg-green-400
           dark:text-white border-none
           flex items-center justify-center"
```

### 数字员工状态区域

#### 操作按钮组
| 按钮名 | 样式 | 图标 | onClick |
|--------|------|------|---------|
| **创建员工** | `type="primary" rounded-xl shadow-sm bg-blue-600 hover:bg-blue-500 border-none` | `PlusOutlined` | 打开编辑 Modal（新增模式）|
| **进入管理** | `rounded-xl shadow-sm` (default) | `SettingOutlined` | 打开管理 Modal |

#### 员工卡片 Grid

**布局**: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4`

**每张卡片**:
```
Card hoverable
className="text-center rounded-2xl border-slate-100
           dark:border-white/5 dark:bg-[#1c1c1c]
           min-h-[200px] flex flex-col justify-center"
body: { padding: '16px 20px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', height: '100%' }
onClick → 导航到 /employees/{id}
```

**卡片内容**:
```
┌─────────────────────┐
│                     │
│      ┌────────┐     │  ← Avatar src={avatar} size=64 shape="square"
│      │  头像   │     │     rounded-2xl border border-slate-100
│      └────────┘     │     dark:border-white/10
│      mb-3           │
│      员工名称        │  ← Title level=5, text-sm, truncate
│      mb-1           │
│      当前状态        │  ← Text text-xs, line-clamp-2
│      (颜色按状态)    │     IDLE→green, BUSY→amber, OFFLINE→red
│                     │
└─────────────────────┘
```

**空状态**: 加载中显示 `Spin size="large"`, 无员工显示灰色文字 "未发现活跃的数字员工"

### 算力统计仪表盘区域

**标题**: `Title level={4}` - "算力统计仪表盘"

**布局**: `Row gutter={[24, 24]}`，两列各 `Col xs={24} lg={12}`

#### 左侧 - 饼图 + 积分信息 Card

```
Card className="rounded-3xl border-slate-100 dark:border-white/5
               dark:bg-[#1c1c1c] h-full"
body padding: 24px
```

- **标签**: "算力积分配额" - `uppercase tracking-wider font-semibold text-xs dark:text-slate-500`
- **饼图**: Recharts `PieChart`
  - 数据: 已使用 vs 剩余
  - 类型: 环形图 (innerRadius=60, outerRadius=80)
  - 颜色: 已使用部分 `#e2e8f0` (light) / `rgba(255,255,255,0.05)` (dark), 剩余部分 `#1677ff`
  - `paddingAngle: 5`
- **积分数字**: `text-3xl font-black text-blue-600 dark:text-blue-500 drop-shadow-[0_0_10px_rgba(22,119,255,0.3)]`
- **今日消耗**: `text-xl font-bold text-slate-700 dark:text-slate-200`
- **"立即充值" 按钮**: `type="primary" size="large" rounded-xl font-bold shadow-lg shadow-blue-100`

#### 右侧 - 柱状图 Card

```
Card className="rounded-3xl border-slate-100 dark:border-white/5
               dark:bg-[#1c1c1c] h-full"
```

- **标签**: "近7天使用趋势"
- **图表**: Recharts `BarChart`
  - 数据: 周一~周日
  - 柱子: fill `#1677ff`, 圆角 `radius={[6, 6, 0, 0]}`
  - 网格线: `strokeDasharray="3 3"`, horizontal only
  - Tooltip 样式: borderRadius 12px, no border, shadow

### Tooltip 统一样式

```typescript
contentStyle: {
  backgroundColor: isDark ? '#262626' : '#fff',
  borderRadius: '12px',
  border: 'none',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  color: isDark ? '#ffffff' : '#000'
}
```

## 弹窗 (Modals)

### 1. 数字员工管理 Modal

- **title**: "数字员工管理"
- **width**: 800px
- **footer**: null (自定义)
- **内容**:
  - 顶部右对齐的 "新增数字员工" 按钮 (`PlusOutlined`)
  - Ant Design `Table` 展示员工列表
  - 列: 头像 | 名称 | 当前任务 | 状态 | 操作
  - 操作栏按钮: **编辑** (link) | **高级配置** (link, blue) | **删除** (link, danger + Popconfirm)
  - 分页: `pageSize: 5`

### 2. 编辑/新增员工 Modal

- **title**: 动态 "编辑数字员工" / "新增数字员工"
- **okText**: "保存"
- **cancelText**: "取消"
- **表单内容**:
  - **头像**: Avatar (64px, square, rounded-2xl) + Upload "上传新头像"
  - **员工名称** + **图标 (Emoji)**: 并排 (Col 18:6)
    - Emoji 选择器: Popover 弹出 280px 宽、200px 高的 Grid (8列, gap 4)
    - 150+ 预设 Emoji，分类: 人物/职业、科技/设备、文件/办公、工具/维修...
    - 每个 Emoji 按钮: fontSize 18, padding 4px 2px, hover 背景 #f0f0f0
  - **员工标识** (仅新增): 英文/拼音 ID, 正则校验 `^[a-zA-Z0-9-]+$`
  - **角色背景/主题描述**: TextArea

### 3. 创建中 Loading Modal

- **title**: "正在创建数字员工"
- **width**: 400px
- **centered**: true
- **closable**: false
- **内容**: `Spin size="large"` + "正在配置员工信息..."

### 4. 高级配置 Modal

- **title**: "{员工名} - 高级配置"
- **width**: 600px
- **内容**: 集成协议列表
  - 每项: 圆角卡片 (`rounded-2xl bg-slate-50 dark:bg-slate-800 border`)
  - 左侧: 图标 + 平台名 + "自动化集成协议"
  - 右侧: "配置" 按钮
  - 目前仅 "飞书 Robot"

### 5. 飞书绑定 Modal

- **title**: "绑定飞书账号 - {员工名}"
- **表单**:
  - App ID (`cli_` 开头)
  - App Secret (密码输入)
  - "一键绑定并配置" 按钮 (primary, block, loading)
- **配对区域** (分割线下方):
  - 说明文字 + 配对码输入 + "确认配对" 按钮
  - `Space.Compact` 组合输入框+按钮

### 6. 版本更新 Modal

- **title**: "发现新版本 v2.0.0"
- **footer**: ["稍后提醒", "立即升级"]
- **内容**:
  - 蓝色信息框 (`bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl`)
  - 更新列表 (ul, list-disc)
  - 升级提示 (灰色小字)
