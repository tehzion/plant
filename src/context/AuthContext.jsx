import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { migrateLocalStorageToSupabase } from '../utils/migrations';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(undefined); // undefined = still loading, null = guest

    useEffect(() => {
        if (!supabase) {
            // No Supabase config — permanently in guest mode
            setUser(null);
            return;
        }

        // Initialize from existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                // Run one-time migration on first login
                if (currentUser) {
                    await migrateLocalStorageToSupabase(currentUser.id);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const signUp = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const signInWithGoogle = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
        return data;
    };

    return (
        <AuthContext.Provider value={{ user, signIn, signUp, signOut, signInWithGoogle }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (ctx === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
};

export default AuthContext;
