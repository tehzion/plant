const fail = (message) => Object.assign(new Error(message), { status: 400 });
const languages = new Set(['en', 'ms', 'zh']);
const imagePattern = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

const text = (value, field, max, required = false) => {
    if (value == null && !required) return;
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
        throw fail(`${field} must be text${required ? ' and is required' : ''} (maximum ${max} characters)`);
    }
};
const object = (value, field) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail(`${field} must be an object`);
};
const array = (value, field, max = 500, required = false) => {
    if (value == null && !required) return;
    if (!Array.isArray(value) || value.length > max) throw fail(`${field} must be an array of at most ${max} items`);
};
const image = (value, field, required = false) => {
    if (!value && !required) return;
    if (typeof value !== 'string' || value.length > 8 * 1024 * 1024 || !imagePattern.test(value)) {
        throw fail(`${field} must be a JPEG, PNG, or WebP base64 image under 6 MB`);
    }
    const bytes = Buffer.from(value.split(',')[1], 'base64');
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!(value.startsWith('data:image/jpeg;') ? jpeg : value.startsWith('data:image/png;') ? png : webp)) {
        throw fail(`${field} content does not match its image type`);
    }
};

export const validateApiRequest = (req, _res, next) => {
    if (req.method !== 'POST') return next();
    try {
        const body = req.body;
        object(body, 'Request body');
        if (req.path !== '/analyze' && JSON.stringify(body).length > 256 * 1024) {
            throw Object.assign(new Error('Request body exceeds the 256 KB limit'), { status: 413 });
        }
        if (body.language != null && !languages.has(body.language)) throw fail('Unsupported language');
        switch (req.path) {
            case '/analyze':
                image(body.treeImage || body.image, 'treeImage', true);
                image(body.leafImage, 'leafImage');
                text(body.category, 'category', 100);
                text(body.location, 'location', 300);
                if (body.scanId != null && !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.scanId)) throw fail('scanId must be a UUID');
                if (body.imageQuality != null) {
                    object(body.imageQuality, 'imageQuality');
                    if (JSON.stringify(body.imageQuality).length > 4096) throw fail('imageQuality is too large');
                    if (body.imageQuality.context != null) {
                        object(body.imageQuality.context, 'capture context');
                        for (const field of ['duration', 'affected', 'recentTreatment']) text(body.imageQuality.context[field], field, 200);
                        if (!['leaf', 'fruit', 'stem', 'whole'].includes(body.imageQuality.context.plantPart)) throw fail('Invalid photo subject');
                    }
                }
                break;
            case '/ask':
                text(body.question, 'question', 4000, true);
                array(body.recentNotes, 'recentNotes', 5);
                array(body.recentAlerts, 'recentAlerts', 3);
                break;
            case '/feedback':
                text(body.scanId, 'scanId', 100, true);
                if (body.rating != null && (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)) throw fail('rating must be 1–5');
                if (body.wasCorrect != null && typeof body.wasCorrect !== 'boolean') throw fail('wasCorrect must be boolean');
                for (const field of ['comment', 'correction', 'note']) text(body[field], field, 4000);
                for (const field of ['correctCrop', 'correctDisease', 'issueType']) text(body[field], field, 200);
                break;
            case '/results/localize': object(body.result, 'result'); break;
            case '/products/search': object(body.diagnosis, 'diagnosis'); break;
            case '/farm/insights':
                array(body.logs, 'logs', 500, true);
                array(body.alerts, 'alerts'); array(body.plots, 'plots');
                break;
            case '/farm/sop':
                text(body.crop, 'crop', 200, true); text(body.disease, 'disease', 200, true); text(body.severity, 'severity', 100);
                break;
            case '/farm/parse-log': text(body.text, 'text', 4000, true); break;
            case '/farm/predict':
                for (const field of ['plots', 'logs', 'alerts']) array(body[field], field);
                break;
            case '/orders':
                array(body.items, 'items', 50, true);
                if (!body.items.length) throw fail('At least one order item is required');
                for (const item of body.items) {
                    if (!Number.isInteger(item?.productId) || item.productId < 1
                        || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) throw fail('Invalid product or quantity');
                }
                if (body.billing != null) object(body.billing, 'billing');
                if (body.shipping != null) object(body.shipping, 'shipping');
                break;
        }
        next();
    } catch (error) { next(error); }
};
