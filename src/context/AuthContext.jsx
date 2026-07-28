import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { getGuestId } from '../utils/localStorage';

const AuthContext = createContext(null);

const getAuthEmailRedirectUrl = () => {
    const configured = import.meta.env.VITE_AUTH_EMAIL_REDIRECT_URL;
    if (configured) return configured;
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/login`;
    }
    return undefined;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(undefined); // undefined = loading, null = guest
    const [guestId, setGuestId] = useState(null);

    useEffect(() => {
        // Initialize persistent guest identity
        setGuestId(getGuestId());
        // ── Demo / test account bypass ────────────────────────────────────────
        if (localStorage.getItem('plant_demo_session') === 'true') {
            setUser({ id: 'demo-user-123', email: 'test@test.com' });
            return;
        }

        // ── Supabase not configured → run in guest/localStorage mode ──────────
        if (!supabase) {
            setUser(null);
            return;
        }

        const migrateForUser = async (currentUser) => {
            if (!currentUser) return;
            try {
                const { migrateLocalStorageToSupabase } = await import('../utils/migrations');
                await migrateLocalStorageToSupabase(currentUser.id);
            } catch (e) {
                console.warn('Migration skipped:', e.message);
            }
        };

        // ── Supabase email/password auth path ─────────────────────────────────
        supabase.auth.getSession().then(({ data: { session } }) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            migrateForUser(currentUser);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                await migrateForUser(currentUser);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // ── Auth actions ──────────────────────────────────────────────────────────

    const signIn = async (email, password) => {
        const cleanEmail = email?.trim();
        const cleanPassword = password?.trim();

        // Demo bypass — works even when Supabase is disabled
        if (cleanEmail === 'test@test.com') {
            const isCorrectPassword = cleanPassword === 'Test321@' || cleanPassword === 'test';
            if (isCorrectPassword) {
                const demoUser = { id: 'demo-user-123', email: 'test@test.com' };
                localStorage.setItem('plant_demo_session', 'true');
                setUser(demoUser);
                return { user: demoUser };
            } else {
                throw new Error('Invalid password for demo account. Please use Test321@ or test');
            }
        }

        if (!supabase) {
            throw new Error('Cloud login is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env, or use the demo account (test@test.com / Test321@).');
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const signUp = async (email, password) => {
        if (!supabase) {
            throw new Error('Cloud sign-up is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env to use this feature.');
        }
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: getAuthEmailRedirectUrl(),
            },
        });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        // Clear demo session
        if (localStorage.getItem('plant_demo_session')) {
            localStorage.removeItem('plant_demo_session');
            setUser(null);
            return;
        }

        // Guard against null supabase before calling .auth
        if (!supabase) {
            setUser(null);
            return;
        }

        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
    };

    const signInWithGoogle = async () => {
        throw new Error('Google sign-in is disabled. This app is configured for email/password auth only.');
    };

    return (
        <AuthContext.Provider value={{ user, guestId, signIn, signUp, signOut, signInWithGoogle, isGoogleAuthEnabled: false }}>
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
