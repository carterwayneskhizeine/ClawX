# 个人资料 (Profile.tsx) UI 设计分析

## 页面结构

入场动画: `animate-in fade-in slide-in-from-bottom-4 duration-500`
最大宽度: `max-w-4xl mx-auto`, space-y-8

### Header
- 主标题: `Title level={2} !mb-1` → "个人信息 (My Profile)"
- 副标题: "管理您的账号与安全偏好"

### 主卡片

```
Card rounded-[2.5rem] shadow-sm border-slate-100
     dark:border-white/5 dark:bg-[#1c1c1c] overflow-hidden
body padding: 0
```

#### 封面区域
```
h-40
bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600
dark: from-blue-900/40 via-indigo-900/40 to-purple-900/40
border-b border-white/10
```

#### 头像区域
```
px-8 pb-10
relative -mt-16 (浮在封面上)
flex items-end justify-between mb-10
```

**头像**:
```
Avatar src={MOCK_USER.avatar} size={140} shape="square"
rounded-[2rem] border-4 border-white dark:border-[#1c1c1c]
shadow-2xl object-cover
```

**拍照按钮** (头像右下角):
```
Button type="primary" shape="circle" icon=CameraOutlined
absolute bottom-2 right-2
bg-slate-900 dark:bg-[#141414]
hover:!bg-slate-800 dark:hover:!bg-[#262626]
border-none shadow-xl scale-110
```

**"编辑资料" 按钮** (右侧, md以上显示):
```
type="primary" rounded-xl h-10 px-6 font-bold
shadow-lg shadow-blue-100 dark:shadow-none
```

### 内容区域: 两列布局
`grid grid-cols-1 md:grid-cols-2 gap-12`

#### 左列: 基本信息

**Section 标题**:
```
Title level={5} !mb-6 flex items-center
<div class="w-1.5 h-4 bg-blue-600 rounded-full mr-3" />  ← 蓝色竖条指示器
基本信息
```

**信息卡片容器**:
```
p-6 bg-slate-50/50 dark:bg-[#141414]
rounded-3xl border border-slate-100 dark:border-white/5
space-y-6
```

每个信息项:
```
flex items-center space-x-4
┌────────┐
│ 图标容器 │  w-10 h-10 rounded-xl bg-white dark:bg-[#1c1c1c]
│ shadow  │  shadow-sm, 图标 text-slate-400 text-lg
└────────┘
标签: text-[10px] font-bold uppercase tracking-wider dark:text-slate-500
值:   Text strong text-base text-slate-800 dark:text-slate-100
```

| 信息项 | 图标 | 标签 | 值 |
|--------|------|------|-----|
| 用户名 | UserOutlined | 用户名 | {username} |
| 账号 ID | IdcardOutlined | 账号 ID | {accountName} |
| 所属组织 | BankOutlined | 所属组织 | OpenClaw AI 科技有限公司 |

#### 右列: 安全与绑定

**Section 标题**: `w-1.5 h-4 bg-indigo-600 rounded-full mr-3` ← 紫色竖条指示器

##### 修改登录密码 行
```
w-full flex items-center justify-between p-5
rounded-3xl border border-slate-100 dark:border-white/5
hover:border-blue-100 dark:hover:border-blue-800
hover:bg-white dark:hover:bg-[#141414]
hover:shadow-xl hover:shadow-blue-50/50
transition-all cursor-pointer group
```

图标容器: `w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl`
hover: `group-hover:scale-110 transition-transform`

右箭头: `RightOutlined text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all`

##### 绑定微信账号 行
同样结构，图标容器用绿色系:
`bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400`

绑定状态: 已绑定=`text-green-600 ✅`, 未绑定=`text-slate-400`
右侧: "管理" 按钮 (`type="text" font-bold group-hover:text-green-600`)

## 修改密码 Modal

```
Modal title="重置登录密码" (text-lg font-black)
centered width={440}
styles.content: { borderRadius: '2rem' }
okText="立即保存" cancelText="取消"
```

**表单** (Form layout="vertical" mt-6):

每个输入框:
```
Input.Password size="large"
rounded-xl h-12
bg-slate-50 dark:bg-[#0d0d0d]
border-slate-100 dark:border-white/5
```

Label: `Text strong text-xs uppercase tracking-widest text-slate-400`

| 字段 | Label | Placeholder | 校验 |
|------|-------|-------------|------|
| oldPassword | 当前密码 | 请输入当前密码 | required |
| newPassword | 新设密码 | 请输入新密码 | required |
| confirmPassword | 确认新密码 | 确认一次新密码 | required + 匹配验证 |
