import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { getGuestId, setLocalStorageNamespace } from '../utils/localStorage';
import { migrateLegacyCollection } from '../utils/indexedDbStorage.js';

const AuthContext = createContext(null);

const DEMO_USER_ID = 'demo-user-123';
const DEMO_EMAIL = 'test@test.com';
const DEMO_AUTH_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true';

const getAuthEmailRedirectUrl = () => {
    const configured = import.meta.env.VITE_AUTH_EMAIL_REDIRECT_URL;
    if (configured) return configured;
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/login`;
    }
    return undefined;
};

const getAuthResetRedirectUrl = () => {
    if (typeof window === 'undefined' || !window.location?.origin) return undefined;
    return `${window.location.origin}/reset-password`;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(undefined); // undefined = loading, null = guest
    const [guestId, setGuestId] = useState(null);

    useEffect(() => {
        // ── Demo / test account bypass ────────────────────────────────────────
        if (DEMO_AUTH_ENABLED && localStorage.getItem('plant_demo_session') === 'true') {
            setLocalStorageNamespace('demo');
            setGuestId(null);
            setUser({ id: DEMO_USER_ID, email: DEMO_EMAIL });
            return;
        }
        setLocalStorageNamespace('guest');
        // Initialize persistent guest identity and begin a verified, reversible
        // IndexedDB migration. Legacy localStorage is retained until the
        // adapter verifies every collection.
        const currentGuestId = getGuestId();
        setGuestId(currentGuestId);
        (async () => {
            const owner = `guest:${currentGuestId}`;
            const collections = [
                ['scans', 'sea_plant_scan_history'],
                ['logbook', 'sea_plant_mygap_logbook'],
                ['checklist', 'sea_plant_mygap_checklist'],
                ['notes', 'sea_plant_daily_notes'],
                ['plots', 'sea_plant_plots'],
            ];
            for (const [collection, legacyKey] of collections) {
                try { await migrateLegacyCollection({ owner, collection, legacyKey }); } catch (error) { console.warn('IndexedDB migration deferred:', error.message); }
            }
        })().catch(() => {});

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
                const { flushAuthenticatedSyncQueue } = await import('../utils/cloudSync.js');
                await flushAuthenticatedSyncQueue(currentUser.id);
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
            (event, session) => {
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                setLocalStorageNamespace('guest');
                // Run cloud requests after Supabase releases its auth lock.
                setTimeout(() => migrateForUser(currentUser), 0);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!user?.id || user.id === DEMO_USER_ID || typeof window === 'undefined') return undefined;
        let cancelled = false;
        const flush = async () => {
            if (cancelled || !navigator.onLine) return;
            try {
                const { flushAuthenticatedSyncQueue } = await import('../utils/cloudSync.js');
                await flushAuthenticatedSyncQueue(user.id);
            } catch (error) {
                console.warn('Sync queue flush deferred:', error.message);
            }
        };
        window.addEventListener('online', flush);
        document.addEventListener('visibilitychange', flush);
        flush();
        return () => {
            cancelled = true;
            window.removeEventListener('online', flush);
            document.removeEventListener('visibilitychange', flush);
        };
    }, [user?.id]);

    // ── Auth actions ──────────────────────────────────────────────────────────

    const signIn = async (email, password) => {
        const cleanEmail = email?.trim();
        const cleanPassword = password?.trim();

        // Demo bypass is development-only and must be explicitly enabled.
        if (cleanEmail === DEMO_EMAIL && DEMO_AUTH_ENABLED) {
            const isCorrectPassword = cleanPassword === 'Test321@' || cleanPassword === 'test';
            if (isCorrectPassword) {
                const demoUser = { id: DEMO_USER_ID, email: DEMO_EMAIL };
                localStorage.setItem('plant_demo_session', 'true');
                setLocalStorageNamespace('demo');
                setUser(demoUser);
                return { user: demoUser };
            } else {
                throw new Error('Invalid password for demo account. Please use Test321@ or test');
            }
        }

        if (!supabase) {
            throw new Error('Cloud login is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.');
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

    const resetPasswordForEmail = async (email) => {
        const cleanEmail = email?.trim();
        if (!cleanEmail) throw new Error('Enter your email address.');
        if (!supabase) {
            // Keep the UI neutral while making it clear that recovery needs a
            // configured auth provider in local development.
            throw new Error('Password recovery is not configured yet.');
        }
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
            redirectTo: getAuthResetRedirectUrl(),
        });
        if (error) throw error;
    };

    const updatePassword = async (password) => {
        if (!supabase) throw new Error('Password recovery is not configured yet.');
        const { data, error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        // Clear demo session
        if (localStorage.getItem('plant_demo_session')) {
            localStorage.removeItem('plant_demo_session');
            setLocalStorageNamespace('guest');
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
        <AuthContext.Provider value={{ user, guestId, signIn, signUp, signOut, resetPasswordForEmail, updatePassword, signInWithGoogle, isGoogleAuthEnabled: false, demoAuthEnabled: DEMO_AUTH_ENABLED }}>
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
