/**
 * Root Application Component
 * Handles routing and global providers
 */
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Component, useEffect } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Toaster } from 'sonner';
import i18n from './i18n';
import { MainLayout } from './components/layout/MainLayout';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Dashboard } from './pages/Dashboard';
import { Chat } from './pages/Chat';
import { Channels } from './pages/Channels';
import { Skills } from './pages/Skills';
import { Cron } from './pages/Cron';
import { Settings } from './pages/Settings';
import { Setup } from './pages/Setup';
import { useSettingsStore } from './stores/settings';
import { useGatewayStore } from './stores/gateway';
import { applyGatewayTransportPreference } from './lib/api-client';

// Shared Layout for New UI
import { NewMainLayout } from './components/layout/NewMainLayout';

// New Pages
import { HomeDashboard } from './pages/HomeDashboard';
import { EmployeeChat } from './pages/EmployeeChat';
import { Shop } from './pages/Shop';
import { Classroom } from './pages/Classroom';
import { ComputePoints } from './pages/ComputePoints';
import { SysSettings } from './pages/SysSettings';
import { Profile } from './pages/Profile';
import { LoginModal } from './components/auth/LoginModal';
import { useAuthStore } from './stores/auth';
import { authApi } from './lib/auth-api';
import { invokeIpc } from './lib/api-client';


/**
 * Error Boundary to catch and display React rendering errors
 */
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React Error Boundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          color: '#f87171',
          background: '#0f172a',
          minHeight: '100vh',
          fontFamily: 'monospace'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Something went wrong</h1>
          <pre style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            background: '#1e293b',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const initSettings = useSettingsStore((state) => state.init);
  const theme = useSettingsStore((state) => state.theme);
  const language = useSettingsStore((state) => state.language);
  const gatewayTransportPreference = useSettingsStore((state) => state.gatewayTransportPreference);
  const setupComplete = useSettingsStore((state) => state.setupComplete);
  const uiMode = useSettingsStore((state) => state.uiMode);
  const setUiMode = useSettingsStore((state) => state.setUiMode);
  const initGateway = useGatewayStore((state) => state.init);

  const token = useAuthStore((state) => state.token);
  const isLocalMode = useAuthStore((state) => state.isLocalMode);
  const setToken = useAuthStore((state) => state.setToken);
  const setLocalMode = useAuthStore((state) => state.setLocalMode);

  const isAuthenticated = !!token || isLocalMode;

  // Sync cloud model config after login
  useEffect(() => {
    if (!token) return;

    const syncCloudModels = async () => {
      try {
        const { newapi_base_url, newapi_token } = await authApi.getNewApiToken();
        if (!newapi_base_url || !newapi_token) return;

        // Ensure URL ends with /v1/message
        let baseUrl = newapi_base_url.endsWith('/v1')
          ? newapi_base_url
          : `${newapi_base_url}/v1`;
        baseUrl = baseUrl.endsWith('/message')
          ? baseUrl
          : `${baseUrl}/message`;

        await invokeIpc('provider:save', {
          id: 'cloud-api',
          name: '云端模型服务',
          type: 'custom',
          baseUrl,
          model: 'kimi-k2.5',
          enabled: true,
        }, newapi_token);

        console.log('[ClawX] Cloud model config synced');
      } catch (err) {
        console.warn('[ClawX] Failed to sync cloud model config:', err);
      }
    };

    syncCloudModels();
  }, [token]);

  useEffect(() => {
    initSettings();
  }, [initSettings]);

  // Sync i18n language with persisted settings on mount
  useEffect(() => {
    if (language && language !== i18n.language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  // Initialize Gateway connection on mount
  useEffect(() => {
    initGateway();
  }, [initGateway]);

  // Note: Setup wizard disabled - directly show login for new users
  // useEffect(() => {
  //   if (!setupComplete && !location.pathname.startsWith('/setup')) {
  //     navigate('/setup');
  //   }
  // }, [setupComplete, location.pathname, navigate]);

  // Listen for navigation events from main process
  useEffect(() => {
    const handleNavigate = (...args: unknown[]) => {
      const path = args[0];
      if (typeof path === 'string') {
        navigate(path);
      }
    };

    const unsubscribe = window.electron.ipcRenderer.on('navigate', handleNavigate);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [navigate]);

  // UI Mode Toggle (Ctrl+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setUiMode(uiMode === 'new' ? 'classic' : 'new');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uiMode, setUiMode]);

  // Handle path remapping when UI mode switches
  useEffect(() => {
    const currentPath = location.pathname;

    if (uiMode === 'classic') {
      // If switching to Classic while on a New-only route
      const isNewOnlyRoute =
        ['/shop', '/classroom', '/points', '/sys-settings', '/profile'].some(p => currentPath.startsWith(p)) ||
        currentPath.startsWith('/employee/');

      if (isNewOnlyRoute) {
        if (currentPath === '/sys-settings') {
          navigate('/settings');
        } else {
          navigate('/');
        }
      }
    } else {
      // If switching to New while on a Classic-only route
      const isClassicOnlyRoute = ['/dashboard', '/channels', '/skills', '/cron', '/settings'].some(p =>
        currentPath.startsWith(p)
      );

      if (isClassicOnlyRoute) {
        if (currentPath.startsWith('/settings')) {
          navigate('/sys-settings');
        } else {
          navigate('/');
        }
      }
    }
  }, [uiMode, navigate, location.pathname]);

  // Apply theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    applyGatewayTransportPreference(gatewayTransportPreference);
  }, [gatewayTransportPreference]);

  if (!isAuthenticated && uiMode === 'new') {
    return (
      <LoginModal
        onSuccess={(token) => setToken(token)}
      />
    );
  }

  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={300}>
        <Routes>
          {/* Setup wizard (shown on first launch) */}
          <Route path="/setup/*" element={<Setup />} />

          {/* Main application routes */}
          {uiMode === 'new' ? (
            <Route element={<NewMainLayout />}>
              <Route path="/" element={<HomeDashboard />} />
              <Route path="/employee/:id" element={<EmployeeChat />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/classroom" element={<Classroom />} />
              <Route path="/points" element={<ComputePoints />} />
              <Route path="/sys-settings" element={<SysSettings />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          ) : (
            <Route element={<MainLayout />}>
              <Route path="/" element={<Chat />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/channels" element={<Channels />} />
              <Route path="/skills" element={<Skills />} />
              <Route path="/cron" element={<Cron />} />
              <Route path="/settings/*" element={<Settings />} />
            </Route>
          )}
        </Routes>



        {/* Global toast notifications */}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          style={{ zIndex: 99999 }}
        />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
