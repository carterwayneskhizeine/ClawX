/**
 * Sidebar Component
 * Navigation sidebar with menu items.
 * No longer fixed - sits inside the flex layout below the title bar.
 */
import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  MessageSquare,
  Radio,
  Puzzle,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  Terminal,
  ExternalLink,
  Trash2,
  Users,
  ShoppingBag,
  GraduationCap,
  Zap,
  User,
  LogOut,
  MoreHorizontal,
  Monitor,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings';
import { useChatStore } from '@/stores/chat';
import { useAgentsStore } from '@/stores/agents';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { invokeIpc } from '@/lib/api-client';
import { useTranslation } from 'react-i18next';

type SessionBucketKey =
  | 'today'
  | 'yesterday'
  | 'withinWeek'
  | 'withinTwoWeeks'
  | 'withinMonth'
  | 'older';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  collapsed?: boolean;
  onClick?: () => void;
}

function NavItem({ to, icon, label, badge, collapsed, onClick }: NavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground',
          collapsed && 'justify-center px-2'
        )
      }
    >
      {icon}
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {badge && (
            <Badge variant="secondary" className="ml-auto">
              {badge}
            </Badge>
          )}
        </>
      )}
    </NavLink>
  );
}

function getSessionBucket(activityMs: number, nowMs: number): SessionBucketKey {
  if (!activityMs || activityMs <= 0) return 'older';

  const now = new Date(nowMs);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  if (activityMs >= startOfToday) return 'today';
  if (activityMs >= startOfYesterday) return 'yesterday';

  const daysAgo = (startOfToday - activityMs) / (24 * 60 * 60 * 1000);
  if (daysAgo <= 7) return 'withinWeek';
  if (daysAgo <= 14) return 'withinTwoWeeks';
  if (daysAgo <= 30) return 'withinMonth';
  return 'older';
}

const INITIAL_NOW_MS = Date.now();

