# UI 组件修改计划

## 文件变更列表

| 序号 | 文件路径 | 操作 | 说明 |
|------|---------|------|------|
| 1 | `src/components/common/AgentAdvancedConfigDialog.tsx` | 修改 | 实现实际绑定逻辑 |
| 2 | `src/components/common/BindingTerminalLog.tsx` | 新建 | 绑定过程终端日志组件 |
| 3 | `src/components/common/AgentManageDialog.tsx` | 可选修改 | 显示飞书绑定状态 |
| 4 | `src/pages/HomeDashboard/index.tsx` | 可选修改 | 显示 Agent 飞书状态图标 |

---

## 1. AgentAdvancedConfigDialog.tsx 修改

### 1.1 新增 Import

```typescript
import { useEffect, useCallback } from 'react'
import { useAgentFeishuStore, useAgentFeishuConfig } from '@/stores/agentFeishu'
import { BindingTerminalLog } from './BindingTerminalLog'
```

### 1.2 组件状态修改

将现有的本地状态替换为 Store 状态：

```typescript
// 删除原有状态：
// const [appId, setAppId] = useState('')
// const [appSecret, setAppSecret] = useState('')
// const [pairingCode, setPairingCode] = useState('')
// const [bindingStep, setBindingStep] = useState<'input' | 'pairing' | 'done'>('input')
// const [bindingLoading, setBindingLoading] = useState(false)

// 使用 Store
const store = useAgentFeishuStore()
const config = useAgentFeishuConfig(agent?.id || null)

// 本地表单状态
const [appId, setAppId] = useState('')
const [appSecret, setAppSecret] = useState('')
const [pairingCode, setPairingCode] = useState('')

// 从 Store 获取状态
const bindingStep = store.binding.step
const bindingLoading = store.binding.loading
const bindingLog = store.binding.log
```

### 1.3 加载已有配置

```typescript
// 当对话框打开时加载配置
useEffect(() => {
  if (open && agent?.id) {
    store.loadConfig(agent.id)
    store.resetBinding()
    // 重置表单
    setAppId('')
    setAppSecret('')
    setPairingCode('')
  }
}, [open, agent?.id])

// 如果已有配置，填充表单
useEffect(() => {
  if (config?.appId) {
    setAppId(config.appId)
  }
}, [config])
```

### 1.4 修改绑定处理函数

```typescript
const handleBindFeishu = async () => {
  if (!agent?.id || !appId || !appSecret) return
  await store.startBinding(agent.id, appId, appSecret)
}

const handleApprovePairing = async () => {
  if (!agent?.id || !pairingCode) return
  await store.approvePairing(agent.id, pairingCode)
}

const handleUnbind = async () => {
  if (!agent?.id) return
  await store.unbind(agent.id)
}
```

### 1.5 修改关闭处理

```typescript
const handleClose = () => {
  store.resetBinding()
  setAppId('')
  setAppSecret('')
  setPairingCode('')
  onOpenChange(false)
}
```

### 1.6 修改渲染逻辑

根据绑定状态显示不同内容：

```tsx
{/* 飞书绑定配置区域 */}
<div className="space-y-4 pt-4 border-t">
  <div className="flex items-center justify-between">
    <Label className="text-sm font-medium">飞书绑定配置</Label>
    {config?.paired && (
      <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
        已绑定
      </span>
    )}
  </div>

  {/* 已绑定状态 - 显示解绑按钮 */}
  {config?.paired && bindingStep === 'idle' && (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
        <p className="text-sm text-green-700 dark:text-green-300">
          <span className="font-medium">App ID:</span> {config.appId}
        </p>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          配对时间: {config.pairedAt ? new Date(config.pairedAt).toLocaleString() : '未知'}
        </p>
      </div>
      <Button
        variant="outline"
        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={handleUnbind}
        disabled={bindingLoading}
      >
        {bindingLoading ? '解绑中...' : '解除绑定'}
      </Button>
    </div>
  )}

  {/* 未绑定状态 - 显示输入表单 */}
  {!config?.paired && bindingStep === 'idle' && (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="appId" className="text-xs">App ID (cli_开头)</Label>
        <Input
          id="appId"
          placeholder="例如: cli_a9f6d8b1adb85cca"
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="appSecret" className="text-xs">App Secret</Label>
        <Input
          id="appSecret"
          type="password"
          placeholder="例如: TVj9CyZNdIXC0OZGdcxMPhGnhQ2Sj3gB"
          value={appSecret}
          onChange={(e) => setAppSecret(e.target.value)}
        />
      </div>
      <Button
        className="w-full"
        onClick={handleBindFeishu}
        disabled={!appId || !appSecret || bindingLoading}
      >
        {bindingLoading ? '绑定中...' : '一键绑定并配置'}
      </Button>
    </div>
  )}

  {/* 输入凭证后的配对步骤 */}
  {bindingStep === 'pairing' && (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm">
        <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">配置已保存！</p>
        <p className="text-blue-600 dark:text-blue-400">
          请在飞书私聊机器人并发送任意消息（如"你好"），获取 8 位配对码并填入下方：
        </p>
      </div>
      <div className="space-y-2">
        <Input
          placeholder="例如: ZBUYQZNY"
          value={pairingCode}
          onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
          maxLength={8}
        />
      </div>
      <Button
        className="w-full"
        onClick={handleApprovePairing}
        disabled={pairingCode.length !== 8 || bindingLoading}
      >
        {bindingLoading ? '配对中...' : '确认配对'}
      </Button>
    </div>
  )}

  {/* 绑定完成 */}
  {bindingStep === 'done' && (
    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
      <p className="font-medium text-green-700 dark:text-green-300">飞书绑定成功！</p>
      <p className="text-sm text-green-600 dark:text-green-400">
        飞书机器人可以开始使用了。
      </p>
    </div>
  )}

  {/* 错误状态 */}
  {bindingStep === 'error' && (
    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
      <p className="text-sm text-red-700 dark:text-red-300 font-medium">绑定失败</p>
      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
        {store.binding.error || '请检查 AppID/AppSecret 是否正确'}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => store.resetBinding()}
      >
        重试
      </Button>
    </div>
  )}

  {/* 终端日志显示 */}
  {bindingLog && (bindingStep === 'input' || bindingStep === 'pairing') && (
    <BindingTerminalLog log={bindingLog} />
  )}
</div>
```

