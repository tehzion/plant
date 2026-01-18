import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';

const ServerStatus = ({ status }) => {
    const { language } = useLanguage();

    return (
        <div className={`server-status-banner ${status === 'offline' ? 'status-demo' : 'status-live'} mt-sm fade-in`}>
            {status === 'offline' ? (
                <>
                    <WifiOff size={16} strokeWidth={1.5} />
                    <span>{language === 'ms' ? 'Mod Demo: Data Simulasi Aktif' : 'Demo Mode: Simulated Data Active'}</span>
                </>
            ) : status === 'online' ? (
                <>
                    <Wifi size={16} strokeWidth={1.5} />
                    <span>{language === 'ms' ? 'Sistem Dalam Talian' : 'System Online'}</span>
                </>
            ) : (
                <span style={{ opacity: 0 }}>...</span>
            )}
        </div>
    );
};

export default ServerStatus;
