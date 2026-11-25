import { STORE_URL } from '../../utils/store.js';
import React from 'react';
import { BookOpen, ChevronRight, ExternalLink, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';
import { useNavigate } from 'react-router-dom';

// Only what the tab bar and header do not already offer. Plant check, history,
// farm records and myGAP each have one place (the navigation), not two.
const ActionGrid = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const actions = [
        {
            id: 'shop',
            label: t('nav.products') || 'Products',
            description: t('home.productsDesc'),
            icon: ShoppingBag,
            external: true,
            onClick: () => window.open(STORE_URL, '_blank', 'noopener,noreferrer')
        },
        {
            id: 'userguide',
            label: t('settings.guide') || 'User Guide',
            description: t('home.guideDesc'),
            icon: BookOpen,
            onClick: () => navigate('/guide')
        },
    ];

    return (
        <section className="home-tools" aria-labelledby="home-tools-title">
            <div className="section-header-row home-section-header-row">
                <h3 id="home-tools-title" className="section-title home-section-title">
                    {t('home.farmTools') || 'Farm tools'}
                </h3>
            </div>
            <ul className="home-tools__list">
                {actions.map(({ id, label, description, icon: Icon, onClick, external }) => (
                    <li key={id}>
                        <button
                            type="button"
                            onClick={onClick}
                            className="home-tools__item"
                            aria-label={label}
                        >
                            <span className="home-tools__icon" aria-hidden="true"><Icon size={20} /></span>
                            <span className="home-tools__text">
                                <span className="home-tools__label">{label}</span>
                                {description && <span className="home-tools__desc">{description}</span>}
                            </span>
                            {external
                                ? <ExternalLink size={16} aria-hidden="true" className="home-tools__chevron" />
                                : <ChevronRight size={18} aria-hidden="true" className="home-tools__chevron" />}
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default ActionGrid;
