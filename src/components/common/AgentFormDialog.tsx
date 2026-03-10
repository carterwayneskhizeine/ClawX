import { useState, useEffect } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Agent } from '@/stores/agents'
import { getAvatarUrl, extractAvatarSeed } from '@/lib/utils'

interface AgentFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    agent?: Agent | null
    onSave: (data: {
        name: string
        emoji: string
        agentId?: string
        theme?: string
        avatarUrl?: string
    }) => Promise<void>
    loading?: boolean
}

export function AgentFormDialog({
    open,
    onOpenChange,
    agent,
    onSave,
    loading = false
}: AgentFormDialogProps) {
    const [name, setName] = useState('')
    const [agentId, setAgentId] = useState('')
    const [theme, setTheme] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [avatarSeed, setAvatarSeed] = useState('')
    const [errors, setErrors] = useState<{ name?: string; agentId?: string }>({})

    const isEdit = !!agent

    useEffect(() => {
        if (agent) {
            setName(agent.name)
            setAgentId(agent.id)
            setTheme(agent.identity?.theme || '')
            const currentAvatarUrl = agent.identity?.avatarUrl || getAvatarUrl(agent.id)
            setAvatarUrl(currentAvatarUrl)
            
            const extractedSeed = extractAvatarSeed(currentAvatarUrl)
            setAvatarSeed(extractedSeed !== null ? extractedSeed : agent.id)
        } else {
            setName('')
            setAgentId('')
            setTheme('')
            const seed = Date.now().toString()
            setAvatarSeed(seed)
            setAvatarUrl(getAvatarUrl(seed))
        }
    }, [agent, open])

    const validate = () => {
        const newErrors: { name?: string; agentId?: string } = {}

        if (!name.trim()) {
            newErrors.name = '请输入名称'
        }

        if (!isEdit && !agentId.trim()) {
            newErrors.agentId = '请输入员工标识'
        } else if (!isEdit && !/^[a-zA-Z0-9-]+$/.test(agentId)) {
            newErrors.agentId = '仅支持英文、数字和连字符'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return

        await onSave({
            name: name.trim(),
            emoji: '🤖', // Defaulting to robot emoji since we removed the picker 
            agentId: isEdit ? agent!.id : agentId.trim(),
            theme: theme.trim(),
            avatarUrl: avatarUrl
        })
    }


    const handleSeedRefresh = () => {
        if (avatarSeed.trim()) {
            setAvatarUrl(getAvatarUrl(avatarSeed))
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? '编辑数字员工' : '新增数字员工'}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? '修改员工信息' : '创建一个新的数字员工'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 rounded-xl shrink-0">
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback className="text-2xl rounded-xl bg-primary/10">
                                🤖
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-2 w-full">
                            <div className="flex items-center gap-2">
                                <Input 
                                    placeholder="输入随机词（Avatar Seed）..." 
                                    value={avatarSeed} 
                                    onChange={(e) => setAvatarSeed(e.target.value)}
                                    title="随机头像种子词"
                                />
                                <Button variant="outline" size="icon" type="button" onClick={handleSeedRefresh} title="生成网络头像">
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground mr-1">
                                提示：修改此 Seed 值将生成不同的随机网络头像，点击右侧刷新按钮应用。
                            </p>
                        </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">员工名称</label>
                        <Input
                            placeholder="例如：数据清洗官"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={errors.name ? 'border-destructive' : ''}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">{errors.name}</p>
                        )}
                    </div>

                    {/* Agent ID (only for create) */}
                    {!isEdit && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">员工标识 (英文/拼音)</label>
                            <Input
                                placeholder="例如：data-cleaner"
                                value={agentId}
                                onChange={(e) => setAgentId(e.target.value.toLowerCase())}
                                className={errors.agentId ? 'border-destructive' : ''}
                            />
                            {errors.agentId ? (
                                <p className="text-xs text-destructive">{errors.agentId}</p>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    将决定生成的物理文件夹名称
                                </p>
                            )}
                        </div>
                    )}

                    {/* Theme */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">角色背景/主题描述</label>
                        <Textarea
                            placeholder="例如：专注于跨平台数据清洗与自动化同步的专业助手。"
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        保存
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
