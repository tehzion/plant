import { create } from 'zustand';
import { User, Role } from '../types';

interface UserState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: (organizationId?: string) => Promise<void>;
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'super_admin',
    organizationId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'employee',
    organizationId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'reviewer',
    organizationId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const useUserStore = create<UserState>((set) => ({
  users: [],
  isLoading: false,
  error: null,
  
  fetchUsers: async (organizationId?: string) => {
    set({ isLoading: true, error: null });
    try {
      // This would be an API call in a real implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const filteredUsers = organizationId 
        ? mockUsers.filter(user => user.organizationId === organizationId)
        : mockUsers;
        
      set({ users: filteredUsers, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  createUser: async (data) => {
    set({ isLoading: true, error: null });
    try {
      // This would be an API call in a real implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newUser: User = {
        ...data,
        id: String(Date.now()),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      set(state => ({ 
        users: [...state.users, newUser], 
        isLoading: false 
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  updateUser: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      // This would be an API call in a real implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      set(state => {
        const updatedUsers = state.users.map(user =>
          user.id === id ? { ...user, ...data, updatedAt: new Date().toISOString() } : user
        );
          
        return { 
          users: updatedUsers, 
          isLoading: false 
        };
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  deleteUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // This would be an API call in a real implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      set(state => {
        const filteredUsers = state.users.filter(user => user.id !== id);
          
        return { 
          users: filteredUsers, 
          isLoading: false 
        };
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  }
}));