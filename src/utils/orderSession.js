const SESSION_KEY = 'plant_order_access_v1';
const apiUrl = import.meta.env.VITE_API_URL || '';
let pendingSession;

export const getOrderSession = async () => {
    let stored;
    try { stored = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { /* invalid stored session */ }
    if (stored?.accessToken && stored.expiresAt > Date.now() / 1000 + 86400) return stored;
    if (pendingSession) return pendingSession;
    pendingSession = (async () => {
        const response = await fetch(`${apiUrl}/api/orders/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(stored?.accessToken ? { Authorization: `Bearer ${stored.accessToken}` } : {}) },
            body: '{}',
        });
        if (!response.ok) throw new Error('Could not establish secure order access');
        const session = await response.json();
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session;
    })().finally(() => { pendingSession = null; });
    return pendingSession;
};
