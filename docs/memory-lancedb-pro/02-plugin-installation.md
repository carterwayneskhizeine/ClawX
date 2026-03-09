# 02 - 插件手动安装步骤

> 本步骤在 ClawX 开发机上**手动执行一次**，不涉及代码修改。
> 参考：`ai-desktop-sandbox/electron_doc/OpenClaw-memory-lancedb-pro-安装文档.md`

---

## 2.1 前置条件检查

```bash
# 确认 git 和 node/npm 可用
git --version
node --version
npm --version

# 确认目标目录存在
ls "D:/TheClaw/.openclaw/"
```

预期输出：能看到 `openclaw.json` 文件。

---

## 2.2 创建 workspace/plugins 目录并克隆插件

```bash
# 创建 plugins 目录（如不存在）
mkdir -p "D:/TheClaw/.openclaw/workspace/plugins"

# 进入目录并克隆
cd "D:/TheClaw/.openclaw/workspace/plugins"
git clone https://github.com/win4r/memory-lancedb-pro.git
```

---

## 2.3 安装依赖

```bash
cd "D:/TheClaw/.openclaw/workspace/plugins/memory-lancedb-pro"
npm install
```

**⚠️ Windows pnpm 符号链接陷阱（来自飞书依赖修复经验）**

如果项目使用 pnpm，`npm install` 后部分包可能以**符号链接**形式存在于 `node_modules/` 中，指向 pnpm 虚拟存储。这在 Electron 打包后无法被正确解析，导致 gateway 加载插件时报 `Cannot find module` 错误。

**验证方法**：
```bash
# 检查关键依赖是否是真实目录
ls -la "D:/TheClaw/.openclaw/workspace/plugins/memory-lancedb-pro/node_modules/@lancedb"
ls -la "D:/TheClaw/.openclaw/workspace/plugins/memory-lancedb-pro/node_modules/vectordb"
```

如果输出带 `->` 箭头，则是符号链接，需要替换为真实文件：
```bash
# 示例（按实际路径修改）
rm "D:/TheClaw/.openclaw/workspace/plugins/memory-lancedb-pro/node_modules/@lancedb/lancedb"
cp -rL "$(realpath node_modules/.pnpm/.../node_modules/@lancedb/lancedb)" \
       "D:/TheClaw/.openclaw/workspace/plugins/memory-lancedb-pro/node_modules/@lancedb/lancedb"
```

**注意**：该插件通过 npm 而非 pnpm 安装，符号链接问题出现概率较低，但仍需验证。

---

## 2.4 验证安装文件结构

```bash
ls "D:/TheClaw/.openclaw/workspace/plugins/memory-lancedb-pro/"
```

预期看到：
```
index.ts  src/  cli.ts  package.json  node_modules/  dist/  ...
```

如果有 `dist/` 或 `build/` 目录说明已构建；如果只有 `index.ts` 源码，需确认插件是否需要编译步骤：
```bash
cat "D:/TheClaw/.openclaw/workspace/plugins/memory-lancedb-pro/package.json" | grep '"main"'
```

若 `"main"` 指向 `dist/` 下的文件，则需要先构建：
```bash
cd "D:/TheClaw/.openclaw/workspace/plugins/memory-lancedb-pro"
npm run build   # 或 npx tsc
```

---

## 2.5 获取 Jina AI API Key

插件使用 Jina AI 的 Embedding API（免费额度足够个人使用）。

1. 访问 [https://jina.ai](https://jina.ai)
2. 注册/登录后获取 API Key（格式：`jina_...`）
3. 记录 Key，下一步配置时使用

---

## 2.6 下一步

完成安装后，进入 [03-openclaw-config.md](./03-openclaw-config.md) 配置 `openclaw.json`。