---

## 2. BindingTerminalLog.tsx 新建

### 文件位置

`src/components/common/BindingTerminalLog.tsx`

### 完整代码

```tsx
/**
 * Binding Terminal Log Component
 * Displays command execution logs in a terminal-like UI
 */
import { useRef, useEffect } from 'react'
import { Terminal } from 'lucide-react'

interface BindingTerminalLogProps {
  log: string
  maxHeight?: number
}

export function BindingTerminalLog({ log, maxHeight = 160 }: BindingTerminalLogProps) {
  const scrollRef = useRef<HTMLPreElement>(null)

  // Auto-scroll to bottom when log updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [log])

  // Strip ANSI escape codes for clean display
  const cleanLog = log.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')

  return (
    <div className="mt-4 rounded-lg overflow-hidden border border-slate-800 dark:border-slate-700">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 border-b border-slate-800 dark:border-slate-700">
        <Terminal className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs text-slate-400">执行日志</span>
      </div>
      <pre
        ref={scrollRef}
        className="p-3 bg-[#0d0d0d] text-[#4CAF50] font-mono text-xs overflow-y-auto"
        style={{ maxHeight, margin: 0 }}
      >
        {cleanLog || '> 等待执行...'}
      </pre>
    </div>
  )
}
```

---

## 3. AgentManageDialog.tsx 可选修改

在 Agent 列表中显示飞书绑定状态：

```typescript
import { useAgentFeishuConfig } from '@/stores/agentFeishu'
```

在 Agent 行中显示状态：

```tsx
// 在表格行中添加状态列
<div className="flex items-center gap-2">
  <FeishuStatusBadge agentId={agent.id} />
</div>

// 新建组件
function FeishuStatusBadge({ agentId }: { agentId: string }) {
  const config = useAgentFeishuConfig(agentId)

  if (!config?.enabled) {
    return (
      <span className="text-xs text-slate-400">未配置</span>
    )
  }

  if (config.paired) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        已绑定
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
      待配对
    </span>
  )
}
```

---

## 4. HomeDashboard.tsx 可选修改

在 Agent 卡片上显示飞书状态小图标：

```typescript
import { useAgentFeishuConfig } from '@/stores/agentFeishu'
```

在 Agent 卡片中添加：

```tsx
// 在 Card 内容中添加状态指示器
<div className="absolute top-2 right-2">
  <AgentFeishuStatus agentId={agent.id} />
</div>

// 状态组件
function AgentFeishuStatus({ agentId }: { agentId: string }) {
  const config = useAgentFeishuConfig(agentId)

  if (!config?.enabled) return null

  return (
    <div
      className={`w-2 h-2 rounded-full ${
        config.paired
          ? 'bg-green-500'
          : 'bg-amber-500 animate-pulse'
      }`}
      title={config.paired ? '飞书已绑定' : '飞书待配对'}
    />
  )
}
```

---

## 5. 样式主题适配

所有组件需要支持 TailwindCSS 暗色模式：

- 使用 `dark:` 前缀适配暗色主题
- 避免硬编码颜色，使用 `bg-muted/30`、`text-muted-foreground` 等语义化类名
- 终端日志使用深色背景保证可读性

---

## 6. 错误处理 UX

建议添加的错误处理：

1. **网络错误**: 显示重试按钮
2. **配置错误**: 显示具体错误信息（如 "AppID 格式不正确"）
3. **配对码错误**: 提示用户重新获取配对码
4. **超时处理**: 命令执行超过 30 秒自动提示
