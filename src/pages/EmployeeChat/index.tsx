import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Bot,
    Brain,
    Trash2,
    ChevronLeft,
    MessageSquare,
    History,
    Sparkles,
    AlertCircle,
    Plus,
    RefreshCw
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChatMessage } from '../Chat/ChatMessage';
import { ChatInput } from '../Chat/ChatInput';
import { extractText, extractThinking, extractImages, extractToolUse } from '../Chat/message-utils';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn, getAvatarUrl } from '@/lib/utils';

export function EmployeeChat() {
    const { id: agentId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const gatewayStatus = useGatewayStore((s) => s.status);
    const isGatewayRunning = gatewayStatus.state === 'running';

    const { agents, setAgentStatus } = useAgentsStore();
    const agent = agents.find(a => a.id === agentId);

    const messages = useChatStore((s) => s.messages);
    const loading = useChatStore((s) => s.loading);
    const sending = useChatStore((s) => s.sending);
    const error = useChatStore((s) => s.error);
    const showThinking = useChatStore((s) => s.showThinking);
    const streamingMessage = useChatStore((s) => s.streamingMessage);
    const streamingTools = useChatStore((s) => s.streamingTools);
    const pendingFinal = useChatStore((s) => s.pendingFinal);
    const sessions = useChatStore((s) => s.sessions);
    const currentSessionKey = useChatStore((s) => s.currentSessionKey);
    const sessionLabels = useChatStore((s) => s.sessionLabels);
    const sessionLastActivity = useChatStore((s) => s.sessionLastActivity);

    const toggleThinking = useChatStore((s) => s.toggleThinking);

    const loadHistory = useChatStore((s) => s.loadHistory);
    const loadSessions = useChatStore((s) => s.loadSessions);
    const switchSession = useChatStore((s) => s.switchSession);
    const sendMessage = useChatStore((s) => s.sendMessage);
    const abortRun = useChatStore((s) => s.abortRun);
    const clearError = useChatStore((s) => s.clearError);
    const cleanupEmptySession = useChatStore((s) => s.cleanupEmptySession);
    const deleteSession = useChatStore((s) => s.deleteSession);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [streamingTimestamp, setStreamingTimestamp] = useState<number>(0);
    const [sessionsLoading, setSessionsLoading] = useState(false);

    // URL 参数驱动的 session key
    const sessionParam = searchParams.get('session');
    const sessionKey = useMemo(() => {
        if (sessionParam) {
            if (sessionParam.startsWith('agent:')) return sessionParam;
            return `agent:${agentId}:${sessionParam}`;
        }
        return `agent:${agentId}:main`;
    }, [agentId, sessionParam]);

    // Session management functions
    const handleLoadSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            await loadSessions();
        } finally {
            setSessionsLoading(false);
        }
    }, [loadSessions]);

    // URL-only: the sessionKey effect handles store sync
    const handleSessionChange = useCallback((key: string) => {
        const urlKey = key.includes(':') ? key.split(':').pop()! : key;
        const newParams = new URLSearchParams(searchParams);
        newParams.set('session', urlKey);
        setSearchParams(newParams);
    }, [searchParams, setSearchParams]);

    const handleNewSession = useCallback(() => {
        handleSessionChange(`agent:${agentId}:session-${Date.now()}`);
    }, [agentId, handleSessionChange]);

    const handleDeleteSession = useCallback(async (key: string) => {
        await deleteSession(key);
        if (currentSessionKey === key) {
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('session');
            setSearchParams(newParams);
        }
    }, [deleteSession, currentSessionKey, searchParams, setSearchParams]);

    // Synchronize chat session with selected agent and URL param
    useEffect(() => {
        if (!agentId || !isGatewayRunning) return;
        switchSession(sessionKey);
        void loadHistory(false);
        return () => {
            cleanupEmptySession();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [agentId, isGatewayRunning, sessionKey]);

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

    // 根据发送状态更新 agent 的在线状态
    useEffect(() => {
        if (!agentId) return;

        if (sending) {
            // 发送消息时设置为"工作中"
            setAgentStatus(agentId, 'busy');
        } else {
            // 发送完成后恢复"在线"状态
            setAgentStatus(agentId, 'idle');
        }
    }, [sending, agentId, setAgentStatus]);

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
                        <AvatarImage src={agent.identity?.avatarUrl || getAvatarUrl(agentId as string)} />
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
                    <DropdownMenu onOpenChange={(open) => open && handleLoadSessions()}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors" title="会话历史">
                                <History className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                            <div className="px-3 py-2 border-b flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">会话历史</span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleLoadSessions}
                                        disabled={sessionsLoading}
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                    >
                                        <RefreshCw className={cn("h-3 w-3", sessionsLoading && "animate-spin")} />
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNewSession();
                                        }}
                                        className="h-7 px-2 text-[10px] font-bold"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        新对话
                                    </Button>
                                </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto py-1">
                                {sessions.length === 0 ? (
                                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                                        暂无历史会话
                                    </div>
                                ) : (
                                    sessions
                                        .filter(s => s.key.startsWith(`agent:${agentId}:`))
                                        .sort((a, b) => {
                                            const timeA = sessionLastActivity[a.key] || 0;
                                            const timeB = sessionLastActivity[b.key] || 0;
                                            return timeB - timeA;
                                        })
                                        .map((session) => {
                                            const isCurrent = session.key === currentSessionKey;
                                            const isMain = session.key.endsWith(':main');
                                            const displayTitle = isMain
                                                ? '主要对话'
                                                : sessionLabels[session.key] || session.displayName || session.key.split(':').pop();

                                            return (
                                                <DropdownMenuItem
                                                    key={session.key}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSessionChange(session.key);
                                                    }}
                                                    className={cn(
                                                        "flex flex-col items-start gap-1 py-2 cursor-pointer",
                                                        isCurrent && "bg-accent"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className={cn(
                                                            "text-sm truncate flex-1",
                                                            isCurrent ? "font-semibold text-primary" : "font-medium text-foreground"
                                                        )}>
                                                            {displayTitle}
                                                        </span>
                                                        {!isMain && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteSession(session.key);
                                                                }}
                                                                className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {sessionLastActivity[session.key] && (
                                                        <span className="text-[10px] text-muted-foreground truncate w-full">
                                                            {new Date(sessionLastActivity[session.key]!).toLocaleString('zh-CN', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    )}
                                                </DropdownMenuItem>
                                            );
                                        })
                                )}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn('h-9 w-9', !showThinking && 'bg-primary/10 text-primary')}
                                onClick={toggleThinking}
                            >
                                <Brain className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{showThinking ? '隐藏思考过程' : '显示思考过程'}</p>
                        </TooltipContent>
                    </Tooltip>
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
