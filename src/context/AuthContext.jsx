import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { getGuestId } from '../utils/localStorage';

// NOTE: migrateLocalStorageToSupabase is intentionally NOT imported while
// Supabase is disabled — importing it would trigger Supabase calls at module
// load time, which would throw errors when supabase === null.

const AuthContext = createContext(null);

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

        // ── Supabase disabled → run entirely in guest/localStorage mode ───────
        if (!supabase) {
            setUser(null);
            return;
        }

        // ── Supabase enabled path (currently unreachable) ─────────────────────
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                // One-time migration when a real user logs in
                if (currentUser) {
                    try {
                        const { migrateLocalStorageToSupabase } = await import('../utils/migrations');
                        await migrateLocalStorageToSupabase(currentUser.id);
                    } catch (e) {
                        console.warn('Migration skipped:', e.message);
                    }
                }
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
            throw new Error('Cloud login is currently disabled. Use the demo account (test@test.com / Test321@) or enable Supabase in src/lib/supabase.js.');
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const signUp = async (email, password) => {
        if (!supabase) {
            throw new Error('Cloud sign-up is currently disabled. Enable Supabase in src/lib/supabase.js to use this feature.');
        }
        const { data, error } = await supabase.auth.signUp({ email, password });
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
        if (!supabase) {
            throw new Error('Google sign-in is currently disabled. Enable Supabase in src/lib/supabase.js to use this feature.');
        }
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
        });
        if (error) throw error;
        return data;
    };

    return (
        <AuthContext.Provider value={{ user, guestId, signIn, signUp, signOut, signInWithGoogle }}>
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
