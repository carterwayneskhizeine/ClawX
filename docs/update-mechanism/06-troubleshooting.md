# 故障排除与开发注意事项

## 概述

本文档介绍 ClawX 更新机制在开发和运行过程中可能遇到的问题及解决方案。

## 常见问题

### 开发模式下更新检查失败

**问题**: 在开发环境（未打包）运行时，检查更新返回错误。

**原因**: `electron-updater` 在非打包模式下会静默返回 `null`，不触发任何事件。

**解决方案**:

```typescript
// updater.ts 中特殊处理
async checkForUpdates(): Promise<UpdateInfo | null> {
  const result = await autoUpdater.checkForUpdates();
  
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

前端也会处理这种情况：

```typescript
const currentStatus = get().status;
if (currentStatus === 'checking' || currentStatus === 'idle') {
  set({ status: 'error', error: 'Update check completed without a result. This usually means the app is running in dev mode.' });
}
```

### macOS 安装问题

**问题**: 在 macOS 上调用 `quitAndInstall()` 后窗口未正确关闭。

**原因**: 托盘关闭处理器拦截了窗口关闭事件。

**解决方案**: 在调用 `quitAndInstall()` 前设置退出标志：

```typescript
quitAndInstall(): void {
  setQuitting();  // 先标记应用即将退出
  autoUpdater.quitAndInstall();
}
```

### 检查更新超时

**问题**: 更新检查长时间停留在 "Checking..." 状态。

**解决方案**: 前端实现了30秒超时：

```typescript
const result = await Promise.race([
  invokeIpc('update:check'),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Update check timed out')), 30000)
  )
]);
```

### OSS 服务不可用

**问题**: 无法连接到阿里云 OSS。

**原因**: 网络问题或 OSS 服务故障。

**解决方案**: 自动回退到 GitHub Releases（已在 `electron-builder.yml` 配置）。

### 增量更新不会删除旧文件

**问题**: 更新后旧文件仍然存在，即使新版本已经不需要它们。

**原因**: NSIS 增量更新 (`differentialPackage: true`) 只打包新增和修改的文件，安装时覆盖这些文件，不会主动删除任何文件。

**解决方案**:

1. **卸载后重装**: 提示用户完全卸载再安装新版本
2. **自定义清理脚本**: 在 `scripts/installer.nsh` 中添加清理逻辑

#### 清理脚本示例

**1. NSIS 安装时清理 (installer.nsh)**

在 `customInstall` 宏中添加预安装清理：

```nsis
!macro customInstall
  ; 安装前删除旧文件/目录
  RMDir /r "$INSTDIR\resources\old-folder"
  Delete "$INSTDIR\old-file.dll"
!macroend
```

**2. 卸载时清理用户数据 (installer.nsh)**

```nsis
!macro customUnInstall
  ; 询问用户是否删除用户数据
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Do you want to completely remove all ClawX user data?$\r$\n$\r$\nThis will delete:$\r$\n  • .openclaw folder (configuration & skills)$\r$\n  • AppData\Local\clawx (local app data)$\r$\n  • AppData\Roaming\clawx (roaming app data)" \
    /SD IDNO IDYES _cu_removeData IDNO _cu_skipRemove

  _cu_removeData:
    RMDir /r "$PROFILE\.openclaw"
    RMDir /r "$LOCALAPPDATA\clawx"
    RMDir /r "$APPDATA\clawx"
  _cu_skipRemove:
!macroend
```

**3. Agent 文件清理 (IPC 处理器)**

```typescript
// electron/main/ipc-handlers.ts
ipcMain.handle('agent:cleanupFiles', async (_, { agentId }) => {
  const openclawDir = getOpenClawConfigDir();
  const workspaceDir = join(openclawDir, `workspace-${agentId}`);
  const agentConfigDir = join(openclawDir, 'agents', agentId);

  if (existsSync(workspaceDir)) {
    rmSync(workspaceDir, { recursive: true, force: true });
  }

  if (existsSync(agentConfigDir)) {
    rmSync(agentConfigDir, { recursive: true, force: true });
  }

  return { success: true };
});
```

**注意**: 上述方法仅在全量安装时有效。增量更新 (`differentialPackage: true`) 不会执行 `customInstall` 中的预安装逻辑。

### 自动安装未触发

**问题**: 更新下载完成后未自动安装。

**检查项**:
1. `autoDownloadUpdate` 设置是否为 `true`
2. 检查 `auto-install-countdown` 事件是否正确发送
3. 检查倒计时逻辑是否正常执行

## 日志调试

### 启用调试日志

`electron-updater` 的日志通过 `logger` 配置输出：

```typescript
autoUpdater.logger = {
  info: (msg: string) => logger.info('[Updater]', msg),
  warn: (msg: string) => logger.warn('[Updater]', msg),
  error: (msg: string) => logger.error('[Updater]', msg),
  debug: (msg: string) => logger.debug('[Updater]', msg),
};
```

### 查看日志位置

日志文件位置取决于 `logger` 的具体实现。ClawX 使用统一的日志系统，通常位于：
- Windows: `%APPDATA%/ClawX/logs/`
- macOS: `~/Library/Logs/ClawX/`
- Linux: `~/.config/ClawX/logs/`

## 版本号规范

### 语义化版本

遵循 SemVer 规范：
- `主版本.次版本.补丁版本`
- 示例: `0.1.23`

### 预发布版本

使用连字符分隔预发布标识：
- Alpha: `0.1.24-alpha.0`
- Beta: `1.0.0-beta.1`
- RC: `1.0.0-rc.1`

通道检测正则：

```typescript
function detectChannel(version: string): string {
  const match = version.match(/-([a-zA-Z]+)/);
  return match ? match[1] : 'latest';
}
```

## 测试更新机制

### 本地测试服务器

可以使用 `electron-updater` 的本地测试模式：

1. 启动本地 HTTP 服务器：
   ```bash
   npx http-server ./release
   ```

2. 修改 `electron-builder.yml` 的 publish URL：
   ```yaml
   publish:
     - provider: generic
       url: http://localhost:8080
   ```

3. 运行应用进行测试

### 测试不同通道

修改 `electron-builder.yml` 中的 channel 配置：

```yaml
# 测试 beta 通道
autoUpdater.channel = 'beta';
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://oss.intelli-spectrum.com/beta',
});
```

## 安全注意事项

### 代码签名

Windows 配置中关闭代码签名验证（用于开发测试）：

```yaml
win:
  verifyUpdateCodeSignature: false
```

生产环境应启用验证。

### 哈希校验

`electron-updater` 自动验证下载文件的 SHA512 哈希，确保更新包未被篡改。

## 性能优化

### 增量更新

Windows NSIS 配置启用 `differentialPackage: true`，生成增量更新包减少下载量。

### 多范围请求

```yaml
useMultipleRangeRequest: false
```

禁用多范围请求以提高兼容性。

## 排查清单

1. **更新服务器**
   - [ ] OSS 服务可访问
   - [ ] 版本文件 (yml) 格式正确
   - [ ] 发布文件存在且哈希匹配

2. **应用配置**
   - [ ] `autoUpdater` 正确初始化
   - [ ] Feed URL 设置正确
   - [ ] IPC 处理器已注册

3. **前端状态**
   - [ ] 状态初始化正确
   - [ ] 事件监听正常
   - [ ] UI 正确响应状态变化

4. **网络**
   - [ ] 可以访问 OSS
   - [ ] 可以访问 GitHub
   - [ ] 无代理/防火墙阻止
