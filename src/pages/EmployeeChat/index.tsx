import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Bot,
    Settings2,
    Trash2,
    MoreHorizontal,
    ChevronLeft,
    MessageSquare,
    History,
    Sparkles,
    AlertCircle
} from 'lucide-react';
import { useChatStore, type RawMessage } from '@/stores/chat';
import { useAgentsStore } from '@/stores/agents';
import { useGatewayStore } from '@/stores/gateway';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChatMessage } from '../Chat/ChatMessage';
import { ChatInput } from '../Chat/ChatInput';
import { extractText, extractThinking, extractImages, extractToolUse } from '../Chat/message-utils';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/lib/utils';

export function EmployeeChat() {
    const { id: agentId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const gatewayStatus = useGatewayStore((s) => s.status);
    const isGatewayRunning = gatewayStatus.state === 'running';

    const { agents } = useAgentsStore();
    const agent = agents.find(a => a.id === agentId);

    const messages = useChatStore((s) => s.messages);
    const loading = useChatStore((s) => s.loading);
    const sending = useChatStore((s) => s.sending);
    const error = useChatStore((s) => s.error);
    const showThinking = useChatStore((s) => s.showThinking);
    const streamingMessage = useChatStore((s) => s.streamingMessage);
    const streamingTools = useChatStore((s) => s.streamingTools);
    const pendingFinal = useChatStore((s) => s.pendingFinal);

    const loadHistory = useChatStore((s) => s.loadHistory);
    const loadSessions = useChatStore((s) => s.loadSessions);
    const switchSession = useChatStore((s) => s.switchSession);
    const sendMessage = useChatStore((s) => s.sendMessage);
    const abortRun = useChatStore((s) => s.abortRun);
    const clearError = useChatStore((s) => s.clearError);
    const cleanupEmptySession = useChatStore((s) => s.cleanupEmptySession);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [streamingTimestamp, setStreamingTimestamp] = useState<number>(0);

    // Synchronize chat session with the selected agent
    useEffect(() => {
        if (!agentId || !isGatewayRunning) return;

        const sessionKey = `agent:${agentId}:main`;

        // Switch to agent's main session
        switchSession(sessionKey);

        // Initial load
        void loadSessions().then(() => {
            void loadHistory(false);
        });

        return () => {
            cleanupEmptySession();
        };
    }, [agentId, isGatewayRunning, switchSession, loadSessions, loadHistory, cleanupEmptySession]);

    // Auto-scroll logic
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingMessage, sending, pendingFinal]);

    // Streaming timestamp tracking
    useEffect(() => {
        if (sending && streamingTimestamp === 0) {
            setStreamingTimestamp(Date.now() / 1000);
        } else if (!sending && streamingTimestamp !== 0) {
            setStreamingTimestamp(0);
        }
    }, [sending, streamingTimestamp]);

    if (!agent) {
        return (
            <div className="flex h-full items-center justify-center flex-col gap-4">
                <Bot className="h-12 w-12 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground">未找到该数字员工</p>
                <Button variant="outline" onClick={() => navigate('/')}>返回首页</Button>
            </div>
        );
    }

    const streamMsg = streamingMessage && typeof streamingMessage === 'object'
        ? streamingMessage as unknown as { role?: string; content?: unknown; timestamp?: number }
        : null;
    const streamText = streamMsg ? extractText(streamMsg) : (typeof streamingMessage === 'string' ? streamingMessage : '');
    const hasStreamText = streamText.trim().length > 0;
    const streamThinking = streamMsg ? extractThinking(streamMsg) : null;
    const hasStreamThinking = showThinking && !!streamThinking && streamThinking.trim().length > 0;
    const streamTools = streamMsg ? extractToolUse(streamMsg) : [];
    const hasStreamTools = streamTools.length > 0;
    const streamImages = streamMsg ? extractImages(streamMsg) : [];
    const hasStreamImages = streamImages.length > 0;
    const hasStreamToolStatus = streamingTools.length > 0;
    const shouldRenderStreaming = sending && (hasStreamText || hasStreamThinking || hasStreamTools || hasStreamImages || hasStreamToolStatus);
    const hasAnyStreamContent = hasStreamText || hasStreamThinking || hasStreamTools || hasStreamImages || hasStreamToolStatus;

    return (
        <div className="flex flex-col h-full bg-background/50 backdrop-blur-sm relative overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate('/')}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-10 w-10 border-2 border-primary/20 p-0.5">
                        <AvatarImage src={agent.identity?.avatarUrl} />
                        <AvatarFallback className="bg-primary/5 text-lg">
                            {agent.identity?.emoji || '🤖'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <h2 className="text-base font-bold leading-tight">{agent.name}</h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                agent.status === 'idle' ? "bg-green-500" : "bg-amber-500"
                            )} />
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                {agent.status === 'idle' ? 'Running' : 'Working'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors">
                        <History className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2">
                                <Settings2 className="h-4 w-4" />
                                <span>设置</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive gap-2">
                                <Trash2 className="h-4 w-4" />
                                <span>清理会话</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {loading && !sending ? (
                        <div className="flex h-full items-center justify-center py-20">
                            <LoadingSpinner size="lg" />
                        </div>
                    ) : messages.length === 0 && !sending ? (
                        <div className="flex flex-col items-center justify-center text-center py-20 gap-4 opacity-40">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <MessageSquare className="h-8 w-8 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold text-lg">开启新会话</h3>
                                <p className="text-sm">与 {agent.name} 开始交流，处理各种任务。</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, idx) => (
                                <ChatMessage
                                    key={msg.id || `msg-${idx}`}
                                    message={msg}
                                    showThinking={showThinking}
                                />
                            ))}

                            {shouldRenderStreaming && (
                                <ChatMessage
                                    message={(streamMsg
                                        ? {
                                            ...(streamMsg as Record<string, unknown>),
                                            role: (typeof streamMsg.role === 'string' ? streamMsg.role : 'assistant') as RawMessage['role'],
                                            content: streamMsg.content ?? streamText,
                                            timestamp: streamMsg.timestamp ?? streamingTimestamp,
                                        }
                                        : {
                                            role: 'assistant',
                                            content: streamText,
                                            timestamp: streamingTimestamp,
                                        }) as RawMessage}
                                    showThinking={showThinking}
                                    isStreaming
                                    streamingTools={streamingTools}
                                />
                            )}

                            {sending && pendingFinal && !shouldRenderStreaming && (
                                <div className="flex gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <div className="bg-muted rounded-2xl px-4 py-3">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <LoadingSpinner size="sm" />
                                            <span>处理工具执行结果...</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {sending && !pendingFinal && !hasAnyStreamContent && (
                                <div className="flex gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <div className="bg-muted rounded-2xl px-4 py-3">
                                        <div className="flex gap-1.5 items-center">
                                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Error bar */}
            {error && (
                <div className="mx-6 mb-4 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                    <p className="text-sm text-destructive flex items-center gap-2 font-medium">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </p>
                    <Button variant="ghost" size="sm" onClick={clearError} className="h-8 text-destructive hover:bg-destructive/10">
                        忽略
                    </Button>
                </div>
            )}

            {/* Input */}
            <div className="px-6 pb-6 pt-2">
                <div className="max-w-4xl mx-auto bg-card border rounded-2xl shadow-xl p-2 focus-within:ring-2 ring-primary/20 transition-all">
                    <ChatInput
                        onSend={sendMessage}
                        onStop={abortRun}
                        disabled={!isGatewayRunning}
                        sending={sending}
                    />
                </div>
            </div>
        </div>
    );
}

export default EmployeeChat;
