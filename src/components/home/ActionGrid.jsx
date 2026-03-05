import React from 'react';
import { ScanLine } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';

const ActionGrid = ({ onScan }) => {
    const { t } = useLanguage();

    return (
        <div className="main-action-grid">
            <button onClick={onScan} className="action-tile primary-tile bounce-in">
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
