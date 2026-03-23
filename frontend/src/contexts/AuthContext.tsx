import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

type User = { id: string; email: string; name: string; subscription: string };

type AuthContextType = {
  user: User | null;
  token: string | null;
  isGuest: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      if (storedToken) {
        api.setToken(storedToken);
        const userData = await api.getMe();
        setToken(storedToken);
        setUser(userData);
        setIsGuest(false);
      }
    } catch {
      await AsyncStorage.removeItem('auth_token');
      api.setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    await AsyncStorage.setItem('auth_token', res.token);
    api.setToken(res.token);
    setToken(res.token);
    setUser(res.user);
    setIsGuest(false);
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await api.register(email, password, name);
    await AsyncStorage.setItem('auth_token', res.token);
    api.setToken(res.token);
    setToken(res.token);
    setUser(res.user);
    setIsGuest(false);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('auth_token');
    api.setToken(null);
    setToken(null);
    setUser(null);
    setIsGuest(true);
  };

  const refreshUser = useCallback(async () => {
    if (!isGuest) {
      try {
        const userData = await api.getMe();
        setUser(userData);
      } catch {}
    }
  }, [isGuest]);

  return (
    <AuthContext.Provider value={{ user, token, isGuest, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
