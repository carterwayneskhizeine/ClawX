# 06 - 数字员工聊天页面

## 新建文件: `src/pages/EmployeeChat/index.tsx`

核心思路：**直接复用 `useChatStore`** + 现有的 `ChatMessage` / `ChatInput` 组件，通过 session key `agent:<id>:default` 路由到对应 Agent。

---

## 关键概念

### Session Key 路由机制

```
session key 格式: agent:<agentId>:<suffix>
例如: agent:data-cleaner:default
```

- Gateway 自动根据 `agent:` 前缀解析并路由到对应 Agent 实例
- 每个 Agent 的会话历史完全隔离
- `<suffix>` 部分可以是任意值（如 `default`, `main`, 自流水号），用于同一 Agent 的多个会话

### 与 Chat 页面的区别

| 差异点 | Chat 页面 | EmployeeChat 页面 |
|--------|-----------|-------------------|
| session key | `agent:main:main` (默认) | `agent:<agentId>:default` |
| 会话切换 | 在 Sidebar 选择 | 由 URL 参数 `:id` 决定 |
| Agent 信息 | 不显示 | 显示 Agent 名称 + Emoji + 返回按钮 |

---

## 完整代码

```tsx
/**
 * Employee Chat Page
 * Chat interface for a specific digital employee (agent).
 * Reuses the existing chat store and message components.
 */
import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/stores/chat';
import { useAgentsStore, type Agent } from '@/stores/agents';
import { ChatMessage } from '@/pages/Chat/ChatMessage';
import { ChatInput } from '@/pages/Chat/ChatInput';

export function EmployeeChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ★ 核心：构建 Agent 专用的 session key
  const sessionKey = `agent:${id}:default`;

  // Agent 信息
  const agents = useAgentsStore((s) => s.agents);
  const agent = agents.find((a) => a.id === id);

  // Chat store
  const messages = useChatStore((s) => s.messages);
  const sending = useChatStore((s) => s.sending);
  const loading = useChatStore((s) => s.loading);
  const streamingText = useChatStore((s) => s.streamingText);
  const streamingMessage = useChatStore((s) => s.streamingMessage);
  const streamingTools = useChatStore((s) => s.streamingTools);
  const showThinking = useChatStore((s) => s.showThinking);
  const switchSession = useChatStore((s) => s.switchSession);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const loadHistory = useChatStore((s) => s.loadHistory);
  const abortRun = useChatStore((s) => s.abortRun);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);

  // ★ 切换到该 Agent 的 session
  useEffect(() => {
    if (id && currentSessionKey !== sessionKey) {
      switchSession(sessionKey);
    }
  }, [id, sessionKey, currentSessionKey, switchSession]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = (text: string, attachments?: any[]) => {
    sendMessage(text, attachments);
  };

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Agent Header Bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0">
            {agent?.identity?.emoji || '🤖'}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-medium truncate">
              {agent?.name || id}
            </h3>
            <p className="text-xs text-green-500">在线</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            加载对话历史...
          </div>
        ) : messages.length === 0 && !sending ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-6xl mb-4">
              {agent?.identity?.emoji || '🤖'}
            </span>
            <h3 className="text-lg font-medium mb-2">
              {agent?.name || id}
            </h3>
            <p className="text-muted-foreground text-sm max-w-md">
              发送消息开始与数字员工对话
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <ChatMessage
                key={msg.id || idx}
                message={msg}
                showThinking={showThinking}
              />
            ))}

            {/* 流式消息 */}
            {streamingMessage && (
              <ChatMessage
                message={streamingMessage as any}
                isStreaming
                showThinking={showThinking}
                streamingTools={streamingTools}
              />
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t px-6 py-3">
        <ChatInput
          onSend={handleSend}
          disabled={loading}
          sending={sending}
          onAbort={abortRun}
        />
      </div>
    </div>
  );
}

export default EmployeeChat;
```

---

## 关键注意事项

### 1. ChatMessage / ChatInput 组件的 props

上述代码引用了 `ChatMessage` 和 `ChatInput` 的 props。需要查看这两个组件实际接受的 props 并适配：

```
文件: src/pages/Chat/ChatMessage.tsx
文件: src/pages/Chat/ChatInput.tsx
```

如果组件 props 名称不匹配，需要做调整。例如 `ChatInput` 的 `onSend` 回调签名可能与上面的 `handleSend` 不完全一致。

### 2. ChatMessage 和 ChatInput 的导出方式

确认这两个组件是 **named export** 还是 **default export**：

```typescript
// 如果是 default export，改为：
import ChatMessage from '@/pages/Chat/ChatMessage';
import ChatInput from '@/pages/Chat/ChatInput';
```

### 3. `-m-6` 负 margin 技巧

`MainLayout` 给 `<main>` 加了 `p-6` padding。EmployeeChat 需要全高度布局（header 贴边、input 贴底），所以用 `-m-6` 抵消父级 padding，在内部重新控制间距。

### 4. switchSession 的行为

`chat.ts` 的 `switchSession(key)` 方法会：
1. 清空当前 messages
2. 设置新的 `currentSessionKey`
3. 自动调用 `loadHistory()` 加载新 session 的历史

因此不需要手动调用 `loadHistory()`。

### 5. 流式消息的显示

`streamingMessage` 由 `handleChatEvent` 自动更新（通过 Gateway chat event 订阅）。这部分逻辑在 `chat.ts` 中已完整实现，EmployeeChat 只需渲染即可。
