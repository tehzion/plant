import { STORE_URL } from '../../utils/store.js';
import React from 'react';
import { BookOpen, ChevronRight, ClipboardCheck, ExternalLink, History, ScanLine, ShoppingBag, Sprout } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';
import { useNavigate } from 'react-router-dom';

// Plain list of the farmer's other workflows. "Check plant health" keeps its
// own panel above; it is repeated here only as the first row for consistency.
const ActionGrid = ({ onScan }) => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const actions = [
        {
            id: 'scan',
            label: t('nav.checkPlant') || 'Check plant health',
            icon: ScanLine,
            onClick: onScan,
        },
        {
            id: 'history',
            label: t('nav.history') || 'History',
            description: t('home.historyDesc'),
            icon: History,
            onClick: () => navigate('/history')
        },
        {
            id: 'farm',
            label: t('home.farmRecords') || 'Farm records',
            description: t('home.farmRecordsDesc'),
            icon: Sprout,
            onClick: () => navigate('/profile')
        },
        {
            id: 'mygap',
            label: t('home.mygapTitle') || 'myGAP',
            description: t('home.mygapToolDesc'),
            icon: ClipboardCheck,
            onClick: () => navigate('/mygap')
        },
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
