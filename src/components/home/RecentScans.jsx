import React from 'react';
import { AlertTriangle, CheckCircle, MapPin, Leaf } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';
import { getStandardizedStatus } from '../../utils/statusUtils';

const resolveCategoryLabel = (scan, t) => {
    const rawPlantType = scan?.plantType;
    const plantType = typeof rawPlantType === 'string'
        ? rawPlantType
        : (rawPlantType ? String(rawPlantType) : '');

    if (!plantType) return '';

    const key = `home.category${plantType.charAt(0).toUpperCase()}${plantType.slice(1).toLowerCase()}`;
    const translated = t(key);
    const finalName = translated.includes('home.category') ? plantType : translated;
    return finalName.toUpperCase();
};

const resolveLocationLabel = (scan, t) => {
    const rawLocationName = scan?.locationName;
    const locationName = typeof rawLocationName === 'string'
        ? rawLocationName
        : (rawLocationName ? String(rawLocationName) : '');

    if (!locationName) return '';
    if (locationName.startsWith('common.')) return t(locationName);

    const translationKey = `common.${locationName}`;
    const translated = t(translationKey);
    return translated && translated !== translationKey ? translated : locationName;
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
    const scanList = Array.isArray(scans) ? scans : null;
    const isLoading = scanList === null;
    const hasScans = Boolean(scanList && scanList.length > 0);

    return (
        <div className="home-recent-scans slide-up">
            <div className="section-header-row home-section-header-row">
                <h3 className="section-title home-section-title">
                    {t('profile.recentActivity') || 'Recent Scans'}
                </h3>
                <button onClick={onSeeAll} className="home-section-link">
                    {t('home.seeAll')}
                </button>
            </div>
            <div className="superapp-shelf-container">
                {isLoading ? (
                    Array.from({ length: 3 }, (_, index) => (
                        <div key={index} className="superapp-activity-card home-recent-skeleton-card" aria-hidden="true">
                            <div className="superapp-activity-img-wrapper home-skeleton-scan-media home-recent-skeleton-media" />
                            <div className="superapp-activity-info home-recent-skeleton-body">
                                <div className="home-skeleton-line home-skeleton-line-card-title" />
                                <div className="home-skeleton-line home-skeleton-line-card-meta" />
                                <div className="home-recent-skeleton-chip-row">
                                    <div className="home-skeleton-chip" />
                                    <div className="home-skeleton-chip home-skeleton-chip-small" />
                                </div>
                                <div className="home-skeleton-line home-skeleton-line-card-location" />
                            </div>
                        </div>
                    ))
                ) : hasScans ? (
                    scanList.map((scan) => {
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
                                                <span className="home-scan-card-separator">&bull;</span>
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
