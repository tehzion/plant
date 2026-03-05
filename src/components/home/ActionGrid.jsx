import React from 'react';
import { ScanLine } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';

const ActionGrid = ({ onScan }) => {
    const { t } = useLanguage();

    return (
        <div className="main-action-grid">
            <button onClick={onScan} className="action-tile primary-tile bounce-in" style={{ transition: 'all 0.2s ease-out', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
                <div className="tile-icon">
                    <ScanLine size={32} strokeWidth={1.5} />
                </div>
                <div className="tile-text">
                    <span className="tile-label">{t('home.scanPlant')}</span>
                    <span className="tile-sublabel">{t('home.scanDesc')}</span>
                </div>
            </button>
        </div>
    );
};

export default ActionGrid;
