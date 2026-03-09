import { useState, useEffect } from 'react'
import { Upload, Loader2 } from 'lucide-react'
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
import { EmojiPicker } from './EmojiPicker'
import { Agent } from '@/stores/agents'

interface AgentFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    agent?: Agent | null
    onSave: (data: {
        name: string
        emoji: string
        agentId?: string
        theme?: string
        avatar?: string
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
    const [emoji, setEmoji] = useState('🤖')
    const [agentId, setAgentId] = useState('')
    const [theme, setTheme] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [errors, setErrors] = useState<{ name?: string; agentId?: string }>({})

    const isEdit = !!agent

    useEffect(() => {
        if (agent) {
            setName(agent.name)
            setEmoji(agent.identity?.emoji || '🤖')
            setAgentId(agent.id)
            setTheme(agent.identity?.theme || '')
            setAvatarUrl(agent.identity?.avatarUrl || '')
        } else {
            setName('')
            setEmoji('🤖')
            setAgentId('')
            setTheme('')
            setAvatarUrl(`https://picsum.photos/seed/${Date.now()}/200`)
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
            emoji,
            agentId: isEdit ? agent!.id : agentId.trim(),
            theme: theme.trim(),
            avatar: avatarUrl
        })
    }

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = () => {
                setAvatarUrl(reader.result as string)
            }
            reader.readAsDataURL(file)
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
                        <Avatar className="h-16 w-16 rounded-xl">
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback className="text-2xl rounded-xl">
                                {emoji}
                            </AvatarFallback>
                        </Avatar>
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarUpload}
                            />
                            <Button variant="outline" size="sm" type="button" asChild>
                                <span className="flex items-center gap-2">
                                    <Upload className="h-4 w-4" />
                                    上传头像
                                </span>
                            </Button>
                        </label>
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

                    {/* Emoji */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">图标 (Emoji)</label>
                        <EmojiPicker value={emoji} onChange={setEmoji} />
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
