import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import { Organization } from '../types';

interface OrganizationState {
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  error: string | null;
  fetchOrganizations: () => Promise<void>;
  createOrganization: (name: string) => Promise<void>;
  updateOrganization: (id: string, name: string) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
  setCurrentOrganization: (id: string) => void;
}

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  organizations: [],
  currentOrganization: null,
  isLoading: false,
  error: null,
  
  fetchOrganizations: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: organizations, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;
      
      set({ 
        organizations: organizations || [], 
        isLoading: false,
        currentOrganization: get().currentOrganization || (organizations?.length ? organizations[0] : null)
      });
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },
  
  createOrganization: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: newOrg, error } = await supabase
        .from('organizations')
        .insert([{ name }])
        .select()
        .single();

      if (error) throw error;
      
      set(state => ({ 
        organizations: [...state.organizations, newOrg],
        currentOrganization: state.currentOrganization || newOrg,
        isLoading: false 
      }));
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },
  
  updateOrganization: async (id: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: updatedOrg, error } = await supabase
        .from('organizations')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      set(state => {
        const updatedOrgs = state.organizations.map(org =>
          org.id === id ? updatedOrg : org
        );
        
        return { 
          organizations: updatedOrgs,
          currentOrganization: state.currentOrganization?.id === id ? updatedOrg : state.currentOrganization,
          isLoading: false 
        };
      });
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },
  
  deleteOrganization: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      set(state => {
        const filteredOrgs = state.organizations.filter(org => org.id !== id);
        
        return { 
          organizations: filteredOrgs,
          currentOrganization: state.currentOrganization?.id === id 
            ? (filteredOrgs.length > 0 ? filteredOrgs[0] : null)
            : state.currentOrganization,
          isLoading: false 
        };
      });
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },
  
  setCurrentOrganization: (id: string) => {
    const { organizations } = get();
    const org = organizations.find(o => o.id === id) || null;
    set({ currentOrganization: org });
  }
}));