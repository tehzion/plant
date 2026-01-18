import { useLanguage } from '../i18n/i18n';

export const useGreeting = () => {
    const { t } = useLanguage();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('home.greetingMorning') || 'Good Morning';
        if (hour < 18) return t('home.greetingAfternoon') || 'Good Afternoon';
        return t('home.greetingEvening') || 'Good Evening';
    };

    return { getGreeting };
};
