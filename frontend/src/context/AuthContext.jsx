import { createContext, useContext, useState, useEffect } from 'react';
import { getUser, getTokens, logout as apiLogout } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tokens = getTokens();
    if (!tokens) {
      setLoading(false);
      return;
    }
    getUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  function loginUser(userData) {
    setUser(userData);
  }

  function logoutUser() {
    apiLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
