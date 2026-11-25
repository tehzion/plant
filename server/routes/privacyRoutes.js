import { verifyAuthenticatedUser } from '../utils/supabaseAuth.js';
import { getAccountConsent, saveAccountConsent } from '../services/accountConsentService.js';

export const registerPrivacyRoutes = (app) => {
    for (const method of ['get', 'post']) app[method]('/api/privacy/consent', async (req, res, next) => {
        try {
            const user = await verifyAuthenticatedUser(req);
            if (method === 'post' && typeof req.body?.aiImprovement !== 'boolean') {
                return res.status(400).json({ error: 'Choose whether to keep photos for AI improvement.' });
            }
            const consent = method === 'get' ? await getAccountConsent(user.id) : await saveAccountConsent(user.id, req.body);
            res.json({ consent });
        } catch (error) {
            if (error.code === '42703') {
                return next(Object.assign(new Error('Account privacy settings are being set up. Photos will not be kept for AI improvement.'), { status: 503 }));
            }
            next(error);
        }
    });
};
