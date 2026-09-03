/** Shared Apollo backend HTTP client */

export const API_BASE =
  (typeof import.meta !== 'undefined' &&
    (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_BASE) ||
  ((typeof import.meta !== 'undefined' &&
    (import.meta as ImportMeta & { env?: Record<string, boolean> }).env?.DEV)
    ? 'http://127.0.0.1:8000'
    : '');

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });
    const body = await parseJson(res);
    if (!res.ok) {
      const detail =
        typeof body === 'object' && body && 'detail' in body
          ? String((body as { detail: unknown }).detail)
          : `HTTP ${res.status}`;
      throw new ApiError(detail, res.status, body);
    }
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiPost<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      body: JSON.stringify(body),
    });
    const data = await parseJson(res);
    if (!res.ok) {
      const detail =
        typeof data === 'object' && data && 'detail' in data
          ? String((data as { detail: unknown }).detail)
          : `HTTP ${res.status}`;
      throw new ApiError(detail, res.status, data);
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}
