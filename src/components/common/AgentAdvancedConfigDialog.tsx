import { useState } from 'react'
import { Settings2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Agent } from '@/stores/agents'

interface AgentAdvancedConfigDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    agent: Agent | null
}

export function AgentAdvancedConfigDialog({
    open,
    onOpenChange,
    agent
}: AgentAdvancedConfigDialogProps) {
    const [appId, setAppId] = useState('')
    const [appSecret, setAppSecret] = useState('')
    const [pairingCode, setPairingCode] = useState('')
    const [bindingStep, setBindingStep] = useState<'input' | 'pairing' | 'done'>('input')
    const [bindingLoading, setBindingLoading] = useState(false)

    const handleBindFeishu = async () => {
        if (!appId || !appSecret) return

        setBindingLoading(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500))
        setBindingLoading(false)
        setBindingStep('pairing')
    }

    const handleApprovePairing = async () => {
        if (!pairingCode) return

        setBindingLoading(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500))
        setBindingLoading(false)
        setBindingStep('done')
    }

    const handleClose = () => {
        setAppId('')
        setAppSecret('')
        setPairingCode('')
        setBindingStep('input')
        onOpenChange(false)
    }

    if (!agent) return null

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        {agent.name} - 高级配置
                    </DialogTitle>
                    <DialogDescription>
                        连接到集成协议，让数字员工支持自动化对话与外部触发。
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Integration Platform List */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">集成协议</Label>
                        <div className="grid gap-3">
                            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                        <span className="text-xl">📱</span>
                                    </div>
                                    <div>
                                        <p className="font-medium">飞书 Robot</p>
                                        <p className="text-xs text-muted-foreground">自动化集成协议</p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {}}
                                >
                                    配置
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Feishu Binding Section */}
                    <div className="space-y-4 pt-4 border-t">
                        <Label className="text-sm font-medium">飞书绑定配置</Label>

                        {bindingStep === 'input' && (
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
                                    {bindingLoading && <span className="mr-2">⏳</span>}
                                    一键绑定并配置
                                </Button>
                            </div>
                        )}

                        {bindingStep === 'pairing' && (
                            <div className="space-y-3">
                                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm">
                                    <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">第一步绑定完成！</p>
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
                                    {bindingLoading && <span className="mr-2">⏳</span>}
                                    确认配对
                                </Button>
                            </div>
                        )}

                        {bindingStep === 'done' && (
                            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                <p className="font-medium text-green-700 dark:text-green-300">飞书绑定成功！</p>
                                <p className="text-sm text-green-600 dark:text-green-400">
                                    飞书机器人可以开始使用了。
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        关闭
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
