# 07 - Agent 对话框组件

## 新建文件

| 文件路径 | 功能 |
|---------|------|
| `src/components/common/EmojiPicker.tsx` | Emoji 图标选择器 |
| `src/components/common/AgentCreateDialog.tsx` | 创建/编辑 Agent 对话框 |
| `src/components/common/AgentManageDialog.tsx` | Agent 管理列表对话框 |

---

## 1. EmojiPicker 组件

### 文件: `src/components/common/EmojiPicker.tsx`

```tsx
/**
 * Emoji Picker
 * Grid of preset emojis for agent icon selection.
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';

// 预设 Emoji 列表（从 ui-react-prod Home.tsx 提取）
const PRESET_EMOJIS = [
  // 人物/职业
  '🤖', '👨‍💻', '👩‍💻', '🧑‍💼', '👨‍🔬', '👩‍🔬',
  '👨‍🎨', '👩‍🎨', '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️',
  '👮', '👷', '💂', '🕵️', '👼', '🎅',
  '👸', '🤴', '🦸', '🦹', '🧙', '🧚',
  // 科技/设备
  '📱', '💻', '🖥️', '⌨️', '💾', '📡',
  '🔋', '🔌', '🧭', '📷', '🎙️', '🎛️',
  // 文件/办公
  '📊', '📈', '📉', '📋', '📝', '✏️',
  '📌', '📎', '📏', '📐', '🗂️', '📁',
  // 工具
  '🔧', '🔨', '⚙️', '🛠️', '🔩', '💎',
  '🔮', '🧰', '🧲', '⛏️', '🔗', '⛓️',
  // 符号/状态
  '⭐', '🌟', '💫', '🔥', '💥', '⚡',
  '💡', '🎯', '🏆', '🥇', '✅', '💯',
  '🔔', '📢', '📣', '🆗', '🆕', '🆙',
  // 自然
  '☀️', '🌈', '🌊', '❄️', '⚡', '🌪️',
  // 交通
  '🚀', '✈️', '🚄', '🏎️', '🚁', '🛸',
  // 动物
  '🐶', '🐱', '🐼', '🦊', '🦁', '🐲',
  '🦅', '🦉', '🐳', '🦋', '🐝', '🐢',
  // 食物
  '🍎', '🍕', '🍔', '☕', '🧃', '🍰',
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
  const [search, setSearch] = useState('');

  return (
    <div className={cn('w-full', className)}>
      {/* 当前选中 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-3xl">{value}</span>
        <span className="text-sm text-muted-foreground">当前图标</span>
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto
        p-2 rounded-lg border bg-background">
        {PRESET_EMOJIS.map((emoji, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onChange(emoji)}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-md text-lg',
              'hover:bg-accent transition-colors',
              value === emoji && 'bg-accent ring-2 ring-primary/50'
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## 2. AgentCreateDialog 组件

### 文件: `src/components/common/AgentCreateDialog.tsx`

```tsx
/**
 * Agent Create Dialog
 * Modal dialog for creating a new digital employee.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmojiPicker } from './EmojiPicker';
import { useAgentsStore } from '@/stores/agents';
import { Loader2 } from 'lucide-react';

interface AgentCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function AgentCreateDialog({ open, onOpenChange, onCreated }: AgentCreateDialogProps) {
  const createAgent = useAgentsStore((s) => s.createAgent);

  const [agentId, setAgentId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [emoji, setEmoji] = useState('🤖');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!agentId.trim()) {
      setError('请输入员工 ID（英文）');
      return;
    }
    if (!displayName.trim()) {
      setError('请输入员工名称');
      return;
    }

    // 验证 ID 格式（只允许英文、数字、连字符）
    if (!/^[a-zA-Z0-9-]+$/.test(agentId)) {
      setError('员工 ID 只能包含英文字母、数字和连字符');
      return;
    }

    setCreating(true);
    setError('');
    try {
      await createAgent({
        agentId: agentId.trim(),
        displayName: displayName.trim(),
        emoji,
      });
      onCreated?.();
      onOpenChange(false);
      // 重置表单
      setAgentId('');
      setDisplayName('');
      setEmoji('🤖');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !creating && onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative bg-background rounded-xl border shadow-2xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-lg font-semibold mb-4">创建数字员工</h2>

        <div className="space-y-4">
          {/* ID 输入 */}
          <div className="space-y-2">
            <Label htmlFor="agent-id">
              员工 ID <span className="text-muted-foreground text-xs">(英文，如 data-cleaner)</span>
            </Label>
            <Input
              id="agent-id"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="my-agent"
              disabled={creating}
            />
          </div>

          {/* 中文名输入 */}
          <div className="space-y-2">
            <Label htmlFor="display-name">显示名称</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="数据清洗官"
              disabled={creating}
            />
          </div>

          {/* Emoji 选择 */}
          <div className="space-y-2">
            <Label>选择图标</Label>
            <EmojiPicker value={emoji} onChange={setEmoji} />
          </div>

          {/* 错误信息 */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* 按钮 */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              取消
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {creating ? '创建中...' : '创建'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 3. AgentManageDialog 组件

### 文件: `src/components/common/AgentManageDialog.tsx`

```tsx
/**
 * Agent Manage Dialog
 * Table view for editing and deleting agents.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAgentsStore, type Agent } from '@/stores/agents';
import { Loader2, Pencil, Trash2, X } from 'lucide-react';

interface AgentManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: Agent[];
  onEdit?: (agent: Agent) => void;
  onDeleted?: () => void;
}

export function AgentManageDialog({
  open,
  onOpenChange,
  agents,
  onEdit,
  onDeleted,
}: AgentManageDialogProps) {
  const deleteAgent = useAgentsStore((s) => s.deleteAgent);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Agent | null>(null);

  const handleDelete = async (agent: Agent) => {
    setDeletingId(agent.id);
    try {
      await deleteAgent(agent.id);
      onDeleted?.();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />

      {/* Dialog */}
      <div className="relative bg-background rounded-xl border shadow-2xl
        w-full max-w-2xl mx-4 p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">数字员工管理</h2>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Agent Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 px-3 w-12">图标</th>
                <th className="py-2 px-3">ID</th>
                <th className="py-2 px-3">名称</th>
                <th className="py-2 px-3 w-28 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="border-b hover:bg-accent/50 transition-colors">
                  <td className="py-2 px-3 text-xl">{agent.identity?.emoji || '🤖'}</td>
                  <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{agent.id}</td>
                  <td className="py-2 px-3">{agent.name}</td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEdit?.(agent)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {agent.id !== 'main' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setConfirmDelete(agent)}
                          disabled={deletingId === agent.id}
                        >
                          {deletingId === agent.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="确认删除"
        message={confirmDelete ? `确定要物理删除「${confirmDelete.name}」吗？此操作无法撤销。` : ''}
        confirmLabel="删除"
        cancelLabel="取消"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
```

---

## 要点说明

### 对话框的实现方式

这里使用了**手动实现**的 Dialog（`fixed inset-0 z-50`），而非依赖第三方 Dialog 组件库。原因：

1. ClawX 的 `src/components/ui/` 中没有 Dialog 组件
2. shadcn Dialog 需要额外安装 `@radix-ui/react-dialog`
3. 手动实现更灵活，且符合 ClawX 现有**不依赖过多 Radix 组件**的风格

如果你已经安装了 `@radix-ui/react-dialog` 或 shadcn dialog，可以用它替换 backdrop + dialog 的部分。

### ConfirmDialog 复用

`ConfirmDialog` 是 ClawX 已有组件 (`src/components/ui/confirm-dialog.tsx`)，直接复用于删除确认。

### 创建 Agent 时的 ID 规则

- **必须是英文**：中文会被 `normalizeAgentId()` 清空导致创建失败
- 格式：`/^[a-zA-Z0-9-]+$/`
- 示例：`data-cleaner`, `report-writer`, `agent-001`
