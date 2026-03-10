# 完整示例

本文档展示将 `ts/01.txt` 自动解压到 `D:\TheClaw\.openclaw\skills` 的完整配置。

## 修改的文件

1. `electron-builder.yml`
2. `scripts/installer.nsh`

---

## electron-builder.yml 修改

在 `extraResources` 部分添加：

```yaml
extraResources:
  - from: resources/
    to: resources/
    filter:
      - "**/*"
      - "!icons/*.md"
      - "!icons/*.svg"
      - "!bin/**"
      - "!screenshot/**"
  - from: build/openclaw/
    to: openclaw/
  # 新增：自定义技能文件
  - from: ts/01.txt
    to: resources/skills/01.txt
```

---

## scripts/installer.nsh 修改

在 `customInstall` 宏的 `_ci_done:` 之后添加：

```nsh
!macro customInstall
  ; 启用 Windows 长路径支持
  WriteRegDWORD HKLM "SYSTEM\CurrentControlSet\Control\FileSystem" "LongPathsEnabled" 1

  ; 添加 resources\cli 到用户 PATH
  ClearErrors
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
  CreateDirectory "$PROFILE\.openclaw\skills"
  CopyFiles /SILENT "$INSTDIR\resources\skills\01.txt" "$PROFILE\.openclaw\skills\01.txt"
!macroend
```

---

## 构建与测试

### 构建命令

```bash
pnpm run package:win
```

### 构建输出

构建完成后，在 `release/` 目录下生成：

```
release/
├── win-unpacked/           # 解压后的应用目录
│   ├── resources/
│   │   └── skills/
│   │       └── 01.txt     # 技能文件已包含
│   └── ...
└── ClawX-0.1.23-win-x64.exe  # 安装包
```

### 安装验证

1. 运行 `ClawX-0.1.23-win-x64.exe`
2. 选择安装目录（默认 `C:\Program Files\ClawX`）
3. 完成安装
4. 检查文件是否存在：

```powershell
# 检查文件
Test-Path "$env:USERPROFILE\.opencloak\skills\01.txt"

# 或直接查看
Get-Content "$env:USERPROFILE\.openclaw\skills\01.txt"
```

---

## 扩展：多个文件

如果需要打包多个文件：

### 1. electron-builder.yml

```yaml
extraResources:
  - from: ts/
    to: resources/skills/
    filter:
      - "**/*.txt"
```

### 2. installer.nsh

```nsh
; 复制整个 skills 目录
CreateDirectory "$PROFILE\.openclaw\skills"
CopyFiles /SILENT "$INSTDIR\resources\skills\*" "$PROFILE\.openclaw\skills\"
```

---

## 扩展：条件判断

可以根据是否已存在决定是否覆盖：

```nsh
; 如果目标文件不存在则复制
IfFileExists "$PROFILE\.openclaw\skills\01.txt" 0 +3
  DetailPrint "Skill file already exists, skipping..."
  Goto +2
CopyFiles /SILENT "$INSTDIR\resources\skills\01.txt" "$PROFILE\.openclaw\skills\01.txt"
```
