// Small text helpers for the myGAP screens: translated labels with an English
// fallback, and {placeholder} filling (the i18n layer has no interpolation).
export const createLabel = (t) => (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
};

export const fill = (template, values = {}) => String(template || '')
    .replace(/\{(\w+)\}/g, (match, name) => (values[name] != null ? String(values[name]) : match));

export const formatDay = (date, language = 'en') => (date
    ? date.toLocaleDateString(language === 'ms' ? 'ms-MY' : language === 'zh' ? 'zh-MY' : 'en-MY')
    : '');

const FIELD_LABELS = {
    activity_date: ['assessment.mygap.activityDate', 'Activity date'],
    plot_id: ['assessment.mygap.plot', 'Farm or plot'],
    crop: ['assessment.mygap.crop', 'Crop'],
    product_used: ['assessment.mygap.productUsed', 'Product used'],
    quantity: ['assessment.mygap.quantity', 'Quantity you used'],
    active_ingredient: ['mygap.activeIngredient', 'Active ingredient'],
    registration_no: ['mygap.lrmpNo', 'LRMP registration no.'],
    area_treated: ['mygap.areaTreated', 'Area treated'],
    target_pest: ['mygap.targetPest', 'Pest or disease treated'],
    phi_days: ['mygap.phiDaysField', 'Waiting period before harvest'],
};

export const fieldLabel = (label, field) => {
    const [key, fallback] = FIELD_LABELS[field] || [field, field];
    return label(key, fallback);
};
