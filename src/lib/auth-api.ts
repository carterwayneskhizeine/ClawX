const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ai-api.fantasy-lab.com';

// ── Types ────────────────────────────────────────────────────────

export interface UserInfo {
    user_id: string;
    username: string;
    org_id: string;
    org_name?: string;
}

export interface AuthResponse extends UserInfo {
    token: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    password: string;
    org_name?: string;
}

export interface NewApiTokenResponse {
    newapi_base_url: string;
    newapi_token: string;
}

export interface ComputeBalanceResponse {
    user_id: string;
    compute_balance: number;
    token_equivalent: number;
    valid_until: string | null;
    today_consumption: number;
    month_total_consumption: number;
    month_avg_consumption: number;
}

export interface ComputeLedgerItem {
    id: string;
    delta_compute: number;
    delta_tokens: number;
    snapshot_rate_p: number;
    type: string;
    ref_id: string | null;
    remark: string | null;
    created_at: number;
    balance_after: number;
    task_name: string;
}

export interface ComputeLedgerResponse {
    items: ComputeLedgerItem[];
    total: number;
}

export interface RechargePackage {
    package_id: string;
    name: string;
    original_price_cents: number;
    current_price_cents: number;
    compute_amount: number;
}

export interface RechargePackagesResponse {
    items: RechargePackage[];
}

// ── Request Helper ───────────────────────────────────────────────

async function request<T>(
    path: string,
    options: RequestInit = {},
    isBinary = false
): Promise<T> {
    const url = `${API_BASE_URL}${path}`;

    // Lazy import to avoid circular dependency — auth store uses this module's types
    const { useAuthStore } = await import('@/stores/auth');
    const token = useAuthStore.getState().token;

    const headers: HeadersInit = { ...options.headers };
    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    if (options.body && !(options.body instanceof FormData)) {
        (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        let errorMessage = '请求失败';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
            errorMessage = `HTTP error! status: ${response.status}`;
        }

        if (response.status === 401) {
            useAuthStore.getState().logout();
        }

        throw new Error(errorMessage);
    }

    if (isBinary) return (await response.blob()) as unknown as T;
    return response.json();
}

// ── API ──────────────────────────────────────────────────────────

export const authApi = {
    login: (data: LoginRequest) =>
        request<AuthResponse>('/api/login', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    register: (data: RegisterRequest) =>
        request<AuthResponse>('/api/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getMe: () => request<UserInfo>('/api/me'),

    getNewApiToken: () => request<NewApiTokenResponse>('/api/me/newapi-token'),

    getComputeBalance: () =>
        request<ComputeBalanceResponse>('/api/me/compute-balance'),

    getComputeLedger: (params: { limit?: number; offset?: number } = {}) => {
        const query = new URLSearchParams();
        if (params.limit !== undefined) query.append('limit', params.limit.toString());
        if (params.offset !== undefined) query.append('offset', params.offset.toString());
        const qs = query.toString();
        return request<ComputeLedgerResponse>(
            `/api/me/compute-ledger${qs ? `?${qs}` : ''}`
        );
    },

    getRechargePackages: () =>
        request<RechargePackagesResponse>('/api/recharge/packages'),
};
