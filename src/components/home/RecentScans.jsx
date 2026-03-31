import React from 'react';
import { AlertTriangle, CheckCircle, MapPin } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';
import { getStandardizedStatus } from '../../utils/statusUtils';

const resolveCategoryLabel = (scan, t) => {
    const plantType = scan.plantType || '';
    const key = `home.category${plantType.charAt(0).toUpperCase()}${plantType.slice(1).toLowerCase()}`;
    const translated = t(key);
    const finalName = translated.includes('home.category') ? plantType : translated;
    return finalName.toUpperCase();
};

const resolveLocationLabel = (scan, t) => {
    if (!scan.locationName) return '';
    if (scan.locationName.startsWith('common.')) return t(scan.locationName);

    const translationKey = `common.${scan.locationName}`;
    const translated = t(translationKey);
    return translated && translated !== translationKey ? translated : scan.locationName;
};

const RecentScans = ({ scans, onSeeAll, onScanClick }) => {
    const { t, label: labelFn } = useLanguage();
    const label = (key, fallback) => (typeof labelFn === 'function' ? labelFn(key, fallback) : fallback);

    return (
        <div className="section mt-md slide-up">
            <div className="section-header-row mb-sm" style={{ padding: '0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="section-title" style={{ fontSize: '1.35rem', fontWeight: '850', margin: '0' }}>
                    {t('profile.recentActivity') || 'Recent Scans'}
                </h3>
                <button
                    onClick={onSeeAll}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                    }}
                >
                    {t('home.seeAll')}
                </button>
            </div>
            <div className="superapp-shelf-container">
                {scans.length > 0 ? (
                    scans.map((scan) => {
                        const standardizedStatus = getStandardizedStatus(scan);
                        const healthy = standardizedStatus === 'healthy';
                        const imageSrc = scan.image || scan.image_url || scan.leafImage || scan.leaf_image_url || '';
                        const scanTimestamp = scan.timestamp || scan.created_at;
                        const locationLabel = resolveLocationLabel(scan, t);

                        return (
                            <div
                                key={scan.id}
                                className="superapp-activity-card"
                                onClick={() => onScanClick(scan.id)}
                            >
                                <div className="superapp-activity-img-wrapper" style={{ backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {imageSrc ? (
                                        <img 
                                            src={imageSrc} 
                                            alt={scan.disease} 
                                            className="superapp-activity-img"
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/120x80?text=Scan'; }}
                                        />
                                    ) : (
                                        <div style={{ color: '#94a3b8' }}>
                                            <MapPin size={24} opacity={0.3} />
                                        </div>
                                    )}
                                </div>
                                <div className="superapp-activity-info">
                                    <h4 className="scan-disease" style={{
                                        fontSize: '0.95rem',
                                        fontWeight: '850',
                                        fontFamily: 'var(--font-heading)',
                                        margin: '0',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {scan.disease}
                                    </h4>
                                    <p className="scan-meta" style={{
                                        fontSize: '0.72rem',
                                        fontWeight: '700',
                                        color: 'var(--color-text-secondary)',
                                        textTransform: 'uppercase',
                                        margin: '0'
                                    }}>
                                        {resolveCategoryLabel(scan, t)} • {new Date(scanTimestamp).toLocaleDateString(label('common.dateLocale', 'en-MY'), {
                                            day: 'numeric',
                                            month: 'short'
                                        })}
                                    </p>
                                    <div className="scan-badge-row mt-xs" style={{ display: 'flex', gap: '6px' }}>
                                        <div className={`status-badge-mini ${healthy ? 'status-healthy' : 'status-unhealthy'}`} style={{ fontSize: '0.65rem' }}>
                                            <span className="status-icon" style={{ display: 'flex' }}>
                                                {healthy
                                                    ? <CheckCircle size={8} strokeWidth={3} />
                                                    : <AlertTriangle size={8} strokeWidth={3} />}
                                            </span>
                                            <span className="status-text">{t(`results.${standardizedStatus}`)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="app-empty-state" style={{ minWidth: '100%' }}>
                        <span>{t('home.noRecentScans')}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentScans;
