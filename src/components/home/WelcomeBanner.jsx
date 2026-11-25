import { useState } from 'react';
import { Camera, ClipboardCheck, MessageCircle, X } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';
import './WelcomeBanner.css';

export const WELCOME_SEEN_KEY = 'kanb_welcome_seen_v1';

const hasSeenWelcome = () => {
    try { return localStorage.getItem(WELCOME_SEEN_KEY) === '1'; } catch { return false; }
};
const markWelcomeSeen = () => {
    try { localStorage.setItem(WELCOME_SEEN_KEY, '1'); } catch { /* private mode: it shows again next visit */ }
};

const POINTS = [
    { key: 'welcomePointCheck', Icon: Camera },
    { key: 'welcomePointRecords', Icon: ClipboardCheck },
    { key: 'welcomePointTeam', Icon: MessageCircle },
];

// A padi stalk that grows in once when the banner first appears.
const Sprout = () => (
    <svg className="welcome-banner__sprout" viewBox="0 0 120 160" aria-hidden="true" focusable="false">
        <path className="welcome-banner__stem" d="M60 158 C60 120 58 92 64 52 C68 28 78 14 92 6" />
        <path className="welcome-banner__leaf" d="M61 118 C42 108 26 90 20 66 C40 74 54 92 61 118 Z" />
        <path className="welcome-banner__leaf" d="M62 92 C80 82 96 64 100 42 C82 50 68 68 62 92 Z" />
        <path className="welcome-banner__leaf" d="M63 66 C48 56 38 40 36 22 C52 30 61 46 63 66 Z" />
        <g className="welcome-banner__grain">
            <ellipse cx="94" cy="10" rx="4" ry="7" transform="rotate(40 94 10)" />
            <ellipse cx="84" cy="18" rx="4" ry="7" transform="rotate(25 84 18)" />
            <ellipse cx="100" cy="22" rx="4" ry="7" transform="rotate(60 100 22)" />
        </g>
    </svg>
);

// Greets a farmer on their first visit on this device and points them to the
// first plant check. Once closed, either way, it does not come back.
export default function WelcomeBanner({ onStart }) {
    const { t } = useLanguage();
    const [visible, setVisible] = useState(() => !hasSeenWelcome());
    if (!visible) return null;
    const close = () => { markWelcomeSeen(); setVisible(false); };
    const start = () => { close(); onStart?.(); };

    return (
        <section className="welcome-banner" aria-labelledby="welcome-banner-title">
            <button type="button" className="welcome-banner__close" onClick={close} aria-label={t('home.welcomeClose')}>
                <X size={20} aria-hidden="true" />
            </button>
            <div className="welcome-banner__copy">
                <h2 id="welcome-banner-title">{t('home.welcomeTitle')}</h2>
                <p className="welcome-banner__lead">{t('home.welcomeLead')}</p>
                <div className="welcome-banner__body">
                    <Sprout />
                    <ul className="welcome-banner__points">
                        {POINTS.map(({ key, Icon }) => (
                            <li key={key}><Icon size={18} aria-hidden="true" /><span>{t(`home.${key}`)}</span></li>
                        ))}
                    </ul>
                </div>
                <div className="welcome-banner__actions">
                    <button type="button" className="welcome-banner__start" onClick={start}>
                        <Camera size={20} aria-hidden="true" />
                        {t('home.welcomeStart')}
                    </button>
                    <button type="button" className="welcome-banner__later" onClick={close}>{t('home.welcomeLater')}</button>
                </div>
            </div>
        </section>
    );
}
