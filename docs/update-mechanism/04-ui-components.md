# UI 组件 (UpdateSettings)

## 概述

`UpdateSettings` 是用于显示更新状态和执行更新操作的 React 组件。它是设置页面的一部分，提供用户友好的界面来管理应用更新。

## 源码位置

`src/components/settings/UpdateSettings.tsx`

## 组件功能

1. 显示当前版本
2. 显示更新状态
3. 显示下载进度
4. 显示更新信息（版本、发布日期、发布说明）
5. 提供操作按钮（检查更新、下载、安装、重试）

## 界面结构

```
┌─────────────────────────────────────────┐
│  Current Version                        │
│  v0.1.23                          [↻]  │
├─────────────────────────────────────────┤
│  Checking for updates...         [↻]   │
├─────────────────────────────────────────┤
│  [下载进度条]                           │
│  12.5 MB / 50 MB   250 KB/s            │
│  25% complete                            │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │ Version 0.1.24                  │   │
│  │ 2026-03-10                     │   │
│  │ What's New:                     │   │
│  │ - Bug fixes                     │   │
│  │ - New features                  │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│  Error Details:                        │
│  Connection failed                      │
├─────────────────────────────────────────┤
│  When auto-update is enabled...        │
└─────────────────────────────────────────┘
```

## 状态显示

| 状态 | 图标 | 显示文本 |
|------|------|----------|
| idle | ↻ | Check for updates to get the latest features |
| checking | ↻ (spin) | Checking for updates... |
| downloading | ↻ (spin) | Downloading update... |
| available | ⬇ | Update available: v{x.x.x} |
| downloaded | 🚀 | Ready to install: v{x.x.x} |
| not-available | ✓ | You have the latest version |
| error | ↻ (red) | Update check failed |

## 操作按钮

根据当前状态显示不同的操作按钮：

| 状态 | 按钮 |
|------|------|
| idle/not-available | "Check for Updates" |
| checking | "Checking..." (禁用) |
| downloading | "Downloading..." (禁用) |
| available | "Download Update" |
| downloaded | "Install & Restart" |
| error | "Retry" |

## 自动安装倒计时

当更新下载完成且启用自动安装时，显示倒计时：

```
Restarting to install update in 5s...
[Cancel]
```

倒计时结束后自动安装更新。

## 核心代码

### 状态图标渲染

```typescript
const renderStatusIcon = () => {
  switch (status) {
    case 'checking':
    case 'downloading':
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    case 'available':
      return <Download className="h-4 w-4 text-primary" />;
    case 'downloaded':
      return <Rocket className="h-4 w-4 text-primary" />;
    case 'error':
      return <RefreshCw className="h-4 w-4 text-destructive" />;
    default:
      return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
  }
};
```

### 状态文本渲染

```typescript
const renderStatusText = () => {
  if (status === 'downloaded' && autoInstallCountdown != null) {
    return t('updates.status.autoInstalling', { seconds: autoInstallCountdown });
  }
  switch (status) {
    case 'checking': return t('updates.status.checking');
    case 'downloading': return t('updates.status.downloading');
    case 'available': return t('updates.status.available', { version: updateInfo?.version });
    case 'downloaded': return t('updates.status.downloaded', { version: updateInfo?.version });
    case 'error': return error || t('updates.status.failed');
    case 'not-available': return t('updates.status.latest');
    default: return t('updates.status.check');
  }
};
```

### 下载进度显示

```typescript
{status === 'downloading' && progress && (
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span>
        {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
      </span>
      <span>{formatBytes(progress.bytesPerSecond)}/s</span>
    </div>
    <Progress value={progress.percent} className="h-2" />
    <p className="text-xs text-muted-foreground text-center">
      {Math.round(progress.percent)}% complete
    </p>
  </div>
)}
```

### 更新信息显示

```typescript
{updateInfo && (status === 'available' || status === 'downloaded') && (
  <div className="rounded-lg bg-muted p-4 space-y-2">
    <div className="flex items-center justify-between">
      <p className="font-medium">Version {updateInfo.version}</p>
      {updateInfo.releaseDate && (
        <p className="text-sm text-muted-foreground">
          {new Date(updateInfo.releaseDate).toLocaleDateString()}
        </p>
      )}
    </div>
    {updateInfo.releaseNotes && (
      <div className="text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">What's New:</p>
        <p className="whitespace-pre-wrap">{updateInfo.releaseNotes}</p>
      </div>
    )}
  </div>
)}
```

## 在设置页面中的使用

在 `src/pages/Settings/index.tsx` 中引入并使用：

```tsx
import { useUpdateStore } from '@/stores/update';

const updateSetAutoDownload = useUpdateStore((state) => state.setAutoDownload);

// 在设置表单中使用
<Card>
  <CardHeader>
    <CardTitle>{t('updates.title')}</CardTitle>
    <CardDescription>{t('updates.description')}</CardDescription>
  </CardHeader>
  <CardContent>
    <Switch 
      checked={autoCheckUpdate}
      onCheckedChange={setAutoCheckUpdate}
    />
    <Switch 
      checked={autoDownloadUpdate}
      onCheckedChange={(v) => {
        setAutoDownloadUpdate(v);
        updateSetAutoDownload(v);
      }}
    />
  </CardContent>
</Card>
```

## 国际化

相关文本在 `src/i18n/locales/{lang}/settings.json` 中定义：

```json
{
  "updates": {
    "title": "Updates",
    "description": "Keep ClawX up to date",
    "autoCheck": "Auto-check for updates",
    "autoCheckDesc": "Check for updates on startup",
    "autoDownload": "Auto-update",
    "autoDownloadDesc": "Automatically download and install updates",
    "status": {
      "checking": "Checking for updates...",
      "downloading": "Downloading update...",
      "available": "Update available: v{{version}}",
      "downloaded": "Ready to install: v{{version}}",
      "autoInstalling": "Restarting to install update in {{seconds}}s...",
      "failed": "Update check failed",
      "latest": "You have the latest version",
      "check": "Check for updates to get the latest features"
    },
    "action": {
      "checking": "Checking...",
      "downloading": "Downloading...",
      "download": "Download Update",
      "install": "Install & Restart",
      "cancelAutoInstall": "Cancel",
      "retry": "Retry",
      "check": "Check for Updates"
    },
    "currentVersion": "Current Version",
    "whatsNew": "What's New:",
    "errorDetails": "Error Details:",
    "help": "When auto-update is enabled, updates are downloaded and installed automatically."
  }
}
```
