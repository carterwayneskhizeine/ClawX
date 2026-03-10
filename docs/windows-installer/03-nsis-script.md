# NSIS 安装脚本

## NSIS 简介

NSIS (Nullsoft Scriptable Install System) 是 Windows 平台常用的开源安装程序制作工具。electron-builder 使用 NSIS 生成 Windows 安装包。

ClawX 通过自定义 NSIS 脚本 (`installer.nsh`) 实现安装时的自定义操作。

## installer.nsh 脚本结构

```nsh
; 检查应用是否运行
!macro customCheckAppRunning
  ; ...
!macroend

; 安装时执行的操作
!macro customInstall
  ; ...
!macroend

; 卸载时执行的操作
!macro customUnInstall
  ; ...
!macroend
```

## 核心宏说明

### customCheckAppRunning

在安装前检查应用是否正在运行，如果正在运行则提示用户关闭：

```nsh
!macro customCheckAppRunning
  ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
  ${if} $R0 == 0
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" /SD IDOK IDOK doStopProcess
    ; ...
  ${endIf}
!macroend
```

### customInstall

安装时执行的操作，ClawX 目前实现了：

1. **启用长路径支持**
2. **添加 CLI 到用户 PATH**

```nsh
!macro customInstall
  ; 启用 Windows 长路径支持
  WriteRegDWORD HKLM "SYSTEM\CurrentControlSet\Control\FileSystem" "LongPathsEnabled" 1

  ; 添加 resources\cli 到用户 PATH
  ReadRegStr $0 HKCU "Environment" "Path"
  StrCpy $0 "$0;$INSTDIR\resources\cli"
  WriteRegExpandStr HKCU "Environment" "Path" $0
  
  ; 广播环境变量变化
  SendMessage ${HWND_BROADCAST} ${WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=500
!macroend
```

### customUnInstall

卸载时执行的操作：

1. **移除 PATH 条目**
2. **询问是否删除用户数据**

```nsh
!macro customUnInstall
  ; 移除 PATH 条目
  Push $0
  Push "$INSTDIR\resources\cli"
  Call un._cu_RemoveFromPath
  
  ; 询问删除用户数据
  MessageBox MB_YESNO|MB_ICONQUESTION "是否删除所有用户数据?" /SD IDNO IDYES _cu_removeData
!macroend
```

## NSIS 变量说明

| 变量 | 说明 |
|------|------|
| `$INSTDIR` | 安装目录（如 `C:\Program Files\ClawX`） |
| `$PROFILE` | 用户目录（如 `C:\Users\用户名`） |
| `$APPDATA` | AppData Roaming 目录 |
| `$LOCALAPPDATA` | AppData Local 目录 |

## 常用 NSIS 命令

| 命令 | 说明 |
|------|------|
| `CreateDirectory` | 创建目录 |
| `CopyFiles` | 复制文件 |
| `Delete` | 删除文件 |
| `RMDir /r` | 递归删除目录 |
| `WriteRegDWORD` | 写入注册表 DWORD 值 |
| `WriteRegExpandStr` | 写入注册表扩展字符串 |
| `SendMessage` | 发送系统消息 |
