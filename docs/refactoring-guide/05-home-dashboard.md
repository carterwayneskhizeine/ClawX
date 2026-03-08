# 05 - 首页仪表盘

## 新建文件: `src/pages/HomeDashboard/index.tsx`

首页仪表盘是新 UI 的默认着陆页。主要包含：

1. Agent 卡片 Grid（点击进入对话）
2. 创建/管理 Agent 按钮
3. 统计信息区域（可选，后期添加图表）

---

## 完整代码

```tsx
/**
 * Home Dashboard
 * Digital employee overview grid + quick actions
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAgentsStore, type Agent } from '@/stores/agents';
import { useGatewayStore } from '@/stores/gateway';
import { AgentCreateDialog } from '@/components/common/AgentCreateDialog';
import { AgentManageDialog } from '@/components/common/AgentManageDialog';

export function HomeDashboard() {
  const navigate = useNavigate();
  const agents = useAgentsStore((s) => s.agents);
  const loading = useAgentsStore((s) => s.loading);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);
  const gatewayStatus = useGatewayStore((s) => s.status);

  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    if (gatewayStatus === 'running') {
      fetchAgents();
    }
  }, [gatewayStatus, fetchAgents]);

  // 监听 Agent 更新事件（创建/删除后刷新）
  useEffect(() => {
    const handler = () => fetchAgents();
    window.addEventListener('agents-updated', handler);
    return () => window.removeEventListener('agents-updated', handler);
  }, [fetchAgents]);

  const handleSelectAgent = (agent: Agent) => {
    navigate(`/employee/${agent.id}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">控制面板</h2>
          <p className="text-muted-foreground mt-1">
            欢迎您，这是您的数字员工概览
          </p>
        </div>
      </header>

      {/* Agent Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            数字员工状态 ({agents.length})
          </h3>
          <div className="flex gap-2">
            <Button
              onClick={() => setCreateOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              创建员工
            </Button>
            <Button
              variant="outline"
              onClick={() => setManageOpen(true)}
              className="gap-2"
            >
              <Settings2 className="h-4 w-4" />
              进入管理
            </Button>
          </div>
        </div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {loading && agents.length === 0 ? (
            <div className="col-span-full py-12 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : agents.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              未发现活跃的数字员工
            </div>
          ) : (
            agents.map((agent) => (
              <Card
                key={agent.id}
                className="cursor-pointer hover:shadow-md transition-all duration-200
                  hover:border-primary/30 p-4 text-center group"
                onClick={() => handleSelectAgent(agent)}
              >
                {/* Emoji 头像 */}
                <div className="mb-3 flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-accent flex items-center
                    justify-center text-3xl border border-border/50
                    group-hover:scale-105 transition-transform">
                    {agent.identity?.emoji || '🤖'}
                  </div>
                </div>

                {/* 名称 */}
                <h4 className="text-sm font-medium truncate">
                  {agent.name}
                </h4>

                {/* 状态 */}
                <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                  在线
                </p>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* 统计区域（简化版，后期可加 recharts 图表） */}
      <section className="pb-8">
        <h3 className="text-lg font-semibold mb-4">使用统计</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">今日对话次数</p>
            <p className="text-3xl font-bold mt-2">—</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">活跃员工数</p>
            <p className="text-3xl font-bold mt-2">{agents.length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Token 消耗</p>
            <p className="text-3xl font-bold mt-2">—</p>
          </Card>
        </div>
      </section>

      {/* 对话框 */}
      <AgentCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          fetchAgents();
          window.dispatchEvent(new Event('agents-updated'));
        }}
      />
      <AgentManageDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        agents={agents}
        onEdit={(agent) => {
          // 进入编辑模式（可复用 AgentCreateDialog 的编辑功能）
          console.log('Edit agent:', agent.id);
        }}
        onDeleted={() => {
          fetchAgents();
          window.dispatchEvent(new Event('agents-updated'));
        }}
      />
    </div>
  );
}

export default HomeDashboard;
```

---

## 组件依赖

此页面依赖以下尚未创建的组件（见 07-agent-dialogs.md）：

- `AgentCreateDialog` — 创建 Agent 对话框
- `AgentManageDialog` — Agent 管理列表对话框

如果尚未创建这些组件，可以先用占位符：

```tsx
// 临时占位
function AgentCreateDialog({ open, onOpenChange, onCreated }: any) {
  if (!open) return null;
  return <div>Create Dialog Placeholder</div>;
}

function AgentManageDialog({ open, onOpenChange, agents, onEdit, onDeleted }: any) {
  if (!open) return null;
  return <div>Manage Dialog Placeholder</div>;
}
```

---

## 样式说明

- 使用 shadcn `Card` 组件，保持与 ClawX 现有风格一致
- `animate-in fade-in slide-in-from-bottom-4` 是 TailwindCSS animate 插件的淡入动画
- `group` + `group-hover:scale-105` 实现卡片 hover 放大效果
- 暗色模式通过 `dark:` variant 自动适配
