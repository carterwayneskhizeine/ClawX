# 主进程更新器 (AppUpdater)

## 概述

`AppUpdater` 类是 Electron 主进程中的核心更新模块，基于 `electron-updater` 库实现。该模块负责与更新服务器通信、下载更新包并管理安装流程。

## 源码位置

`electron/main/updater.ts`

## 核心类定义

```typescript
export class AppUpdater extends EventEmitter {
  private mainWindow: BrowserWindow | null = null;
  private status: UpdateStatus = { status: 'idle' };
  private autoInstallTimer: NodeJS.Timeout | null = null;
  private autoInstallCountdown = 0;
  
  // 延迟5秒后自动安装
  private static readonly AUTO_INSTALL_DELAY_SECONDS = 5;
}
```

## 初始化流程

### 1. 构造函数

```typescript
constructor() {
  super();
  
  // 配置 autoUpdater
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  
  // 设置日志
  autoUpdater.logger = {
    info: (msg: string) => logger.info('[Updater]', msg),
    warn: (msg: string) => logger.warn('[Updater]', msg),
    error: (msg: string) => logger.error('[Updater]', msg),
    debug: (msg: string) => logger.debug('[Updater]', msg),
  };
  
  // 检测更新通道
  const version = app.getVersion();
  const channel = detectChannel(version);
  const feedUrl = `${OSS_BASE_URL}/${channel}`;
  
  // 设置 feed URL
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: feedUrl,
    useMultipleRangeRequest: false,
  });
}
```

### 2. Feed URL 构造

基础 URL：`https://oss.intelli-spectrum.com`

| 通道 | Feed URL |
|------|----------|
| stable | `https://oss.intelli-spectrum.com/latest` |
| beta | `https://oss.intelli-spectrum.com/beta` |
| alpha | `https://oss.intelli-spectrum.com/alpha` |

## 事件监听

`AppUpdater` 监听 `autoUpdater` 的所有事件并转发给渲染进程：

```typescript
private setupListeners(): void {
  autoUpdater.on('checking-for-update', () => {
    this.updateStatus({ status: 'checking' });
    this.emit('checking-for-update');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    this.updateStatus({ status: 'available', info });
    this.emit('update-available', info);
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    this.updateStatus({ status: 'not-available', info });
    this.emit('update-not-available', info);
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    this.updateStatus({ status: 'downloading', progress });
    this.emit('download-progress', progress);
  });

  autoUpdater.on('update-downloaded', (event: UpdateDownloadedEvent) => {
    this.updateStatus({ status: 'downloaded', info: event });
    this.emit('update-downloaded', event);
    
    // 如果开启自动下载，开始倒计时
    if (autoUpdater.autoDownload) {
      this.startAutoInstallCountdown();
    }
  });

  autoUpdater.on('error', (error: Error) => {
    this.updateStatus({ status: 'error', error: error.message });
    this.emit('error', error);
  });
}
```

## 状态管理

### UpdateStatus 接口

```typescript
export interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  info?: UpdateInfo;
  progress?: ProgressInfo;
  error?: string;
}
```

### 状态转换

```
idle → checking → available → downloading → downloaded → install
   \           \           \           \           /
    \           \           \           \         /
     └────────── not-available ◄─────────┘
                    │
                    └──────► error
```

## 核心方法

### checkForUpdates()

检查更新。返回 `UpdateInfo` 或 `null`。

```typescript
async checkForUpdates(): Promise<UpdateInfo | null> {
  const result = await autoUpdater.checkForUpdates();
  
  // 开发模式下返回 null，需要特殊处理
  if (result == null) {
    this.updateStatus({
      status: 'error',
      error: 'Update check skipped (dev mode – app is not packaged)',
    });
    return null;
  }
  
  return result.updateInfo || null;
}
```

### downloadUpdate()

下载可用的更新包。

```typescript
async downloadUpdate(): Promise<void> {
  await autoUpdater.downloadUpdate();
}
```

### quitAndInstall()

安装更新并重启应用。

```typescript
quitAndInstall(): void {
  logger.info('[Updater] quitAndInstall called');
  setQuitting();  // 标记应用即将退出
  autoUpdater.quitAndInstall();
}
```

### 自动安装倒计时

当更新下载完成且启用自动下载时，5秒后自动安装：

```typescript
private startAutoInstallCountdown(): void {
  this.clearAutoInstallTimer();
  this.autoInstallCountdown = AppUpdater.AUTO_INSTALL_DELAY_SECONDS;
  
  this.autoInstallTimer = setInterval(() => {
    this.autoInstallCountdown--;
    this.sendToRenderer('update:auto-install-countdown', { seconds: this.autoInstallCountdown });
    
    if (this.autoInstallCountdown <= 0) {
      this.clearAutoInstallTimer();
      this.quitAndInstall();
    }
  }, 1000);
}
```

## IPC 处理器注册

```typescript
export function registerUpdateHandlers(
  updater: AppUpdater,
  mainWindow: BrowserWindow
): void {
  updater.setMainWindow(mainWindow);
  
  ipcMain.handle('update:status', () => updater.getStatus());
  ipcMain.handle('update:version', () => updater.getCurrentVersion());
  ipcMain.handle('update:check', async () => { ... });
  ipcMain.handle('update:download', async () => { ... });
  ipcMain.handle('update:install', () => { ... });
  ipcMain.handle('update:setChannel', (_, channel) => { ... });
  ipcMain.handle('update:setAutoDownload', (_, enable) => { ... });
  ipcMain.handle('update:cancelAutoInstall', () => { ... });
}
```

## 通道检测

从版本号自动检测更新通道：

```typescript
function detectChannel(version: string): string {
  const match = version.match(/-([a-zA-Z]+)/);
  return match ? match[1] : 'latest';
}
```

示例：
- `0.1.23` → `latest`
- `0.1.8-alpha.0` → `alpha`
- `1.0.0-beta.1` → `beta`
