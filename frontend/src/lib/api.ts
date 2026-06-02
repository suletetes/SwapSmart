import { useAuthStore } from '@/stores/auth.store';
import { useOfflineStore } from '@/stores/offline.store';

/**
 * Centralized API client for SwapSmart.
 *
 * - Prepends the API Gateway base URL from NEXT_PUBLIC_API_URL
 * - Attaches Authorization header from auth store
 * - Handles 401 → redirect to login
 * - Handles network errors → trigger offline state
 * - Exports typed fetch wrappers for all endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: unknown
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip attaching the Authorization header */
  skipAuth?: boolean;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, skipAuth, headers: customHeaders, ...fetchOptions } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  // Attach Authorization header from auth store
  if (!skipAuth) {
    const tokens = useAuthStore.getState().tokens;
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle 401 — token expired or invalid
    if (response.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiError(401, 'Unauthorized');
    }

    // Handle other error responses
    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = undefined;
      }
      throw new ApiError(response.status, response.statusText, errorBody);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    // Handle network errors → trigger offline state
    if (error instanceof TypeError && error.message.includes('fetch')) {
      useOfflineStore.getState().setOffline(true);
      throw new ApiError(0, 'Network error — you appear to be offline');
    }
    throw error;
  }
}

// ─── Typed Fetch Wrappers ────────────────────────────────────────────────────

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

// ─── Auth Endpoints ──────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { name: string; phone: string; role: string; vehicleReg?: string; kekeType?: string }) =>
    api.post('/v1/auth/register', data, { skipAuth: true }),

  requestOtp: (phone: string) =>
    api.post('/v1/auth/otp/request', { phone }, { skipAuth: true }),

  verifyOtp: (phone: string, code: string) =>
    api.post<{ accessToken: string; refreshToken: string; idToken: string; expiresIn: number; user: unknown }>(
      '/v1/auth/otp/verify',
      { phone, code },
      { skipAuth: true }
    ),

  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string; expiresIn: number }>(
      '/v1/auth/refresh',
      { refreshToken },
      { skipAuth: true }
    ),

  logout: () => api.post('/v1/auth/logout'),
};

// ─── Station / Availability Endpoints ────────────────────────────────────────

export const stationsApi = {
  getNearby: (lat: number, lng: number, radius: number) =>
    api.get<unknown[]>(`/v1/stations?lat=${lat}&lng=${lng}&radius=${radius}`),

  getById: (stationId: string) =>
    api.get<unknown>(`/v1/stations/${stationId}`),
};

// ─── Reservation Endpoints ───────────────────────────────────────────────────

export const reservationsApi = {
  create: (stationId: string, batteryType?: string) =>
    api.post('/v1/reservations', { stationId, batteryType }),

  getActive: () =>
    api.get<unknown>('/v1/reservations/active'),

  arrive: (reservationId: string, lat: number, lng: number) =>
    api.patch(`/v1/reservations/${reservationId}/arrive`, { lat, lng }),

  cancel: (reservationId: string) =>
    api.patch(`/v1/reservations/${reservationId}/cancel`),
};

// ─── Swap Endpoints ──────────────────────────────────────────────────────────

export const swapsApi = {
  startSwap: (reservationId: string) =>
    api.patch(`/operator/reservations/${reservationId}/start-swap`),

  completeSwap: (reservationId: string) =>
    api.patch(`/operator/reservations/${reservationId}/complete-swap`),

  rate: (swapId: string, rating: number) =>
    api.post(`/v1/swaps/${swapId}/rate`, { rating }),

  getHistory: (page?: number, limit?: number) =>
    api.get<unknown>(`/v1/swaps/history?page=${page || 1}&limit=${limit || 20}`),
};

// ─── Wallet Endpoints ────────────────────────────────────────────────────────

export const walletApi = {
  get: () => api.get<unknown>('/v1/wallet'),

  topUp: (amount: number, paymentMethod: string) =>
    api.post('/v1/wallet/topup', { amount, paymentMethod }),

  topUpCallback: (reference: string) =>
    api.post('/v1/wallet/topup/callback', { reference }),
};

// ─── Notification Endpoints ──────────────────────────────────────────────────

export const notificationsApi = {
  getAll: () => api.get<unknown[]>('/v1/notifications'),

  markRead: (notificationIds: string[]) =>
    api.patch('/v1/notifications/read', { notificationIds }),
};

// ─── Favorites Endpoints ─────────────────────────────────────────────────────

export const favoritesApi = {
  getAll: () => api.get<unknown[]>('/v1/favorites'),

  add: (stationId: string) =>
    api.post('/v1/favorites', { stationId }),

  remove: (stationId: string) =>
    api.delete(`/v1/favorites/${stationId}`),
};

// ─── Prediction / AI Endpoints ───────────────────────────────────────────────

export const predictionsApi = {
  getSwapTime: () =>
    api.get<unknown>('/v1/predictions/swap-time'),

  chat: (message: string) =>
    api.post<{ response: string }>('/v1/ai/chat', { message }),
};

// ─── Operator Endpoints ──────────────────────────────────────────────────────

export const operatorApi = {
  getDashboard: () => api.get<unknown>('/v1/operator/dashboard'),
  getInventory: () => api.get<unknown>('/v1/operator/inventory'),
  updateBatteryState: (batteryId: string, state: string) =>
    api.patch(`/v1/operator/batteries/${batteryId}/state`, { state }),
  getReservations: () => api.get<unknown>('/v1/operator/reservations'),
  extendReservation: (reservationId: string) =>
    api.patch(`/v1/operator/reservations/${reservationId}/extend`),
  getForecast: () => api.get<unknown>('/v1/operator/forecast'),
  getAnalytics: (startDate: string, endDate: string) =>
    api.get<unknown>(`/v1/operator/analytics?startDate=${startDate}&endDate=${endDate}`),
  getSettings: () => api.get<unknown>('/v1/operator/settings'),
  updateSettings: (settings: unknown) =>
    api.put('/v1/operator/settings', settings),
  getAlerts: () => api.get<unknown>('/v1/operator/alerts'),
  resolveAlert: (alertId: string) =>
    api.patch(`/v1/operator/alerts/${alertId}/resolve`),
};

// ─── Fleet Manager Endpoints ─────────────────────────────────────────────────

export const fleetApi = {
  getOverview: () => api.get<unknown>('/v1/fleet/overview'),
  getVehicles: () => api.get<unknown[]>('/v1/fleet/vehicles'),
  getDrivers: () => api.get<unknown[]>('/v1/fleet/drivers'),
  assignDriver: (vehicleId: string, driverId: string) =>
    api.patch(`/v1/fleet/vehicles/${vehicleId}/assign`, { driverId }),
  getCostAnalysis: (period: string) =>
    api.get<unknown>(`/v1/fleet/cost-analysis?period=${period}`),
  getMaintenance: () => api.get<unknown>('/v1/fleet/maintenance'),
  exportReport: (type: string, period: string) =>
    api.get<Blob>(`/v1/fleet/reports/export?type=${type}&period=${period}`),
  getTelemetry: (vehicleId: string) =>
    api.get<unknown>(`/v1/fleet/telemetry/${vehicleId}`),
};
