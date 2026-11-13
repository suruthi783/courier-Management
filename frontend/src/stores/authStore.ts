import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '@/types';
import api from '@/services/api';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password, _role) => {
        const res = await api.post('/auth/login', { email, password });
        const { user, token } = res.data.data;
        set({ user, token, isAuthenticated: true });
        localStorage.setItem('auth-token', token);
      },

      register: async (name, email, phone, password) => {
        const res = await api.post('/auth/register', { name, email, phone, password });
        const { user, token } = res.data.data;
        set({ user, token, isAuthenticated: true });
        localStorage.setItem('auth-token', token);
      },

      logout: () => {
        api.post('/auth/logout').catch(() => {});
        localStorage.removeItem('auth-token');
        localStorage.removeItem('auth-storage');
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),
    }),
    { name: 'auth-storage' }
  )
);

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password, _role) => {
        const res = await api.post('/auth/login', { email, password });
        const { user, token } = res.data.data;
        set({ user, token, isAuthenticated: true });
        localStorage.setItem('auth-token', token);
      },

      logout: () => {
        // fire-and-forget logout call
        api.post('/auth/logout').catch(() => {});
        localStorage.removeItem('auth-token');
        localStorage.removeItem('auth-storage');
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),
    }),
    { name: 'auth-storage' }
  )
);
