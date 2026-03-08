# 系统设置 (SystemSettings.tsx) UI 设计分析

## 页面结构

入场动画: `animate-in fade-in slide-in-from-bottom-4 duration-500`, space-y-8

### Header
- 主标题: `Title level={2} !mb-1` → "系统设置"
- 副标题: "管理您的工作空间偏好与核心网关连接配置"

### 布局
`grid grid-cols-1 xl:grid-cols-3 gap-8`
- 左列 (`xl:col-span-2`): 界面外观 + 通知设置
- 右列: 网关连接 + 安全与账户 + 底部操作

### 隐藏按钮 (Ctrl+P 触发)
橙色边框小卡片: "切换到后台控制台" (danger primary) + 提示文字

---

## 左列: 界面外观 Card

```
Card rounded-[2rem] border-slate-100 dark:border-white/5 dark:bg-[#1c1c1c]
title: <Space><BgColorsOutlined /> 界面外观</Space>
```

### 主题模式选择
`Row gutter={16}`, 3列 (`Col span=8`)

每个选项:
```
p-4 rounded-2xl border-2 cursor-pointer transition-all
选中: border-blue-600 bg-blue-50/20 dark:bg-blue-900/10
未选: border-slate-50 dark:border-white/5 hover:border-slate-200
```

**预览色块**: `h-24 w-full rounded-xl mb-3 overflow-hidden border`
- 简约白: bg-white
- 极客黑: bg-[#0d0d0d]
- 跟随系统: bg-gradient-to-r from-white to-[#0d0d0d]

预览内部模拟界面线条:
```
左侧 (1/3): border-r, 两条灰色线段
右侧 (2/3): 两条灰色线段
线段: h-1 bg-slate-200 rounded / bg-slate-100
```

**标签**: `Text strong text-sm` + 描述 `Text type="secondary" text-[10px] leading-tight`

| 选项 | Label | 描述 |
|------|-------|------|
| light | 简约白 (Light) | 在光线充足的环境下提供最佳阅读体验 |
| dark | 极客黑 (Dark) | 深色的视觉风格，降低眼部疲劳 |
| system | 跟随系统 (System) | 根据操作系统设置自动调整 |

### 语言设置
`flex items-center justify-between` + `Divider` 分隔

Select 下拉: `w-40`
- 简体中文 (Chinese)
- English (US)

## 左列: 通知设置 Card

```
Card rounded-[2rem]
title: <Space><BellOutlined /> 通知设置</Space>
```

两个 Switch 行，每行 `flex items-center justify-between`:
1. **系统实时通知**: "接收数字员工任务完成或系统异常的桌面通知" + Switch
2. **算力余额预警**: "当算力积分低于 1000 时发送提醒" + Switch (defaultChecked)

---

## 右列: 网关连接 Card

```
Card rounded-[2rem]
title: <Space><CloudServerOutlined /> 网关连接</Space>
```

### 连接状态栏
```
p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border
flex items-center justify-between
```
- 左: 状态点 (`w-2 h-2 rounded-full`, 连接=`bg-green-500 animate-pulse`, 断开=`bg-red-500`) + 文字
- 右: 刷新按钮 (`ReloadOutlined`)

### 配置输入框
- **WebSocket URL**: `Input rounded-xl h-11`, label 样式 `text-xs font-bold text-slate-400 uppercase tracking-widest mb-2`
- **Gateway Token**: `Input.Password rounded-xl h-11` + 说明文字 `text-[10px]`
- **启动时自动连接**: Switch

### "重新连接网关" 按钮
```
type="primary" block
h-11 rounded-xl font-bold bg-blue-600
shadow-lg shadow-blue-100 dark:shadow-none
```

## 右列: 安全与账户 Card

```
Card rounded-[2rem]
title: <Space><SafetyCertificateOutlined /> 安全与账户</Space>
```

三个按钮 (block, rounded-xl h-10 border-slate-100 text-left px-4):
1. 修改管理密码
2. API 私钥管理
3. 退出并清除缓存 (danger)

## 右列: 底部操作按钮

`pt-4 flex justify-end space-x-3`

| 按钮 | 样式 |
|------|------|
| 撤销修改 | `h-12 px-6 rounded-2xl font-bold` (default) |
| 保存全局设置 | `type="primary" icon=SaveOutlined h-12 px-8 rounded-2xl font-black bg-blue-600 shadow-xl shadow-blue-100` |
