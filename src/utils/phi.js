export const MAX_PHI_DAYS = 3650;

export const parsePHIDays = (value) => {
    const normalized = String(value ?? '').trim();
    if (!normalized || !/^\d+$/.test(normalized)) return null;

    const days = Number(normalized);
    return Number.isInteger(days) && days >= 0 && days <= MAX_PHI_DAYS ? days : null;
};

export const calculateSafeHarvestDate = (days, from = new Date()) => {
    const safeDate = new Date(from);
    safeDate.setHours(0, 0, 0, 0);
    safeDate.setDate(safeDate.getDate() + days);
    return safeDate;
};
