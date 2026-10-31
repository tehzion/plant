// One contact link for the floating assistant, used by the server's replies
// and by the widget's own buttons, so every WhatsApp link opens the same chat
// with the same greeting already typed.
export const ASSISTANT_WHATSAPP = '+60146193328';
export const SUPPORT_EMAIL = 'support@smartplant.my';

const GREETING = {
    en: 'Hi KANB team, I need help with my farm.',
    ms: 'Hai pasukan KANB, saya perlukan bantuan untuk ladang saya.',
    zh: '您好 KANB 团队，我的农场需要帮助。',
};

export const buildContactOptions = (language = 'en') => ({
    whatsapp: `https://wa.me/${ASSISTANT_WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent(GREETING[language] || GREETING.en)}`,
    email: `mailto:${SUPPORT_EMAIL}`,
});
