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
                                    {(() => {
                                        const pType = scan.plantType || '';
                                        const translated = t(`home.category${pType.charAt(0).toUpperCase() + pType.slice(1).toLowerCase()}`);
                                        const finalName = translated.includes('home.category') ? pType : translated;
                                        return finalName.toUpperCase();
                                    })()} • {new Date(scan.timestamp).toLocaleDateString(t('common.dateLocale') || 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                                {scan.locationName && scan.locationName !== 'N/A' && !scan.locationName.includes('N/A') && (
                                    <p className="scan-location">
                                        <MapPin size={12} strokeWidth={1.5} /> {t(scan.locationName)}
                                    </p>
                                )}
                                <div className="scan-badge-row mt-xs" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <div className={`status-badge-mini ${scan.healthStatus?.toLowerCase() === 'healthy' || scan.healthStatus === 'Sihat' ? 'status-healthy' : 'status-unhealthy'}`}>
                                        <span className="status-icon" style={{ display: 'flex' }}>
                                            {(scan.healthStatus?.toLowerCase() === 'healthy' || scan.healthStatus === 'Sihat') ?
                                                <CheckCircle size={10} strokeWidth={3} /> :
                                                <AlertTriangle size={10} strokeWidth={3} />
                                            }
                                        </span>
                                        <span className="status-text">{t(`results.${(scan.healthStatus || 'unknown').toLowerCase().replace(/\s+/g, '')}`) || scan.healthStatus}</span>
                                    </div>

                                    {scan.severity && (
                                        <div className={`badge-severity ${(() => {
                                            switch (scan.severity?.toLowerCase()) {
                                                case 'mild': return 'badge-mild';
                                                case 'moderate': return 'badge-moderate';
                                                case 'severe': return 'badge-severe';
                                                default: return '';
                                            }
                                        })()}`}>
                                            {t(`results.${(scan.severity || 'unknown').toLowerCase().replace(/\s+/g, '')}`) || scan.severity}
                                        </div>
                                    )}
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
