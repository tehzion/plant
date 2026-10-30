// Maps AI pipeline failures to farmer-facing responses. Provider internals,
// keys and raw model output are never echoed back to the client.
const MESSAGES = {
    AI_TIMEOUT: {
        en: 'The plant check took too long. Please try again in a moment.',
        ms: 'Semakan tanaman mengambil masa terlalu lama. Sila cuba lagi sebentar lagi.',
        zh: '植物检测耗时过长，请稍后再试。',
    },
    AI_RESPONSE_INVALID: {
        en: 'The AI could not produce a reliable result for these photos. Please try again, or retake a clearer close-up.',
        ms: 'AI tidak dapat menghasilkan keputusan yang boleh dipercayai untuk foto ini. Sila cuba lagi atau ambil gambar dekat yang lebih jelas.',
        zh: 'AI 未能为这些照片生成可靠结果。请重试，或重新拍摄更清晰的近照。',
    },
    AI_PROVIDER_BUSY: {
        en: 'The AI service is busy right now. Please wait a minute and try again.',
        ms: 'Perkhidmatan AI sedang sibuk. Sila tunggu seminit dan cuba lagi.',
        zh: 'AI 服务目前繁忙，请稍等一分钟后再试。',
    },
    AI_PROVIDER_CONFIG: {
        en: 'The AI service is not set up correctly. Please contact support; your photos were not saved as a result.',
        ms: 'Perkhidmatan AI belum disediakan dengan betul. Sila hubungi sokongan; foto anda tidak disimpan sebagai keputusan.',
        zh: 'AI 服务配置有误。请联系支持团队；您的照片未保存为检测结果。',
    },
    AI_PROVIDER_UNAVAILABLE: {
        en: 'The AI service is temporarily unavailable. Please try again shortly.',
        ms: 'Perkhidmatan AI tidak tersedia buat sementara. Sila cuba lagi sebentar lagi.',
        zh: 'AI 服务暂时不可用，请稍后再试。',
    },
};

const message = (code, language) => MESSAGES[code][language] || MESSAGES[code].en;

export const classifyAnalysisFailure = (error = {}, language = 'en') => {
    const status = Number(error?.status);
    const text = String(error?.message || '').toLowerCase();
    let code;
    if (error?.code === 'AI_RESPONSE_INVALID') code = 'AI_RESPONSE_INVALID';
    else if (error?.name === 'AbortError' || /timed out|timeout|deadline/.test(text)) code = 'AI_TIMEOUT';
    else if (status === 429) code = 'AI_PROVIDER_BUSY';
    else if ([401, 403].includes(status) || /api key is missing/.test(text)) code = 'AI_PROVIDER_CONFIG';
    else code = 'AI_PROVIDER_UNAVAILABLE';
    const httpStatus = code === 'AI_TIMEOUT' ? 504 : code === 'AI_RESPONSE_INVALID' ? 502 : 503;
    return {
        code,
        status: httpStatus,
        retryable: code !== 'AI_PROVIDER_CONFIG',
        message: message(code, language),
    };
};
