import { useState, useEffect } from 'react';

export interface User {
  name: string;
  role: string;
  avatar: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('kiraboard_token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('kiraboard_token');
        setLoading(false);
      });
  }, []);

  return { user, loading, isAdmin: user?.role === 'admin' };
}
