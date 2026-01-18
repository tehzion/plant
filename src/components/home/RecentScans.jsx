import React from 'react';
import { MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';

const RecentScans = ({ scans, onSeeAll, onScanClick }) => {
    const { t } = useLanguage();

    return (
        <div className="section mt-md slide-up">
            <div className="section-header">
                <h3 className="section-title">{t('home.recentScans')}</h3>
                <button onClick={onSeeAll} className="see-all-btn">{t('home.seeAll')}</button>
            </div>
            <div className="recent-scans-list">
                {scans.length > 0 ? (
                    scans.map((scan) => (
                        <div key={scan.id} className="scan-card" onClick={() => onScanClick(scan.id)}>
                            <div className="scan-thumbnail">
                                <img src={scan.image} alt={scan.disease} />
                            </div>
                            <div className="scan-details">
                                <h4 className="scan-disease" title={scan.disease}>{scan.disease}</h4>
                                <p className="scan-meta">
                                    {scan.plantType} • {new Date(scan.timestamp).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                                {scan.locationName && scan.locationName !== 'N/A' && scan.locationName !== 'Location N/A' && (
                                    <p className="scan-location">
                                        <MapPin size={12} strokeWidth={1.5} /> {scan.locationName}
                                    </p>
                                )}
                                <div className={`scan-status-info status-${scan.healthStatus?.toLowerCase()}`}>
                                    <span className="status-icon">
                                        {scan.healthStatus?.toLowerCase() === 'healthy' ?
                                            <CheckCircle size={14} className="text-green-600" strokeWidth={1.5} /> :
                                            <AlertTriangle size={14} className="text-red-500" strokeWidth={1.5} />
                                        }
                                    </span>
                                    <span className="status-text">{scan.healthStatus}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state-card">
                        <span>{t('home.noRecentScans')}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentScans;
