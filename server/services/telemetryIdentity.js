import { getBearerToken, verifyAuthenticatedUser } from '../utils/supabaseAuth.js';
import { verifyOrderSession } from '../utils/orderAccess.js';

export const resolveTelemetryIdentity = async req => {
    const token = getBearerToken(req);
    if (!token) throw Object.assign(new Error('A verified session is required.'), { status: 401 });
    const guest = verifyOrderSession(token);
    if (guest) return { userId: null, guestId: guest.guestId };
    const user = await verifyAuthenticatedUser(req);
    return { userId: user.id, guestId: null };
};
