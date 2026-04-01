import React from 'react';
import { MapPinned, BookOpen, BarChart3, ShoppingBag, CheckSquare, Info } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';
import { useNavigate } from 'react-router-dom';

const ActionGrid = ({ onScan }) => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const actions = [
        {
            id: 'shop',
            label: t('nav.shop') || 'Shop',
            icon: <ShoppingBag size={20} strokeWidth={2} />,
            onClick: () => window.open('https://www.mojosense.app/kanb/products/', '_blank', 'noopener,noreferrer')
        },
        {
            id: 'mygap',
            label: t('home.mygapTitle') || 'myGAP',
            icon: <CheckSquare size={20} strokeWidth={2} />,
            onClick: () => navigate('/mygap')
        },
        {
            id: 'userguide',
            label: t('settings.guide') || 'User Guide',
            icon: <BookOpen size={20} strokeWidth={2} />,
            onClick: () => navigate('/guide')
        }
    ];

    return (
        <>
            <div className="section-header-row home-section-header-row home-action-grid-header">
                <h3 className="section-title home-section-title home-action-grid-title">
                    {t('profile.quickActions') || 'Quick Actions'}
                </h3>
            </div>
            <div className="superapp-shelf-container">
                {actions.map(action => (
                    <button
                        key={action.id}
                        onClick={action.onClick}
                        className="superapp-utility-card"
                    >
                        <div className="superapp-utility-icon-box">
                            {action.icon}
                        </div>
                        <span className="superapp-utility-label">
                            {action.label}
                        </span>
                    </button>
                ))}
            </div>
        </>
    );
};

export default ActionGrid;
