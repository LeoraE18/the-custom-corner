const apiBase = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:3001" : "");

export function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${apiBase}${path}`, {
    ...init,
    credentials: "include",
  });
}
