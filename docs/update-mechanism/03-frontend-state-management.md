# 前端状态管理 (useUpdateStore)

## 概述

`useUpdateStore` 是基于 Zustand 的状态管理模块，负责在 React 前端与 Electron 主进程之间同步更新状态。该模块封装了所有更新相关的操作，包括检查更新、下载更新、安装更新等。

## 源码位置

`src/stores/update.ts`

## 数据类型

### UpdateInfo

```typescript
export interface UpdateInfo {
  version: string;           // 新版本号
  releaseDate?: string;      // 发布日期
  releaseNotes?: string;     // 发布说明
}
```

### ProgressInfo

```typescript
export interface ProgressInfo {
  total: number;             // 总字节数
  delta: number;             // 本次增量
  transferred: number;       // 已传输字节数
  percent: number;           // 百分比 (0-100)
  bytesPerSecond: number;    // 下载速度
}
```

### UpdateStatus

```typescript
export type UpdateStatus = 
  | 'idle'          // 初始状态
  | 'checking'     // 正在检查更新
  | 'available'   // 发现新版本
  | 'not-available'// 没有可用更新
  | 'downloading' // 正在下载
  | 'downloaded'  // 下载完成
  | 'error';      // 发生错误
```

## 状态接口

```typescript
interface UpdateState {
  status: UpdateStatus;
  currentVersion: string;           // 当前版本
  updateInfo: UpdateInfo | null;     // 可用更新信息
  progress: ProgressInfo | null;     // 下载进度
  error: string | null;              // 错误信息
  isInitialized: boolean;           // 是否已初始化
  autoInstallCountdown: number | null; // 自动安装倒计时
}
```

## 核心方法

### init()

初始化更新状态，在应用启动时调用：

```typescript
init: async () => {
  if (get().isInitialized) return;
  
  // 获取当前版本
  const version = await invokeIpc<string>('update:version');
  set({ currentVersion: version });
  
  // 获取当前状态
  const status = await invokeIpc<{...}>('update:status');
  set({ ...status });
  
  // 监听更新事件
  window.electron.ipcRenderer.on('update:status-changed', (data) => {
    set({ ...data });
  });
  
  window.electron.ipcRenderer.on('update:auto-install-countdown', (data) => {
    set({ autoInstallCountdown: data.cancelled ? null : data.seconds });
  });
  
  // 同步设置并自动检查更新
  const { autoCheckUpdate, autoDownloadUpdate } = useSettingsStore.getState();
  if (autoDownloadUpdate) {
    invokeIpc('update:setAutoDownload', true);
  }
  if (autoCheckUpdate) {
    setTimeout(() => get().checkForUpdates(), 10000);
  }
}
```

### checkForUpdates()

检查更新：

```typescript
checkForUpdates: async () => {
  set({ status: 'checking', error: null });
  
  try {
    const result = await Promise.race([
      invokeIpc('update:check'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Update check timed out')), 30000)
      )
    ]);
    
    if (result.status) {
      set({ ...result.status });
    } else if (!result.success) {
      set({ status: 'error', error: result.error });
    }
  } catch (error) {
    set({ status: 'error', error: String(error) });
  } finally {
    // 开发模式下处理超时
    const currentStatus = get().status;
    if (currentStatus === 'checking' || currentStatus === 'idle') {
      set({ status: 'error', error: 'Update check completed without a result.' });
    }
  }
}
```

### downloadUpdate()

下载更新包：

```typescript
downloadUpdate: async () => {
  set({ status: 'downloading', error: null });
  
  try {
    const result = await invokeIpc<{ success: boolean; error?: string }>('update:download');
    if (!result.success) {
      set({ status: 'error', error: result.error });
    }
  } catch (error) {
    set({ status: 'error', error: String(error) });
  }
}
```

### installUpdate()

安装更新并重启：

```typescript
installUpdate: () => {
  void invokeIpc('update:install');
}
```

### cancelAutoInstall()

取消自动安装倒计时：

```typescript
cancelAutoInstall: async () => {
  await invokeIpc('update:cancelAutoInstall');
}
```

### setChannel()

设置更新通道：

```typescript
setChannel: async (channel: 'stable' | 'beta' | 'dev') => {
  await invokeIpc('update:setChannel', channel);
}
```

### setAutoDownload()

设置自动下载偏好：

```typescript
setAutoDownload: async (enable: boolean) => {
  await invokeIpc('update:setAutoDownload', enable);
}
```

## IPC 通信

前端通过 `invokeIpc` 与主进程通信：

| IPC 通道 | 方向 | 描述 |
|----------|------|------|
| `update:status` | 主→前 | 获取当前更新状态 |
| `update:version` | 主→前 | 获取当前版本号 |
| `update:check` | 前→主 | 检查更新 |
| `update:download` | 前→主 | 下载更新 |
| `update:install` | 前→主 | 安装更新 |
| `update:setChannel` | 前→主 | 设置更新通道 |
| `update:setAutoDownload` | 前→主 | 设置自动下载 |
| `update:cancelAutoInstall` | 前→主 | 取消自动安装 |
| `update:status-changed` | 主→前 | 状态变更事件 |
| `update:auto-install-countdown` | 主→前 | 自动安装倒计时 |

## 与设置存储的集成

`useUpdateStore` 与 `useSettingsStore` 集成，读取用户的自动检查和自动下载设置：

```typescript
// 从 settings store 读取配置
const { autoCheckUpdate, autoDownloadUpdate } = useSettingsStore.getState();

// 自动下载偏好同步到主进程
if (autoDownloadUpdate) {
  invokeIpc('update:setAutoDownload', true);
}

// 启动10秒后自动检查更新
if (autoCheckUpdate) {
  setTimeout(() => get().checkForUpdates(), 10000);
}
```

## 默认设置

```typescript
const defaultSettings = {
  updateChannel: 'stable',        // 更新通道
  autoCheckUpdate: true,          // 自动检查更新
  autoDownloadUpdate: false,      // 自动下载更新
};
```
