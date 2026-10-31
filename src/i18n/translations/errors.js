// Plain-language messages for request failures. Raw server or library text
// (status codes, "Failed to fetch") is never shown to farmers.
const errorsTranslations = {
    en: {
        errors: {
            offline: 'You are offline. Check your internet connection and try again.',
            network: 'We could not connect. Check your internet connection and try again.',
            timeout: 'This is taking too long. Please try again in a moment.',
            session: 'Your sign-in has expired. Please sign in again.',
            tooMany: 'You have reached today\'s limit. Please try again tomorrow.',
            tooLarge: 'The photo is too large. Please use a smaller photo.',
            server: 'Something went wrong on our side. Please try again shortly.',
            generic: 'Something went wrong. Please try again.',
            ordersLoad: 'We could not load your orders. Please try again.',
            reportLoad: 'We could not load the full report. Please try again.',
            recoveryFailed: 'We could not send your request. Please try again.',
            recoverySent: 'Your request was sent to the store team for verification.',
        },
    },
    ms: {
        errors: {
            offline: 'Anda di luar talian. Semak sambungan internet anda dan cuba lagi.',
            network: 'Kami tidak dapat menyambung. Semak sambungan internet anda dan cuba lagi.',
            timeout: 'Ini mengambil masa terlalu lama. Sila cuba lagi sebentar lagi.',
            session: 'Log masuk anda telah tamat. Sila log masuk semula.',
            tooMany: 'Anda telah mencapai had hari ini. Sila cuba lagi esok.',
            tooLarge: 'Gambar terlalu besar. Sila gunakan gambar yang lebih kecil.',
            server: 'Berlaku masalah di pihak kami. Sila cuba lagi sebentar lagi.',
            generic: 'Berlaku masalah. Sila cuba lagi.',
            ordersLoad: 'Kami tidak dapat memuatkan pesanan anda. Sila cuba lagi.',
            reportLoad: 'Kami tidak dapat memuatkan laporan penuh. Sila cuba lagi.',
            recoveryFailed: 'Kami tidak dapat menghantar permintaan anda. Sila cuba lagi.',
            recoverySent: 'Permintaan anda telah dihantar kepada pasukan kedai untuk pengesahan.',
        },
    },
    zh: {
        errors: {
            offline: '您目前处于离线状态。请检查网络连接后重试。',
            network: '无法连接。请检查网络连接后重试。',
            timeout: '处理时间过长，请稍后再试。',
            session: '您的登录已过期，请重新登录。',
            tooMany: '您已达到今日使用上限，请明天再试。',
            tooLarge: '照片太大，请使用较小的照片。',
            server: '我们这边出了点问题，请稍后再试。',
            generic: '出了点问题，请重试。',
            ordersLoad: '无法加载您的订单，请重试。',
            reportLoad: '无法加载完整报告，请重试。',
            recoveryFailed: '无法发送您的请求，请重试。',
            recoverySent: '您的请求已发送给商店团队进行核实。',
        },
    },
};

export default errorsTranslations;
