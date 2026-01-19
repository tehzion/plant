import React, { useState, useRef, useEffect } from 'react';
import { Droplets, FlaskConical, Bug, Sprout } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';

const DailyTips = () => {
    const { t } = useLanguage();
    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const touchStart = useRef(null);
    const touchEnd = useRef(null);

    const dailyTips = React.useMemo(() => [
        { id: 1, categoryKey: 'tip1Cat', titleKey: 'tip1Title', descKey: 'tip1Desc', icon: <Droplets size={36} />, bg: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)', color: '#1565C0' },
        { id: 2, categoryKey: 'tip2Cat', titleKey: 'tip2Title', descKey: 'tip2Desc', icon: <FlaskConical size={36} />, bg: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)', color: '#2E7D32' },
        { id: 3, categoryKey: 'tip3Cat', titleKey: 'tip3Title', descKey: 'tip3Desc', icon: <Bug size={36} />, bg: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', color: '#EF6C00' },
        { id: 4, categoryKey: 'tip4Cat', titleKey: 'tip4Title', descKey: 'tip4Desc', icon: <Sprout size={36} />, bg: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)', color: '#6A1B9A' }
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

    return (
        <div className="section mt-md tips-section slide-up delay-200">
            <div className="section-header">
                <h3 className="section-title">{t('home.dailyTips')}</h3>
            </div>

            <div
                className="tips-carousel-container"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div
                    key={currentTipIndex}
                    className="tips-card fade-in-fast"
                    style={{ background: dailyTips[currentTipIndex].bg, position: 'relative' }}
                >
                    <div className="tip-content">
                        <span
                            className="tip-badge"
                            style={{ color: dailyTips[currentTipIndex].color }}
                        >
                            {t(`home.${dailyTips[currentTipIndex].categoryKey}`) || t('home.tipBadge')}
                        </span>
                        <h4 style={{ color: dailyTips[currentTipIndex].color }}>{t(`home.${dailyTips[currentTipIndex].titleKey}`)}</h4>
                        <p style={{ color: dailyTips[currentTipIndex].color }}>{t(`home.${dailyTips[currentTipIndex].descKey}`)}</p>
                    </div>
                    <div className="tip-image">{dailyTips[currentTipIndex].icon}</div>

                    <div className="dots-container">
                        {dailyTips.map((_, idx) => (
                            <div
                                key={idx}
                                className={`carousel-dot ${idx === currentTipIndex ? 'active' : ''}`}
                                onClick={() => setCurrentTipIndex(idx)}
                                style={{
                                    backgroundColor: idx === currentTipIndex ? dailyTips[currentTipIndex].color : 'rgba(0,0,0,0.1)'
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyTips;
