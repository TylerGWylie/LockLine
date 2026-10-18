const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const REFRESH_TOKEN_KEY = "refreshToken";

let accessToken: string | null = null;
let refreshToken: string | null = localStorage.getItem(REFRESH_TOKEN_KEY);

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function setTokens(tokens: { accessToken: string; refreshToken: string } | null): void {
  if (!tokens) {
    accessToken = null;
    refreshToken = null;
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function hasStoredSession(): boolean {
  return refreshToken !== null;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    setTokens(null);
    return false;
  }
  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  accessToken = data.accessToken;
  refreshToken = data.refreshToken;
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  return true;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const doFetch = () => {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(`${API_URL}${path}`, { ...options, headers });
  };

  let res = await doFetch();
  if (res.status === 401 && refreshToken) {
    if (await refreshAccessToken()) {
      res = await doFetch();
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const message = typeof body.error === "string" ? body.error : JSON.stringify(body.error);
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
