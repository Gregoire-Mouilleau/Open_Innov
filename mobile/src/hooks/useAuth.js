import { useState, useEffect, useCallback } from 'react';
import { tokenStorage } from '../services/api';
import { decodeJWT } from '../utils/jwt';

export default function useAuth(navigation) {
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    const token = await tokenStorage.get();
    if (!token) { setUser(null); return; }
    const payload = decodeJWT(token);
    if (!payload) { setUser(null); return; }
    // Vérifie l'expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      await tokenStorage.clear();
      setUser(null);
      return;
    }
    setUser({ email: payload.email, isAdmin: payload.isAdmin });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = useCallback(async () => {
    await tokenStorage.clear();
    setUser(null);
    navigation?.replace('Auth');
  }, [navigation]);

  return { user, logout };
}
