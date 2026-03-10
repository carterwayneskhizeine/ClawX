# 文件提取实战

## 目标

在安装 ClawX 时，将 `ts/01.txt` 自动解压到用户目录 `D:\TheClaw\.openclaw\skills\01.txt`。

## 实现步骤

### 步骤 1: 配置 extraResources

在 `electron-builder.yml` 中添加：

```yaml
extraResources:
  # ... 现有配置 ...
  
  # 自定义技能文件
  - from: ts/01.txt
    to: resources/skills/01.txt
```

这会将 `01.txt` 打包到安装包的 `resources/skills/` 目录下。

### 步骤 2: 修改 NSIS 脚本

在 `scripts/installer.nsh` 的 `customInstall` 宏中添加：

```nsh
!macro customInstall
  ; === 现有配置 ===
  
  ; 启用 Windows 长路径支持
  WriteRegDWORD HKLM "SYSTEM\CurrentControlSet\Control\FileSystem" "LongPathsEnabled" 1

  ; 添加 resources\cli 到用户 PATH
  ReadRegStr $0 HKCU "Environment" "Path"
  IfErrors _ci_readFailed
  StrCmp $0 "" _ci_setNew
  
  ; 检查是否已存在
  Push "$INSTDIR\resources\cli"
  Push $0
  Call _ci_StrContains
  Pop $1
  StrCmp $1 "" 0 _ci_done
  
  ; 追加到 PATH
  StrCpy $0 "$0;$INSTDIR\resources\cli"
  Goto _ci_write

_ci_setNew:
  StrCpy $0 "$INSTDIR\resources\cli"

_ci_write:
  WriteRegExpandStr HKCU "Environment" "Path" $0
  SendMessage ${HWND_BROADCAST} ${WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=500
  Goto _ci_done

_ci_readFailed:
  DetailPrint "Warning: Could not read user PATH (may exceed 8192 chars). Skipping PATH update."

_ci_done:

  ; === 新增：提取自定义技能文件 ===
  
  ; 创建目标目录
  CreateDirectory "$PROFILE\.openclaw\skills"
  
  ; 复制文件到用户目录
  CopyFiles /SILENT "$INSTDIR\resources\skills\01.txt" "$PROFILE\.openclaw\skills\01.txt"
!macroend
```

## 路径说明

| 变量 | 值示例 |
|------|--------|
| `$INSTDIR` | `C:\Program Files\ClawX` |
| `$PROFILE` | `C:\Users\用户名` |
| 目标路径 | `C:\Users\用户名\.openclaw\skills\01.txt` |

## 命令详解

### CreateDirectory

```nsh
CreateDirectory "$PROFILE\.openclaw\skills"
```

创建目录。如果目录已存在，则静默跳过，不会报错。

### CopyFiles

```nsh
CopyFiles /SILENT "$INSTDIR\resources\skills\01.txt" "$PROFILE\.openclaw\skills\01.txt"
```

复制文件：
- `/SILENT`: 静默模式，不显示进度对话框
- 源文件: `$INSTDIR\resources\skills\01.txt`（安装目录中的文件）
- 目标文件: `$PROFILE\.openclaw\skills\01.txt`（用户目录）

## 验证

1. 执行 `pnpm run package:win` 构建安装包
2. 运行生成的 `.exe` 安装程序
3. 安装完成后检查 `C:\Users\<用户名>\.openclaw\skills\01.txt` 是否存在
