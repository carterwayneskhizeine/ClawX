# ClawHub 技能安装机制文档

## 概述

ClawX 通过集成 ClawHub CLI 实现了从 ClawHub.ai 市场（https://clawhub.ai）搜索和安装 AI 技能的功能。本文档详细说明了技能安装的技术实现机制。

## 架构

```
┌─────────────────┐
│   React UI      │  Skills 页面
│   (Frontend)    │  - 搜索技能
│                 │  - 点击安装
└────────┬────────┘
         │ IPC 通信
         │ (clawhub:install)
         ↓
┌─────────────────┐
│  IPC Handler    │  electron/main/ipc-handlers.ts
└────────┬────────┘
         │ 调用服务
         ↓
┌─────────────────┐
│ClawHubService   │  electron/gateway/clawhub.ts
└────────┬────────┘
         │ 执行 CLI 命令
         │ (spawn 子进程)
         ↓
┌─────────────────┐
│  ClawHub CLI    │  node_modules/clawhub/
│  (clawdhub.js)  │  - 从网络下载技能
│                 │  - 解压到 skills 目录
└────────┬────────┘
         │ 写入文件
         ↓
┌─────────────────┐
│ ~/.openclaw/    │  技能存储位置
│   skills/       │
└─────────────────┘
```

## 核心组件

### 1. 依赖包

**文件**: `package.json`

```json
{
  "dependencies": {
    "clawhub": "^0.5.0"
  }
}
```

ClawHub 是一个 npm 包，提供命令行接口来管理 OpenClaw 技能。

---

### 2. ClawHubService

**文件**: `electron/gateway/clawhub.ts`

这是核心服务类，封装了与 ClawHub CLI 的所有交互。

#### 关键属性

```typescript
export class ClawHubService {
  private workDir: string;           // 工作目录 (~/.openclaw)
  private cliPath: string;            // CLI 二进制路径
  private cliEntryPath: string;       // CLI 入口脚本路径
  private useNodeRunner: boolean;     // 是否使用 Node 运行器
}
```

#### 初始化逻辑

```typescript
constructor() {
  // 使用用户配置目录，避免安装到项目目录
  this.workDir = getOpenClawConfigDir();
  
  // 开发模式：使用 node_modules/.bin/clawhub (Windows: clawhub.cmd)
  // 打包模式：使用 Electron 可执行文件 + ELECTRON_RUN_AS_NODE
  if (!app.isPackaged && fs.existsSync(binPath)) {
    this.cliPath = binPath;
    this.useNodeRunner = false;
  } else {
    this.cliPath = process.execPath;
    this.useNodeRunner = true;
  }
}
```

#### 安装方法

```typescript
async install(params: ClawHubInstallParams): Promise<void> {
  const args = ['install', params.slug];
  if (params.version) args.push('--version', params.version);
  if (params.force) args.push('--force');
  await this.runCommand(args);
}
```

---

### 3. 命令执行器

**文件**: `electron/gateway/clawhub.ts:73-138`

使用 Node.js `spawn` API 执行 CLI 命令：

```typescript
private async runCommand(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const commandArgs = this.useNodeRunner 
      ? [this.cliEntryPath, ...args] 
      : args;
    
    const isWin = process.platform === 'win32';
    const useShell = isWin && !this.useNodeRunner;
    
    const child = spawn(spawnCmd, spawnArgs, {
      cwd: this.workDir,
      shell: useShell,
      env: {
        ...process.env,
        CI: 'true',
        FORCE_COLOR: '0',
        CLAWHUB_WORKDIR: this.workDir,
        ELECTRON_RUN_AS_NODE: this.useNodeRunner ? '1' : undefined,
      },
      windowsHide: true,
    });
    
    // 处理 stdout/stderr 和进程退出
  });
}
```

**关键点**:
- Windows 下使用 shell 模式处理命令行参数
- `CLAWHUB_WORKDIR` 环境变量指定技能安装目录
- `ELECTRON_RUN_AS_NODE` 允许在打包后运行 Node.js 脚本

---

### 4. IPC 处理器

**文件**: `electron/main/ipc-handlers.ts:2525-2575`

将前端请求桥接到 ClawHubService：

```typescript
function registerClawHubHandlers(clawHubService: ClawHubService): void {
  // 安装技能
  ipcMain.handle('clawhub:install', async (_, params: ClawHubInstallParams) => {
    try {
      await clawHubService.install(params);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  
  // 其他处理器：search, uninstall, list, openSkillReadme
}
```

---

### 5. CLI 路径获取

**文件**: `electron/utils/paths.ts:136-146`

```typescript
export function getClawHubCliEntryPath(): string {
  return join(app.getAppPath(), 'node_modules', 'clawhub', 'bin', 'clawdhub.js');
}

export function getClawHubCliBinPath(): string {
  const binName = process.platform === 'win32' ? 'clawhub.cmd' : 'clawhub';
  return join(app.getAppPath(), 'node_modules', '.bin', binName);
}
```

---

### 6. 前端集成

**文件**: `src/pages/Skills/index.tsx`

前端通过 Zustand store 调用 IPC：

```typescript
// 安装技能
const { installSkill } = useSkillsStore();

// 调用示例
await installSkill({
  slug: 'some-skill',
  version: '1.0.0',
  force: false
});
```

