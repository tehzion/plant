import React from 'react';
import { BookOpen, ShoppingBag, Info, BarChart2 } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';

const ServicesGrid = ({ onNavigate }) => {
    const { t } = useLanguage();

    return (
        <div className="section mt-md slide-up delay-300">
            <div className="section-header">
                <h3 className="section-title">{t('home.services')}</h3>
            </div>
            <div className="services-grid">
                <div className="service-card" onClick={() => onNavigate('/shop')}>
                    <div className="service-icon shop-icon">
                        <ShoppingBag size={24} strokeWidth={1.5} />
                    </div>
                    <span>{t('nav.shop')}</span>
                </div>
                <div className="service-card" onClick={() => onNavigate('/statistics')}>
                    <div className="service-icon history-icon">
                        <BarChart2 size={24} strokeWidth={1.5} />
                    </div>
                    <span>{t('home.statistics')}</span>
                </div>
                <div className="service-card" onClick={() => onNavigate('/key-info')}>
                    <div className="service-icon guide-icon">
                        <Info size={24} strokeWidth={1.5} />
                    </div>
                    <span>{t('home.keyInfo')}</span>
                </div>
                <div className="service-card" onClick={() => onNavigate('/user-guide')}>
                    <div className="service-icon book-icon">
                        <BookOpen size={24} strokeWidth={1.5} />
                    </div>
                    <span>{t('settings.guide')}</span>
                </div>
            </div>
        </div>
    );
};

export default ServicesGrid;
