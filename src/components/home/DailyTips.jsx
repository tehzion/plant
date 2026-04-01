import React, { useState, useRef, useEffect } from 'react';
import { Droplets, FlaskConical, Bug, Sprout } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';

const DailyTips = () => {
    const { t } = useLanguage();
    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const touchStart = useRef(null);
    const touchEnd = useRef(null);

    const dailyTips = React.useMemo(() => [
        { id: 1, categoryKey: 'tip1Cat', titleKey: 'tip1Title', descKey: 'tip1Desc', icon: <Droplets size={36} />, themeClass: 'daily-tip-theme-water' },
        { id: 2, categoryKey: 'tip2Cat', titleKey: 'tip2Title', descKey: 'tip2Desc', icon: <FlaskConical size={36} />, themeClass: 'daily-tip-theme-nutrients' },
        { id: 3, categoryKey: 'tip3Cat', titleKey: 'tip3Title', descKey: 'tip3Desc', icon: <Bug size={36} />, themeClass: 'daily-tip-theme-pests' },
        { id: 4, categoryKey: 'tip4Cat', titleKey: 'tip4Title', descKey: 'tip4Desc', icon: <Sprout size={36} />, themeClass: 'daily-tip-theme-growth' }
    ], []);

    // Carousel Logic
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTipIndex((prev) => (prev + 1) % dailyTips.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [dailyTips.length]);

    const handleTouchStart = (e) => {
        touchStart.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e) => {
        touchEnd.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;
        const distance = touchStart.current - touchEnd.current;

        if (distance > 50) {
            setCurrentTipIndex((prev) => (prev + 1) % dailyTips.length);
        } else if (distance < -50) {
            setCurrentTipIndex((prev) => (prev - 1 + dailyTips.length) % dailyTips.length);
        }

        touchEnd.current = null;
        touchStart.current = null;
    };

    const currentTip = dailyTips[currentTipIndex];

    return (
        <section className="home-section home-daily-tips slide-up delay-200">
            <div className="home-section-header-row">
                <h3 className="home-section-title">{t('home.dailyTips')}</h3>
            </div>

            <div
                className="daily-tips-carousel"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div
                    key={currentTipIndex}
                    className={`daily-tip-card fade-in-fast ${currentTip.themeClass}`}
                >
                    <div className="daily-tip-content">
                        <span className="daily-tip-badge">
                            {t(`home.${currentTip.categoryKey}`) || t('home.tipBadge')}
                        </span>
                        <h4 className="daily-tip-title">{t(`home.${currentTip.titleKey}`)}</h4>
                        <p className="daily-tip-description">{t(`home.${currentTip.descKey}`)}</p>
                    </div>
                    <div className="daily-tip-icon">{currentTip.icon}</div>

                    <div className="daily-tip-dots">
                        {dailyTips.map((_, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className={`daily-tip-dot ${idx === currentTipIndex ? 'active' : ''}`}
                                onClick={() => setCurrentTipIndex(idx)}
                                aria-label={`${t('home.dailyTips')} ${idx + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default DailyTips;
