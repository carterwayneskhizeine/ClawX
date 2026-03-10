# extraResources 配置

## 什么是 extraResources

`extraResources` 是 electron-builder 的配置项，用于指定在打包时需要包含在安装包中的额外文件。这些文件会被复制到安装后的 `resources` 目录下。

## 基本语法

```yaml
extraResources:
  - from: 源目录或文件
    to: 目标目录
    filter:
      - "**/*"           # 包含所有文件
      - "!*.md"          # 排除某些文件
```

## ClawX 现有配置分析

当前 ClawX 的 extraResources 配置：

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
```

### 配置说明

1. **resources/** → **resources/**: 复制应用资源文件
2. **build/openclaw/** → **openclaw/**: 复制 OpenClaw 运行时

## 添加自定义文件

要将 `ts/01.txt` 打包到安装包中，添加以下配置：

```yaml
extraResources:
  # ... 现有配置 ...
  
  # 自定义技能文件
  - from: ts/01.txt
    to: resources/skills/01.txt
```

执行打包后，`01.txt` 会被包含在安装包中，安装时会解压到：

```
$INSTDIR/resources/skills/01.txt
```

其中 `$INSTDIR` 是用户选择的安装目录（默认为 `C:\Program Files\ClawX`）。

## 注意事项

1. **目录必须存在**: 源路径 `ts/01.txt` 必须存在，否则打包会失败
2. **路径变量**: 可使用 `${arch}`、`${os}` 等变量实现平台差异化打包
3. **过滤规则**: 使用 filter 可以排除不需要的文件
