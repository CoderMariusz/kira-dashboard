export function useApi() {
  const token = localStorage.getItem('kiraboard_token');

  const apiFetch = async (path: string, options?: RequestInit) => {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  };

  return { apiFetch };
}
