export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

async function request(path, { method = 'GET', body } = {}) {
  const isForm = body instanceof FormData;
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: { ...authHeader(), ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

// Downloads a file through the API so the integrity check runs on the server
export async function downloadFile(id, name) {
  const res = await fetch(`${API_URL}/api/files/${id}/download`, { headers: authHeader() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Download failed');
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
