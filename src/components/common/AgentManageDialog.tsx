import { useState } from 'react'
import { Settings2, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Agent } from '@/stores/agents'
import { cn } from '@/lib/utils'

interface AgentManageDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    agents: Agent[]
    loading?: boolean
    onEdit: (agent: Agent) => void
    onDelete: (agentId: string) => void
    onAdvancedConfig: (agent: Agent) => void
    deletingIds?: Set<string>
}

export function AgentManageDialog({
    open,
    onOpenChange,
    agents,
    loading = false,
    onEdit,
    onDelete,
    onAdvancedConfig,
    deletingIds = new Set()
}: AgentManageDialogProps) {
    const [confirmDelete, setConfirmDelete] = useState<Agent | null>(null)

    const handleDeleteClick = (agent: Agent) => {
        setConfirmDelete(agent)
    }

    const handleConfirmDelete = () => {
        if (confirmDelete) {
            onDelete(confirmDelete.id)
            setConfirmDelete(null)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'idle':
                return 'text-green-500'
            case 'busy':
                return 'text-amber-500'
            default:
                return 'text-slate-400'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'idle':
                return '空闲'
            case 'busy':
                return '忙碌'
            default:
                return '离线'
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>数字员工管理</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">头像</TableHead>
                                <TableHead>名称</TableHead>
                                <TableHead>当前任务</TableHead>
                                <TableHead className="w-[80px]">状态</TableHead>
                                <TableHead className="text-right w-[180px]">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && agents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>加载中...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : agents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        暂无数字员工
                                    </TableCell>
                                </TableRow>
                            ) : (
                                agents.map((agent) => (
                                    <TableRow key={agent.id}>
                                        <TableCell>
                                            <Avatar className="h-10 w-10 rounded-lg">
                                                <AvatarImage src={agent.identity?.avatarUrl} />
                                                <AvatarFallback className="rounded-lg text-lg">
                                                    {agent.identity?.emoji || '🤖'}
                                                </AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell className="font-medium">{agent.name}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {agent.status === 'idle' ? '在线' : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn("text-sm font-medium", getStatusColor(agent.status))}>
                                                {getStatusText(agent.status)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onEdit(agent)}
                                                >
                                                    编辑
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onAdvancedConfig(agent)}
                                                >
                                                    <Settings2 className="h-4 w-4 mr-1" />
                                                    高级配置
                                                </Button>
                                                {agent.id !== 'main' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleDeleteClick(agent)}
                                                        disabled={deletingIds.has(agent.id)}
                                                    >
                                                        {deletingIds.has(agent.id) ? (
                                                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4 mr-1" />
                                                        )}
                                                        删除
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Confirm Delete Dialog */}
                <ConfirmDialog
                    open={!!confirmDelete}
                    title="确认删除"
                    message={confirmDelete ? `确定要删除「${confirmDelete.name}」吗？此操作无法撤销。` : ''}
                    confirmLabel="删除"
                    cancelLabel="取消"
                    variant="destructive"
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setConfirmDelete(null)}
                />
            </DialogContent>
        </Dialog>
    )
}
