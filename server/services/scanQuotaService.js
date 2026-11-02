import { consumeAiQuota } from './aiQuotaService.js';

export const FREE_SCAN_DAILY_LIMIT = 10;
export const consumeFreeScanQuota = identity => {
    const configured = Number(process.env.FREE_SCAN_DAILY_LIMIT);
    const limit = Number.isSafeInteger(configured) && configured > 0 ? configured : FREE_SCAN_DAILY_LIMIT;
    return consumeAiQuota({ identity: `plant-scan:${identity}`, limit, timeZone: 'Asia/Kuala_Lumpur' });
};

export const scanQuotaMessage = (language, limit) => language === 'ms'
    ? `Had ${limit} semakan percuma hari ini telah dicapai. Cuba lagi selepas tengah malam waktu Malaysia.`
    : language === 'zh'
        ? `今天的 ${limit} 次免费植物检查已用完。请在马来西亚时间午夜后重试。`
        : `You have reached today's ${limit} free plant checks. Try again after midnight Malaysia time.`;
