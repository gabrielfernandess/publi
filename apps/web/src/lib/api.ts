// Helper de fetch que automaticamente inclui credenciais (cookie httpOnly).
// Importante: next.config.js faz rewrite /api/* → backend, entao tudo
// parece same-origin pro browser. credentials: 'include' garante que o
// cookie vai em todas as requests mesmo se a URL for absoluta.
export async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('/api/') ? path : `/api/${path.replace(/^\//, '')}`;

  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch { /* ignore */ }
    const err: any = new Error(body?.error || `${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  // 204?
  if (res.status === 204) return undefined as any;
  return res.json();
}

export const api = {
  get: <T = any>(p: string) => apiFetch<T>(p),
  post: <T = any>(p: string, body: any) => apiFetch<T>(p, { method: 'POST', body: JSON.stringify(body) }),
  put: <T = any>(p: string, body: any) => apiFetch<T>(p, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T = any>(p: string, body: any) => apiFetch<T>(p, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = any>(p: string) => apiFetch<T>(p, { method: 'DELETE' }),
};

// Upload multipart (FormData) - nao seta Content-Type pra deixar o browser definir o boundary
export async function apiUpload<T = any>(path: string, formData: FormData): Promise<T> {
  const url = path.startsWith('/api/') ? path : `/api/${path.replace(/^\//, '')}`;
  const res = await fetch(url, { method: 'POST', body: formData, credentials: 'include' });
  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch { /* ignore */ }
    const err: any = new Error(body?.error || `${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json();
}
