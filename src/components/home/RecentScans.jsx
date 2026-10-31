import StatusBadge from '../StatusBadge.jsx';
import { assessScanDecision } from '../../../shared/scanResultPolicy.js';
import { getDiagnosisStatusLabel } from '../../utils/diagnosisStatusLabels.js';
import React from 'react';
import { MapPin, Leaf, Camera } from 'lucide-react';
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

const RecentScans = ({ scans, onSeeAll, onScanClick, onScan }) => {
    const { t, label: labelFn } = useLanguage();
    const label = (key, fallback) => (typeof labelFn === 'function' ? labelFn(key, fallback) : fallback);
    const scanList = Array.isArray(scans) ? scans : null;
    const isLoading = scanList === null;
    const hasScans = Boolean(scanList && scanList.length > 0);

    return (
        <div className="home-recent-scans slide-up">
            <div className="section-header-row home-section-header-row">
                <h3 className="section-title home-section-title">
                    {label('home.recentChecks', 'Recent plant checks')}
                </h3>
                {hasScans && (
                    <button type="button" onClick={onSeeAll} className="home-section-link">
                        {t('home.seeAll')}
                    </button>
                )}
            </div>
            <div className={`superapp-shelf-container ${hasScans || isLoading ? 'home-recent-grid' : ''}`}>
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
                        const decision = assessScanDecision(scan);
                        const healthy = standardizedStatus === 'healthy';
                        const imageSrc = scan.image || scan.image_url || scan.leafImage || scan.leaf_image_url || '';
                        const scanTimestamp = scan.timestamp || scan.created_at;
                        const locationLabel = resolveLocationLabel(scan, t);
                        const formattedDate = formatScanDate(scanTimestamp, label('common.dateLocale', 'en-MY'));

                        return (
                            <button
                                key={scan.id}
                                type="button"
                                className="superapp-activity-card"
                                onClick={() => onScanClick(scan.id)}
                                aria-label={scan.disease || t('profile.recentActivity') || 'Open scan'}
                            >
                                <div className="superapp-activity-img-wrapper home-scan-card-media">
                                    {imageSrc ? (
                                        <img
                                            src={imageSrc}
                                            alt={scan.disease || t('profile.recentActivity') || 'Plant scan'}
                                            className="superapp-activity-img"
                                            loading="lazy"
                                            decoding="async"
                                            onError={(event) => { event.currentTarget.hidden = true; }}
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
                                        <StatusBadge tone={decision.needsReview ? 'review' : healthy ? 'healthy' : 'unhealthy'}>
                                            {decision.needsReview ? getDiagnosisStatusLabel(t, decision.resultState) : t(`results.${standardizedStatus}`)}
                                        </StatusBadge>
                                    </div>
                                    {locationLabel && (
                                        <p className="scan-location home-scan-card-location">
                                            <MapPin size={12} />
                                            <span>{locationLabel}</span>
                                        </p>
                                    )}
                                </div>
                            </button>
                        );
                    })
                ) : (
                    <div className="ui-empty-state home-recent-empty">
                        <Leaf size={22} aria-hidden="true" />
                        <div>
                            <p className="ui-empty-state__title">{label('home.noRecentChecks', 'No plant checks yet.')}</p>
                            <p className="ui-empty-state__text">{label('home.noRecentChecksHint', '')}</p>
                        </div>
                        {onScan && (
                            <button type="button" className="btn btn-secondary" onClick={onScan}>
                                <Camera size={18} aria-hidden="true" />
                                {label('home.checkAction', 'Upload a photo')}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentScans;
