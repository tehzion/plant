import { PRODUCT_REGISTRATIONS } from '../data/productRegistrations.js';
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ');

export const findRegisteredUse = (product, diagnosis, records = PRODUCT_REGISTRATIONS, now = new Date()) => {
    const crop = normalize(diagnosis.plantType || diagnosis.crop);
    const condition = normalize(diagnosis.disease);
    return records.find(record => {
        const verified = Date.parse(record.verifiedAt), expires = Date.parse(record.reviewUntil);
        return String(record.productId) === String(product.id) && record.registrationNumber && record.reviewedBy
            && Number.isFinite(verified) && verified <= now.getTime() && Number.isFinite(expires) && expires > now.getTime()
            && /^https:\/\//.test(record.labelUrl || '')
            && record.crops?.some(name => normalize(name) === crop)
            && record.targets?.some(name => normalize(name) === condition);
    }) || null;
};

export const enforceRegisteredTreatments = (split, diagnosis) => {
    const eligible = [], discovery = [...split.discovery];
    for (const product of split.eligible) {
        const record = findRegisteredUse(product, diagnosis);
        if (record) eligible.push({ ...product, registrationEvidence: { registrationNumber: record.registrationNumber, labelUrl: record.labelUrl, verifiedAt: record.verifiedAt, reviewUntil: record.reviewUntil } });
        else discovery.push({ ...product, discoveryOnly: true, eligibility: { ...product.eligibility, status: 'needs_verification', reasons: [...(product.eligibility?.reasons || []), 'registration_not_verified'] } });
    }
    return { ...split, eligible, discovery };
};
