import React from 'react';
import { AlertTriangle, CheckCircle, MapPin, Leaf } from 'lucide-react';
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

const formatScanDate = (timestamp, locale) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
    });
};

const RecentScans = ({ scans, onSeeAll, onScanClick }) => {
    const { t, label: labelFn } = useLanguage();
    const label = (key, fallback) => (typeof labelFn === 'function' ? labelFn(key, fallback) : fallback);

    return (
        <div className="mt-md slide-up">
            <div className="section-header-row home-section-header-row">
                <h3 className="section-title home-section-title">
                    {t('profile.recentActivity') || 'Recent Scans'}
                </h3>
                <button onClick={onSeeAll} className="home-section-link">
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
                        const formattedDate = formatScanDate(scanTimestamp, label('common.dateLocale', 'en-MY'));

                        return (
                            <div
                                key={scan.id}
                                className="superapp-activity-card"
                                onClick={() => onScanClick(scan.id)}
                            >
                                <div className="superapp-activity-img-wrapper home-scan-card-media">
                                    {imageSrc ? (
                                        <img
                                            src={imageSrc}
                                            alt={scan.disease}
                                            className="superapp-activity-img"
                                        />
                                    ) : (
                                        <div className="home-scan-card-fallback" aria-hidden="true">
                                            <Leaf size={24} />
                                        </div>
                                    )}
                                </div>
                                <div className="superapp-activity-info">
                                    <h4 className="scan-disease home-scan-card-title">
                                        {scan.disease}
                                    </h4>
                                    <p className="scan-meta home-scan-card-meta">
                                        {resolveCategoryLabel(scan, t)}
                                        {formattedDate && (
                                            <>
                                                <span className="home-scan-card-separator">•</span>
                                                {formattedDate}
                                            </>
                                        )}
                                    </p>
                                    <div className="scan-badge-row mt-xs home-scan-card-badges">
                                        <div className={`status-badge-mini ${healthy ? 'status-healthy' : 'status-unhealthy'} home-scan-status-badge`}>
                                            <span className="status-icon home-scan-status-icon">
                                                {healthy
                                                    ? <CheckCircle size={8} strokeWidth={3} />
                                                    : <AlertTriangle size={8} strokeWidth={3} />}
                                            </span>
                                            <span className="status-text">{t(`results.${standardizedStatus}`)}</span>
                                        </div>
                                    </div>
                                    {locationLabel && (
                                        <p className="scan-location home-scan-card-location">
                                            <MapPin size={12} />
                                            <span>{locationLabel}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="app-empty-state home-recent-empty">
                        <span>{t('home.noRecentScans')}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentScans;
