# 如何把 openclaw cli 放到环境变量里面

**Issue #156 · ValueCell-ai/ClawX**

---

## 问题描述

我在 PowerShell 中执行 `openclaw` 命令时报错"无法找到该命令"，但在 ClawX 中看到可以使用。

目前使用的命令如下：

```powershell
$env:ELECTRON_RUN_AS_NODE=1; & 'D:\openclaw\ClawX\ClawX.exe' 'D:\openclaw\ClawX\resources\openclaw\openclaw.mjs'
```

## 需求

但是每次这样执行命令很麻烦，是否可以把该命令转换成环境变量，使我能够直接在 PowerShell 执行 `openclaw` 命令？

---

**原始链接：** https://github.com/ValueCell-ai/ClawX/issues/156
