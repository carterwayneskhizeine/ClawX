import { useState, useEffect } from 'react'
import { Settings2, CheckCircle2, Loader2 } from 'lucide-react'
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
import { useAgentFeishuStore, useAgentFeishuConfig } from '@/stores/agentFeishu'

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
    const {
        loadConfig,
        resetBinding,
        startBinding,
        approvePairing,
        unbind,
        binding
    } = useAgentFeishuStore()
    const config = useAgentFeishuConfig(agent?.id || null)

    const [appId, setAppId] = useState('')
    const [appSecret, setAppSecret] = useState('')
    const [pairingCode, setPairingCode] = useState('')

    // From Store
    const bindingStep = binding.step
    const bindingLoading = binding.loading
    const bindingLog = binding.log
    const bindingError = binding.error

    useEffect(() => {
        if (open && agent?.id) {
            loadConfig(agent.id)
            resetBinding()
            setAppId('')
            setAppSecret('')
            setPairingCode('')
        }
    }, [open, agent?.id, loadConfig, resetBinding])

    useEffect(() => {
        if (config?.appId && !appId) {
            setAppId(config.appId)
        }
    }, [config?.appId, appId])

    const handleBindFeishu = async () => {
        if (!agent?.id || !appId || !appSecret) return
        await startBinding(agent.id, appId, appSecret)
    }

    const handleApprovePairing = async () => {
        if (!agent?.id || !pairingCode) return
        await approvePairing(agent.id, pairingCode)
    }

    const handleUnbind = async () => {
        if (!agent?.id) return
        await unbind(agent.id)
    }

    const handleClose = () => {
        resetBinding()
        setAppId('')
        setAppSecret('')
        setPairingCode('')
        onOpenChange(false)
    }

    if (!agent) return null

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        {agent.name} - 飞书机器人
                    </DialogTitle>
                    <DialogDescription>
                        连接到集成协议，让数字员工支持自动化对话与外部触发。
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                        {/* Feishu Binding Section */}
                    <div className="space-y-4 pt-4 border-t">
                        <Label className="text-sm font-medium">飞书绑定配置</Label>

                        {/* 已绑定状态 - 显示展示与解绑 */}
                        {config?.paired && bindingStep === 'idle' && (
                            <div className="space-y-3">
                                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        <span className="font-medium">App ID:</span> {config.appId}
                                    </p>
                                    {config.pairedAt && (
                                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                            配对时间: {new Date(config.pairedAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
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
                                    <p className="text-blue-600 dark:text-blue-400 mt-1">
                                        如果飞书机器人直接回复了你，那就不需要输入配对码，可直接使用
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
                                    {bindingError || '请检查 AppID/AppSecret 是否正确'}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => resetBinding()}
                                >
                                    重试
                                </Button>
                            </div>
                        )}

                        {/* 进度提示及警告说明 */}
                        {(bindingStep !== 'idle' && bindingStep !== 'done' && bindingStep !== 'error') && (
                            <div className="space-y-4 p-4 rounded-xl border bg-muted/20">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {bindingStep === 'pairing' ? '等待您去获取并输入配对码...' : '自动化配置处理中...'}
                                        </span>
                                        {bindingLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full w-full animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-start text-xs text-slate-500 dark:text-slate-400">
                                    <span className="text-amber-500 mt-0.5 text-sm">⚠️</span>
                                    <p className="leading-relaxed">
                                        配置飞书机器人时，系统将在后台自动安装协议所需的依赖模块。在此期间，
                                        <span className="font-semibold text-amber-600 dark:text-amber-500">网关服务会临时断开重连，受限于网络环境，整个安装配置过程大约需要 3 分钟。</span>
                                        <br/>请不要惊慌，耐心等待，切勿关闭此窗口或强制退出程序。
                                    </p>
                                </div>
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

