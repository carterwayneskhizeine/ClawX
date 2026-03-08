# 登录弹窗 (LoginModal.tsx) UI 设计分析

## 概述

LoginModal 是独立于 Ant Design 的纯 CSS 组件，使用单独的 `login.css` 文件实现样式。
支持 **登录** / **注册** 两种模式切换，包含用户协议弹窗。

## 页面结构

```
┌────────────────────────────────────────────────────────┐
│ login-page (全屏居中)                                    │
│ min-height: 100vh, flex center                          │
│ bg: #f5f5f5 (light) / #0d0d0d (dark)                   │
│ padding: 24px                                           │
│                                                         │
│   ┌──────────────────────────────────────────────────┐  │
│   │ login-card (左右分布)                              │  │
│   │ max-width: 896px, min-height: 600px              │  │
│   │ border-radius: 24px                              │  │
│   │ box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25)  │  │
│   │ dark: border rgba(255,255,255,0.05)              │  │
│   │                                                  │  │
│   │ ┌────────────────┐┌────────────────────────────┐ │  │
│   │ │ login-left     ││ login-right                │ │  │
│   │ │ QR Code 区域    ││ 账号登录表单                │ │  │
│   │ │ bg: #f5f5f5    ││ bg: #ffffff                │ │  │
│   │ │ border-right   ││                            │ │  │
│   │ │ padding: 48px  ││ padding: 48px              │ │  │
│   │ └────────────────┘└────────────────────────────┘ │  │
│   └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

## 左侧: QR Code 区域

- **标题**: "微信扫码登录", font-size 24px, font-weight 700, mb-32px
- **QR 容器**: `login-qr-container`
  - padding: 24px, bg: container色, border-radius: 32px, shadow-sm, border
  - QR Image: 192x192, opacity: 0.2 (light) / 0.4+invert (dark)
  - 遮罩层: `login-qr-overlay`
    - 居中, bg: rgba(255,255,255,0.6), dark: rgba(13,13,13,0.8)
    - backdrop-filter: blur(2px), border-radius: 32px
    - "暂未开放" (font-size 18px, font-weight 700)
    - "二维码功能建设中" (font-size 14px)
- **提示文字**: "使用微信扫一扫安全登录", mt-32px, font-size 14px, secondary色

## 右侧: 账号表单

### Logo 区域
```
login-logo-container: flex items-center gap-12 mb-48px

<div class="login-logo-icon-bg">  ← bg: #000 (light) / #1c1c1c (dark)
  <svg Bot icon>                    padding: 8px, border-radius: 8px
</div>                              white color, 24x24
<span>"OPC数字员工智能助手"</span>  ← font-size: 24px, font-weight: 700
```

### 标题
`h3` → 动态: "账号登录" / "账号注册", font-size: 20px, font-weight: 700, mb-24px

### 表单区

**login-form-body**: `flex column gap-20px`

每个输入组 (`login-input-group`): `flex column gap-8px`

**Label** (`login-label`): font-size 14px, font-weight 500, mb-2px

**Input** (`login-input`):
```css
width: 100%;
border-radius: 12px;
padding: 12px 16px;
border: 1.5px solid #d9d9d9;
font-size: 16px;
transition: all 0.2s;
focus: border-color #1677ff;
dark: bg #1c1c1c, border #434343;
```

### 字段列表

| 字段 | 类型 | Placeholder | 条件 |
|------|------|-------------|------|
| 组织名称 | text | 请输入组织名称 | 仅注册模式 |
| 用户名 | text | 请输入用户名 | 始终显示 |
| 密码 | password | 请输入密码 | 始终显示 |

### 错误提示
```css
color: #ff4d4f; font-size: 14px; marginTop: -8px;
```
输入时自动清除错误。

### Checkbox 区域 (`login-checkbox-row`)

1. **保持登录**: `checkbox + "保持账号登录状态 (7天)"`
2. **切换模式**: "已有账号？" / "没有账号？" + 蓝色链接按钮 `login-link-btn` (#1677ff, hover:underline)
3. **用户协议**: checkbox (只读) + "我已阅读并同意" + `《用户协议》` + "和" + `《使用须知》` (蓝色链接)

### 提交按钮 (`login-submit-btn`)
```css
width: 100%; height: 56px;
border-radius: 16px;
background-color: #1677ff;
color: white;
font-size: 18px; font-weight: 700;
margin-top: 24px;
box-shadow: 0 10px 15px -3px rgba(22, 119, 255, 0.2);
hover: bg #4096ff;
active: bg #0958d9;
```

文字: "登 录" / "注 册" / "处理中..."

## 用户协议弹窗

### 遮罩层 (`login-modal-overlay`)
```css
position: fixed; inset: 0;
background-color: rgba(0, 0, 0, 0.6);
z-index: 1000;
animation: overlayFadeIn 0.2s ease-out;
```

### Modal (`login-modal`)
```css
border-radius: 24px;
width: 90vw; max-width: 600px; max-height: 80vh;
box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
animation: modalSlideDown 0.3s ease-out;
bg: white (light) / #141414 (dark);
```

### Header (`login-modal-header`)
- padding: 20px 32px, border-bottom
- SVG Info icon (#1677ff, 24x24) + "用户协议与使用须知" (font-size 20px, font-weight 700)

### Content (`login-modal-content`)
- padding: 32px, max-height: 400px, overflow-y: auto

**标题**: "欢迎使用 OPC数字员工智能助手：" (font-weight 700, font-size 18px, mb-24px)

**规则列表**: 6条, 每条 (`login-rule-item`):
```
flex items-start gap-12px mb-16px
font-size: 15px; line-height: 1.6;
```

编号圆点 (`login-rule-number`):
```css
w-24px h-24px rounded-full
bg: #e6f4ff (light) / rgba(22,119,255,0.2) (dark)
color: #1677ff / #4096ff
font-size: 12px; font-weight: 700;
```

### Footer (`login-modal-footer`)
```css
flex gap-16px; padding: 20px 32px;
bg: #f5f5f5 (light) / #1c1c1c (dark);
border-top;
```

两个按钮 (`login-modal-btn`):
- **不同意并关闭** (`btn-disagree`): 透明背景, border, hover:bg-container
- **同意并继续** (`btn-agree`): bg #1677ff, white, font-weight 700, shadow

尺寸: `flex:1 min-width:120px height:48px border-radius:12px font-size:16px`

## CSS 变量体系

```css
/* Light */
--login-bg-layout: #f5f5f5;
--login-bg-container: #ffffff;
--login-bg-left: #f5f5f5;
--login-border: #d9d9d9;
--login-text-primary: #000000;
--login-text-secondary: #5F6368;
--login-input-bg: transparent;
--login-input-border: #d9d9d9;
--login-modal-footer-bg: #f5f5f5;

/* Dark (html.dark) */
--login-bg-layout: #0d0d0d;
--login-bg-container: #141414;
--login-bg-left: #0d0d0d;
--login-border: #303030;
--login-text-primary: rgba(255, 255, 255, 0.9);
--login-text-secondary: rgba(255, 255, 255, 0.5);
--login-input-bg: #1c1c1c;
--login-input-border: #434343;
--login-modal-footer-bg: #1c1c1c;
```

## 关键动画
1. `overlayFadeIn`: 0.2s ease-out 淡入
2. `modalSlideDown`: 0.3s ease-out 从上滑下
3. 输入框 focus: `transition: all 0.2s` border-color 变化
4. 按钮 hover/active: 背景色过渡 0.2s