export function Sidebar() {
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((state) => state.setSidebarCollapsed);
  const devModeUnlocked = useSettingsStore((state) => state.devModeUnlocked);
  const uiMode = useSettingsStore((state) => state.uiMode);

  const agents = useAgentsStore((state) => state.agents);
  const fetchAgents = useAgentsStore((state) => state.fetchAgents);

  const sessions = useChatStore((s) => s.sessions);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const sessionLabels = useChatStore((s) => s.sessionLabels);
  const sessionLastActivity = useChatStore((s) => s.sessionLastActivity);
  const switchSession = useChatStore((s) => s.switchSession);
  const newSession = useChatStore((s) => s.newSession);
  const deleteSession = useChatStore((s) => s.deleteSession);

  const navigate = useNavigate();
  const location = useLocation();
  const isOnChat = location.pathname === '/';
  const isEmployeePath = location.pathname.startsWith('/employee/');

  const getSessionLabel = (key: string, displayName?: string, label?: string) =>
    sessionLabels[key] ?? label ?? displayName ?? key;

  const openDevConsole = async () => {
    try {
      const result = await (invokeIpc('gateway:getControlUiUrl') as Promise<{
        success: boolean;
        url?: string;
        error?: string;
      }>);
      if (result.success && result.url) {
        window.electron.openExternal(result.url);
      } else {
        console.error('Failed to get Dev Console URL:', result.error);
      }
    } catch (err) {
      console.error('Error opening Dev Console:', err);
    }
  };

  const { t } = useTranslation(['common', 'chat']);
  const [sessionToDelete, setSessionToDelete] = useState<{ key: string; label: string } | null>(null);
  const [nowMs, setNowMs] = useState(INITIAL_NOW_MS);
  const [agentsExpanded, setAgentsExpanded] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  // 初始加载 + 监听 agent 更新事件
  useEffect(() => {
    if (uiMode === 'new') {
      fetchAgents();
    }

    // 监听 agents-updated 事件，当 agent 被创建/删除时刷新列表
    const handleAgentsUpdated = () => {
      if (uiMode === 'new') {
        fetchAgents();
      }
    };
    window.addEventListener('agents-updated', handleAgentsUpdated);

    return () => {
      window.removeEventListener('agents-updated', handleAgentsUpdated);
    };
  }, [uiMode, fetchAgents]);

  const sessionBuckets: Array<{ key: SessionBucketKey; label: string; sessions: typeof sessions }> = [
    { key: 'today', label: t('chat:historyBuckets.today'), sessions: [] },
    { key: 'yesterday', label: t('chat:historyBuckets.yesterday'), sessions: [] },
    { key: 'withinWeek', label: t('chat:historyBuckets.withinWeek'), sessions: [] },
    { key: 'withinTwoWeeks', label: t('chat:historyBuckets.withinTwoWeeks'), sessions: [] },
    { key: 'withinMonth', label: t('chat:historyBuckets.withinMonth'), sessions: [] },
    { key: 'older', label: t('chat:historyBuckets.older'), sessions: [] },
  ];
  const sessionBucketMap = Object.fromEntries(sessionBuckets.map((bucket) => [bucket.key, bucket])) as Record<
    SessionBucketKey,
    (typeof sessionBuckets)[number]
  >;

  for (const session of [...sessions].sort((a, b) =>
    (sessionLastActivity[b.key] ?? 0) - (sessionLastActivity[a.key] ?? 0)
  )) {
    const bucketKey = getSessionBucket(sessionLastActivity[session.key] ?? 0, nowMs);
    sessionBucketMap[bucketKey].sessions.push(session);
  }

  const navItems = [
    { to: '/cron', icon: <Clock className="h-5 w-5" />, label: t('sidebar.cronTasks') },
    { to: '/skills', icon: <Puzzle className="h-5 w-5" />, label: t('sidebar.skills') },
    { to: '/channels', icon: <Radio className="h-5 w-5" />, label: t('sidebar.channels') },
    { to: '/dashboard', icon: <Home className="h-5 w-5" />, label: t('sidebar.dashboard') },
    { to: '/settings', icon: <Settings className="h-5 w-5" />, label: t('sidebar.settings') },
  ];

  const newNavItems = [
    { to: '/', icon: <Home className="h-5 w-5" />, label: '首页' },
    { to: '/shop', icon: <ShoppingBag className="h-5 w-5" />, label: '技能商店' },
    { to: '/classroom', icon: <GraduationCap className="h-5 w-5" />, label: '学习课堂' },
    { to: '/points', icon: <Zap className="h-5 w-5" />, label: '算力积分' },
    { to: '/sys-settings', icon: <Settings className="h-5 w-5" />, label: '系统设置' },
  ];

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r bg-background transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 overflow-hidden flex flex-col p-2 gap-1">
        <div className="flex items-center gap-2 px-3 py-4 mb-2">
          <div className="flex shrink-0 items-center justify-center text-blue-600">
            <Monitor className="h-6 w-6" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-bold text-sm text-foreground tracking-wide whitespace-nowrap">
              OPC数字员工智能助手
            </span>
          )}
        </div>

        {uiMode === 'classic' ? (
          <>
            {/* Chat nav item: acts as "New Chat" button, never highlighted as active */}
            <button
              onClick={() => {
                const { messages } = useChatStore.getState();
                if (messages.length > 0) newSession();
                navigate('/');
              }}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground text-muted-foreground',
                sidebarCollapsed && 'justify-center px-2',
              )}
            >
              <MessageSquare className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span className="flex-1 text-left">{t('sidebar.newChat')}</span>}
            </button>

            {navItems.map((item) => (
              <NavItem
                key={item.to}
                {...item}
                collapsed={sidebarCollapsed}
              />
            ))}

            {/* Session list — below Settings, only when expanded */}
            {!sidebarCollapsed && sessions.length > 0 && (
              <div className="mt-1 overflow-y-auto max-h-72 space-y-0.5">
                {sessionBuckets.map((bucket) => (
                  bucket.sessions.length > 0 ? (
                    <div key={bucket.key} className="pt-1">
                      <div className="px-3 py-1 text-[11px] font-medium text-muted-foreground/80">
                        {bucket.label}
                      </div>
                      {bucket.sessions.map((s) => (
                        <div key={s.key} className="group relative flex items-center">
                          <button
                            onClick={() => { switchSession(s.key); navigate('/'); }}
                            className={cn(
                              'w-full text-left rounded-md px-3 py-1.5 text-sm truncate transition-colors pr-7',
                              'hover:bg-accent hover:text-accent-foreground',
                              isOnChat && currentSessionKey === s.key
                                ? 'bg-accent/60 text-accent-foreground font-medium'
                                : 'text-muted-foreground',
                            )}
                          >
                            {getSessionLabel(s.key, s.displayName, s.label)}
                          </button>
                          <button
                            aria-label="Delete session"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSessionToDelete({
                                key: s.key,
                                label: getSessionLabel(s.key, s.displayName, s.label),
                              });
                            }}
                            className={cn(
                              'absolute right-1 flex items-center justify-center rounded p-0.5 transition-opacity',
                              'opacity-0 group-hover:opacity-100',
                              'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
                            )}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <NavItem
                key={newNavItems[0].to}
                {...newNavItems[0]}
                collapsed={sidebarCollapsed}
              />

              {!sidebarCollapsed && agentsExpanded && <div className="mt-1 border-t border-muted/20" />}

              {/* Digital Employees SubMenu */}
              <div className={cn("flex flex-col transition-all duration-300", !sidebarCollapsed && agentsExpanded ? "gap-1 my-2" : "gap-0")}>
                <button
                  onClick={() => {
                    if (sidebarCollapsed) {
                      setSidebarCollapsed(false);
                      setAgentsExpanded(true);
                    } else {
                      setAgentsExpanded(!agentsExpanded);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    'hover:bg-accent hover:text-accent-foreground',
                    isEmployeePath
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground',
                    sidebarCollapsed && 'justify-center px-2'
                  )}
                >
                  <Users className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">数字员工</span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform duration-200 text-muted-foreground/50',
                          !agentsExpanded && '-rotate-90'
                        )}
                      />
                    </>
                  )}
                </button>

                {!sidebarCollapsed && agentsExpanded && (
                  <div className="flex flex-col gap-1 max-h-[40vh] overflow-y-auto pr-1 pl-4 mt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                    {agents.map((agent) => (
                      <NavItem
                        key={agent.id}
                        to={`/employee/${agent.id}`}
                        icon={
                          <div className="relative">
                            <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                              {agent.identity?.emoji || '🤖'}
                            </span>
                            <div
                              className={cn(
                                'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background',
                                agent.status === 'idle'
                                  ? 'bg-green-500'
                                  : agent.status === 'busy'
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                              )}
                            />
                          </div>
                        }
                        label={agent.identity?.name || agent.name || agent.id}
                        collapsed={sidebarCollapsed}
                      />
                    ))}
                  </div>
                )}
              </div>

              {!sidebarCollapsed && agentsExpanded && <div className="mb-1 border-t border-muted/20" />}

              {newNavItems.slice(1).map((item) => (
                <NavItem
                  key={item.to}
                  {...item}
                  collapsed={sidebarCollapsed}
                />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-2 space-y-1">
        {uiMode === 'new' && !sidebarCollapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                <Avatar className="h-8 w-8 rounded-lg overflow-hidden border border-muted-foreground/10 bg-muted">
                  <AvatarImage src="https://picsum.photos/seed/user123/200" alt="User" />
                  <AvatarFallback className="rounded-lg"><User className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start min-w-0">
                  <span className="truncate w-full font-semibold">User Admin</span>
                  <span className="truncate w-full text-[10px] text-muted-foreground">Premium Account</span>
                </div>
                <MoreHorizontal className="ml-auto h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" side="right">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>我的信息</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>退出登录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {devModeUnlocked && !sidebarCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={openDevConsole}
          >
            <Terminal className="h-4 w-4 mr-2" />
            {t('sidebar.devConsole')}
            <ExternalLink className="h-3 w-3 ml-auto" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="w-full"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ConfirmDialog
        open={!!sessionToDelete}
        title={t('common.confirm', 'Confirm')}
        message={sessionToDelete ? t('sidebar.deleteSessionConfirm', `Delete "${sessionToDelete.label}"?`) : ''}
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
        variant="destructive"
        onConfirm={async () => {
          if (!sessionToDelete) return;
          await deleteSession(sessionToDelete.key);
          if (currentSessionKey === sessionToDelete.key) navigate('/');
          setSessionToDelete(null);
        }}
        onCancel={() => setSessionToDelete(null)}
      />
    </aside>
  );
}
