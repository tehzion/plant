import React from 'react';
import { BookOpen, ShoppingBag, Info, CheckSquare } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';

const ServicesGrid = ({ onNavigate }) => {
    const { t } = useLanguage();
    const shopUrl = 'https://www.mojosense.app/kanb/products/';

    const services = [
        {
            path: shopUrl,
            icon: <ShoppingBag size={24} strokeWidth={1.5} />,
            label: t('nav.shop'),
            iconClass: 'shop-icon',
            external: true,
        },
        {
            path: '/mygap',
            icon: <CheckSquare size={24} strokeWidth={1.5} />,
            label: t('home.mygapTitle'),
            iconClass: 'mygap-icon'
        },
        {
            path: '/encyclopedia',
            icon: <Info size={24} strokeWidth={1.5} />,
            label: t('home.keyInfo'),
            iconClass: 'guide-icon',
        },
        {
            path: '/guide',
            icon: <BookOpen size={24} strokeWidth={1.5} />,
            label: t('settings.guide'),
            iconClass: 'book-icon'
        }
    ];

    return (
        <div className="section mt-md slide-up delay-300">
            <div className="section-header">
                <h3 className="section-title">{t('home.services')}</h3>
            </div>
            <div className="services-grid">
                {services.map((service) => (
                    <div
                        key={service.path}
                        className="service-card"
                        onClick={() => onNavigate(service.path, service.isStub, service.external)}
                    >
                        <div className={`service-icon ${service.iconClass}`}>
                            {service.icon}
                        </div>
                        <span>{service.label}</span>
                    </div>
                ))}
            </div>
            <style>{`
                .service-icon.mygap-icon {
                    background: #F3F4F6;
                    color: #1F2937;
                }
            `}</style>
        </div>
    );
};

export default ServicesGrid;