**文件**: `src/stores/skills.ts:191-211`

```typescript
async installSkill(params: ClawHubInstallParams) {
  const { success, error } = await invokeIpc(
    'clawhub:install',
    params
  );
  
  if (!success) {
    throw new Error(error);
  }
  
  // 刷新技能列表
  this.refreshSkills();
}
```

## 安装流程

### 完整流程图

```
用户点击"安装"按钮
    ↓
useSkillsStore.installSkill()
    ↓
ipcRenderer.invoke('clawhub:install', { slug, version })
    ↓
ipcMain.handle('clawhub:install')
    ↓
ClawHubService.install()
    ↓
ClawHubService.runCommand(['install', slug])
    ↓
spawn(clawhub install slug)
    ↓
ClawHub CLI:
  1. 连接到 ClawHub.ai API
  2. 下载技能 ZIP 文件
  3. 验证签名
  4. 解压到 ~/.openclaw/skills/slug/
  5. 更新 ~/.openclaw/.clawhub/lock.json
    ↓
返回成功/失败
    ↓
前端刷新技能列表
    ↓
技能显示在 UI 中
```

### 技能目录结构

安装后技能的目录结构：

```
~/.openclaw/
├── skills/
│   └── my-skill/
│       ├── SKILL.md           # 技能文档
│       ├── skill.json         # 技能元数据
│       ├── index.ts           # 技能入口
│       └── ...
└── .clawhub/
    └── lock.json              # 已安装技能锁文件
```

---

## 技术细节

### 开发模式 vs 打包模式

#### 开发模式
```bash
# 直接调用 node_modules 中的 CLI
node_modules/.bin/clawhub install skill-name
# Windows
node_modules/.bin/clawhub.cmd install skill-name
```

#### 打包模式
```bash
# 使用 Electron 可执行文件运行 Node 脚本
/path/to/clawx --node node_modules/clawhub/bin/clawdhub.js install skill-name
```

---

### 环境变量

| 变量 | 用途 |
|------|------|
| `CLAWHUB_WORKDIR` | ClawHub 工作目录（默认 ~/.openclaw） |
| `CI` | 禁用交互式提示 |
| `FORCE_COLOR` | 禁用 ANSI 颜色代码 |
| `ELECTRON_RUN_AS_NODE` | 将 Electron 作为 Node.js 运行 |

---

### 错误处理

1. **CLI 不存在**:
   ```typescript
   if (!fs.existsSync(this.cliPath)) {
     reject(new Error(`ClawHub CLI not found at: ${this.cliPath}`));
   }
   ```

2. **命令失败**:
   ```typescript
   if (code !== 0 && code !== null) {
     reject(new Error(`Command failed: ${stderr || stdout}`));
   }
   ```

3. **前端重试机制**:
   - 网络超时：用户可以选择手动下载 ZIP 并解压
   - 速率限制：提示用户稍后重试或手动安装

---

### 卸载实现

**文件**: `electron/gateway/clawhub.ts:264-288`

卸载不使用 CLI，直接操作文件系统：

```typescript
async uninstall(params: ClawHubUninstallParams): Promise<void> {
  // 1. 删除技能目录
  const skillDir = path.join(this.workDir, 'skills', params.slug);
  await fsPromises.rm(skillDir, { recursive: true, force: true });
  
  // 2. 更新锁文件
  const lockFile = path.join(this.workDir, '.clawhub', 'lock.json');
  const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
  delete lockData.skills[params.slug];
  await fsPromises.writeFile(lockFile, JSON.stringify(lockData, null, 2));
}
```

---

## 相关文件清单

| 文件路径 | 作用 |
|---------|------|
| `package.json` | 定义 clawhub 依赖 |
| `electron/gateway/clawhub.ts` | ClawHubService 主逻辑 |
| `electron/main/ipc-handlers.ts` | IPC 桥接 |
| `electron/main/index.ts` | 注册 IPC 处理器 |
| `electron/utils/paths.ts` | CLI 路径获取 |
| `electron/preload/index.ts` | 暴露 IPC 给渲染进程 |
| `src/stores/skills.ts` | 前端状态管理 |
| `src/pages/Skills/index.tsx` | 技能管理 UI |

---

## 调试技巧

### 查看 CLI 命令

ClawHubService 在执行命令时会输出日志：

```typescript
console.log(`Running ClawHub command: ${displayCommand}`);
```

在开发模式下，可以在 Electron 开发者工具的 Console 中看到。

### 手动测试 CLI

```bash
# 在 ~/.openclaw 目录下
cd ~/.openclaw

# 搜索技能
npx clawhub search <query>

# 安装技能
npx clawhub install <slug>

# 列出已安装技能
npx clawhub list
```

### 查看技能目录

```bash
# macOS/Linux
ls -la ~/.openclaw/skills/

# Windows
dir %USERPROFILE%\.openclaw\skills\
```

---

## 参考资料

- ClawHub 市场: https://clawhub.ai
- OpenClaw 技能文档: https://docs.openclaw.ai/skills
- npm clawhub 包: https://www.npmjs.com/package/clawhub

---

## 修改历史

| 日期 | 版本 | 修改内容 |
|------|------|----------|
| 2026-03-08 | 0.1.23 | 初始版本：记录技能安装机制 |
