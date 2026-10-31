/**
 * BizBox Web Admin - Centralized Enterprise API Client
 * Senior-level HTTP client with strong typing, timeout handling, and complete CRM & Back-office endpoints.
 */

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tier?: 'GOLD' | 'SILVER' | 'BRONZE' | string;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  createdAt?: string;
}

export interface CreateCustomerDto {
  name?: string;
  phone: string;
  email?: string;
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  email?: string;
}

export interface CustomerStats {
  activeMembers: number;
  totalPoints: number;
  avgSpend: number;
}

export interface Outlet {
  id: string;
  code: string;
  name: string;
  city: string;
  status: 'Online' | 'Offline';
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone?: string;
  pin?: string;
  outlets?: string;
  status?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

import { getApiBaseUrl } from './config';

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Enterprise HTTP Client with timeout, header injection, and typed JSON responses
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 6000, params, headers, ...fetchOptions } = options;
  const baseUrl = getApiBaseUrl();

  let url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const hasBody = fetchOptions.body !== undefined && fetchOptions.body !== null;
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(headers as Record<string, string>),
  };

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const responseBody = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const errorMessage =
        (typeof responseBody === 'object' && responseBody !== null && (responseBody.message || responseBody.error)) ||
        `Request failed with status ${res.status}`;
      const errorCode =
        typeof responseBody === 'object' && responseBody !== null ? responseBody.code : undefined;

      throw new ApiError(errorMessage, res.status, errorCode, responseBody);
    }

    return responseBody as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError(`Request timeout after ${timeoutMs}ms to ${endpoint}`, 408, 'REQUEST_TIMEOUT');
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err?.message || 'Network connection failed', 0, 'NETWORK_ERROR', err);
  }
}

export const httpClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'GET', ...options }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),
};

/**
 * Customers CRM Domain API
 */
export const customersApi = {
  async list(searchQuery?: string): Promise<Customer[]> {
    try {
      const res = await httpClient.get<{ data: Customer[] }>('/customers', {
        params: { q: searchQuery },
        timeoutMs: 4000,
      });
      return Array.isArray(res?.data) ? res.data : [];
    } catch (err) {
      console.warn('[customersApi.list] Error fetching customers:', err);
      return [];
    }
  },

  async getStats(): Promise<CustomerStats> {
    try {
      const res = await httpClient.get<{ data: CustomerStats }>('/customers/stats', { timeoutMs: 3000 });
      return res.data || { activeMembers: 0, totalPoints: 0, avgSpend: 0 };
    } catch (err) {
      console.warn('[customersApi.getStats] Error fetching stats:', err);
      return { activeMembers: 0, totalPoints: 0, avgSpend: 0 };
    }
  },

  async create(payload: CreateCustomerDto): Promise<Customer> {
    const cleanPhone = payload.phone.replace(/\D/g, '');
    const cleanPayload = {
      name: payload.name?.trim() || 'Guest Customer',
      phone: cleanPhone || payload.phone.trim(),
      email: payload.email?.trim() || undefined,
    };

    const res = await httpClient.post<{ data: Customer }>('/customers', cleanPayload, { timeoutMs: 5000 });
    return res.data;
  },

  async update(id: string, payload: UpdateCustomerDto): Promise<Customer> {
    const res = await httpClient.put<{ data: Customer }>(`/customers/${id}`, payload, { timeoutMs: 5000 });
    return res.data;
  },

  async delete(id: string): Promise<boolean> {
    const res = await httpClient.delete<{ success: boolean }>(`/customers/${id}`, { timeoutMs: 5000 });
    return Boolean(res?.success);
  },
};

/**
 * Outlets Domain API
 */
export const outletsApi = {
  async list(): Promise<Outlet[]> {
    try {
      const res = await httpClient.get<{ data: any[] }>('/outlets', { timeoutMs: 3000 });
      if (res && Array.isArray(res.data)) {
        return res.data.map((o) => ({
          id: o.id,
          code: o.code || 'BLR01',
          name: o.name,
          city: typeof o.address === 'object' && o.address?.city ? o.address.city : 'Bengaluru',
          status: 'Online',
        }));
      }
      return [];
    } catch (err) {
      console.warn('[outletsApi.list] Error fetching outlets:', err);
      return [];
    }
  },
};

/**
 * Staff & Role Access API
 */
export const staffApi = {
  async list(): Promise<StaffMember[]> {
    try {
      const res = await httpClient.get<{ data: StaffMember[] }>('/auth/staff', { timeoutMs: 3000 });
      return res.data || [];
    } catch (err) {
      console.warn('[staffApi.list] Error fetching staff:', err);
      return [];
    }
  },
};

