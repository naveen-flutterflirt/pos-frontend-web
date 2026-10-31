/**
 * BizBox POS - Centralized Enterprise API Client
 * Senior-level HTTP client with strong typing, timeout resilience, and Dexie offline fallback.
 */

import { db } from '@bizbox/offline';
import { CustomerSummary } from '@bizbox/pos-core';
import { getApiBaseUrl } from './config';

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
 * Customers Domain API with Dexie Offline Cache Sync
 */
export const customersApi = {
  /**
   * List customers with optional search term.
   * If online, returns PostgreSQL backend data and caches to Dexie db.customers.
   * If offline or request fails, falls back seamlessly to local Dexie indexedDB cache.
   */
  async list(searchQuery?: string): Promise<Customer[]> {
    try {
      const res = await httpClient.get<{ data: Customer[] }>('/customers', {
        params: { q: searchQuery },
        timeoutMs: 4000,
      });

      const list = Array.isArray(res?.data) ? res.data : [];

      // Update offline cache in background
      if (typeof window !== 'undefined' && db && db.customers) {
        const dexieItems: CustomerSummary[] = list.map((c) => ({
          id: c.id,
          phone: c.phone,
          name: c.name,
          email: c.email,
          loyaltyPoints: c.loyaltyPoints || 0,
          visitCount: c.visitCount || 0,
          totalSpent: c.totalSpent || 0,
        }));
        db.customers.bulkPut(dexieItems).catch((e) => console.warn('[Dexie Cache BulkPut Error]', e));
      }

      return list;
    } catch (err) {
      console.warn('[customersApi.list] Network unavailable, querying Dexie offline cache:', err);

      // Offline Fallback from Dexie DB
      if (typeof window !== 'undefined' && db && db.customers) {
        try {
          const cached = await db.customers.toArray();
          const query = (searchQuery || '').toLowerCase().trim();

          const filtered = query
            ? cached.filter(
                (c) =>
                  (c.name && c.name.toLowerCase().includes(query)) ||
                  (c.phone && c.phone.includes(query))
              )
            : cached;

          return filtered.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            tier: c.totalSpent >= 15000 ? 'GOLD' : c.totalSpent >= 5000 ? 'SILVER' : 'BRONZE',
            loyaltyPoints: c.loyaltyPoints,
            visitCount: c.visitCount,
            totalSpent: c.totalSpent,
          }));
        } catch (dexieErr) {
          console.warn('[Dexie Read Error]', dexieErr);
        }
      }

      return [];
    }
  },

  /**
   * Create or register a new customer.
   * Syncs with backend and saves to offline store.
   */
  async create(payload: CreateCustomerDto): Promise<Customer> {
    const cleanPhone = payload.phone.replace(/\D/g, '');
    const cleanPayload = {
      name: payload.name?.trim() || 'Guest Customer',
      phone: cleanPhone || payload.phone.trim(),
      email: payload.email?.trim() || undefined,
    };

    try {
      const res = await httpClient.post<{ data: Customer }>('/customers', cleanPayload, {
        timeoutMs: 4000,
      });

      const created = res.data;

      // Update Dexie
      if (typeof window !== 'undefined' && db && db.customers) {
        db.customers
          .put({
            id: created.id,
            name: created.name,
            phone: created.phone,
            email: created.email,
            loyaltyPoints: created.loyaltyPoints || 0,
            visitCount: created.visitCount || 1,
            totalSpent: created.totalSpent || 0,
          })
          .catch((e) => console.warn('[Dexie Put Error]', e));
      }

      return created;
    } catch (err) {
      console.warn('[customersApi.create] Network failed, creating offline customer record:', err);

      // Offline customer generation
      const offlineId = `cust_offline_${Date.now()}`;
      const offlineCustomer: Customer = {
        id: offlineId,
        name: cleanPayload.name,
        phone: cleanPayload.phone,
        email: cleanPayload.email,
        tier: 'BRONZE',
        loyaltyPoints: 0,
        visitCount: 1,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined' && db && db.customers) {
        await db.customers.put({
          id: offlineCustomer.id,
          name: offlineCustomer.name,
          phone: offlineCustomer.phone,
          email: offlineCustomer.email,
          loyaltyPoints: 0,
          visitCount: 1,
          totalSpent: 0,
        });

        // Queue outbox sync event
        if (db.outbox) {
          await db.outbox.add({
            eventId: `evt_${Date.now()}`,
            entity: 'order',
            op: 'create',
            payload: { type: 'customer_created', customer: offlineCustomer },
            occurredAt: new Date().toISOString(),
          });
        }
      }

      return offlineCustomer;
    }
  },

  /**
   * Get CRM KPI stats
   */
  async getStats(): Promise<CustomerStats> {
    try {
      const res = await httpClient.get<{ data: CustomerStats }>('/customers/stats', { timeoutMs: 3000 });
      return res.data || { activeMembers: 0, totalPoints: 0, avgSpend: 0 };
    } catch (err) {
      console.warn('[customersApi.getStats] Fetch failed:', err);
      return { activeMembers: 0, totalPoints: 0, avgSpend: 0 };
    }
  },
};

/**
 * Outlets API
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
      console.warn('[outletsApi.list] Fetch failed:', err);
      return [];
    }
  },

  async getTables(outletId: string): Promise<any[]> {
    try {
      const res = await httpClient.get<{ data: any[] }>(`/outlets/${outletId}/tables`, { timeoutMs: 3000 });
      return res.data || [];
    } catch (err) {
      console.warn('[outletsApi.getTables] Fetch failed:', err);
      return [];
    }
  },
};

/**
 * Staff & Auth API
 */
export const staffApi = {
  async list(): Promise<StaffMember[]> {
    try {
      const res = await httpClient.get<{ data: StaffMember[] }>('/auth/staff', { timeoutMs: 3000 });
      return res.data || [];
    } catch (err) {
      console.warn('[staffApi.list] Fetch failed:', err);
      return [];
    }
  },
};

