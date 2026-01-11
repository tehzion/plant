import { create } from 'zustand';
import { User, LoginCredentials, RegisterData } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  setNewPassword: (token: string, password: string) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
}

// This is a mock implementation that would be replaced with actual API calls
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  
  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    try {
      // This would be an API call in a real implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful login for demo
      if (credentials.email === 'admin@example.com' && credentials.password === 'password123') {
        const user: User = {
          id: '1',
          email: credentials.email,
          firstName: 'Super',
          lastName: 'Admin',
          role: 'super_admin',
          organizationId: '1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        set({ user, isLoading: false });
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  register: async (data: RegisterData) => {
    set({ isLoading: true, error: null });
    try {
      // This would be an API call in a real implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful registration
      const user: User = {
        id: '1',
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'super_admin',
        organizationId: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      set({ user, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  logout: () => {
    set({ user: null });
  },
  
  resetPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      // This would be an API call in a real implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  setNewPassword: async (token: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      // This would be an API call in a real implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  updateUser: async (id: string, data: Partial<User>) => {
    set({ isLoading: true, error: null });
    try {
      // This would be an API call in a real implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      set(state => ({
        user: state.user ? { ...state.user, ...data, updatedAt: new Date().toISOString() } : null,
        isLoading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  }
}));