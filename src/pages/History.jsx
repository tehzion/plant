import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroupedScans, deleteScan, clearAllScans } from '../utils/localStorage';
import ScanHistoryCard from '../components/ScanHistoryCard';
import CustomModal from '../components/CustomModal';
import { useLanguage } from '../i18n/i18n.jsx';
import { useScanContext } from '../context/ScanContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationProvider.jsx';
import { ClipboardList, ScanLine, Trash2, History as HistoryIcon } from 'lucide-react';
import './History.css';
import { getUiCopy, isFollowUpDue } from '../utils/uiCopy.js';
import { assessScanDecision } from '../../shared/scanResultPolicy.js';
import { getStandardizedStatus } from '../utils/statusUtils.js';

const HistorySkeleton = () => {
    const skeletonCards = Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="scan-history-card history-skeleton-card" aria-hidden="true">
            <div className="card-content">
                <div className="scan-thumbnail-shell">
                    <div className="scan-thumbnail history-skeleton-block history-skeleton-thumb" />
                </div>
                <div className="scan-info">
                    <div className="history-skeleton-line history-skeleton-line--title" />
                    <div className="history-skeleton-line history-skeleton-line--meta" />
                    <div className="history-skeleton-line history-skeleton-line--metaShort" />
                    <div className="scan-badge-row">
                        <div className="history-skeleton-pill" />
                        <div className="history-skeleton-pill history-skeleton-pill--small" />
                    </div>
                </div>
                <div className="history-skeleton-circle" />
            </div>
        </div>
    ));

    return (
        <div className="history-content">
            <section className="history-group app-surface app-surface--soft history-group--skeleton" aria-hidden="true">
                <div className="group-title-row">
                    <div className="history-skeleton-line history-skeleton-line--groupTitle" />
                    <div className="history-skeleton-pill history-skeleton-pill--count" />
                </div>
                {skeletonCards}
            </section>
            <section className="history-group app-surface app-surface--soft history-group--skeleton" aria-hidden="true">
                <div className="group-title-row">
                    <div className="history-skeleton-line history-skeleton-line--groupTitle" />
                    <div className="history-skeleton-pill history-skeleton-pill--count" />
                </div>
                {skeletonCards}
            </section>
        </div>
    );
};

const History = () => {
    const { t, language } = useLanguage();
    const copy = getUiCopy(language);
    const [filters, setFilters] = useState({ search: '', crop: '', status: '', date: '', sort: 'newest' });
    const navigate = useNavigate();
    const { state: scanState } = useScanContext();
    const { user } = useAuth();
    const { notifySuccess } = useNotifications();
    const [groupedScans, setGroupedScans] = useState({ today: [], yesterday: [], thisWeek: [], lastWeek: [], older: [] });
    const [pendingAction, setPendingAction] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyLoadedOnce, setHistoryLoadedOnce] = useState(false);
    const [historyError, setHistoryError] = useState(null);

    const refreshHistory = async ({ showSkeleton = false } = {}) => {
        if (showSkeleton) {
            setHistoryLoading(true);
        }
        try {
            setHistoryError(null);
            const grouped = await getGroupedScans(user?.id ?? null);
            setGroupedScans(grouped);
        } catch (error) {
            setHistoryError(error);
        } finally {
            setHistoryLoading(false);
            setHistoryLoadedOnce(true);
        }
    };
    // Initial load + refresh when user or scan state changes
    useEffect(() => {
        refreshHistory({ showSkeleton: true });
    }, [user?.id]);

    // Auto-refresh when background scan completes
    useEffect(() => {
        if (!scanState.loading) {
            refreshHistory();
        }
    }, [scanState.loading]);

    const handleDelete = async (id) => {
        setPendingAction({ type: 'delete', id });
    };

    const handleClearAll = async () => {
        setPendingAction({ type: 'clear-all' });
    };

    const closePendingAction = () => setPendingAction(null);

    const confirmPendingAction = async () => {
        if (!pendingAction) return;

        if (pendingAction.type === 'delete') {
            await deleteScan(pendingAction.id, user?.id ?? null);
            notifySuccess(t('history.scanDeleted') || 'Scan deleted.');
        } else if (pendingAction.type === 'clear-all') {
            await clearAllScans(user?.id ?? null);
            notifySuccess(t('history.scanHistoryCleared') || 'Scan history cleared.');
        }

        closePendingAction();
        refreshHistory();
    };

    const hasScans = useMemo(() => Object.values(groupedScans).some(group => group.length > 0), [groupedScans]);
    const showSkeleton = historyLoading && !historyLoadedOnce;
    const scans = Object.values(groupedScans).flat();
    const crops = [...new Set(scans.map(scan => scan.plantType).filter(Boolean))].sort();
    const filteredGroups = Object.fromEntries(Object.entries(groupedScans).map(([key, group]) => [key, group.filter(scan => {
        const stamp = new Date(scan.timestamp || scan.created_at).getTime();
        const days = filters.date === 'week' ? 7 : filters.date === 'month' ? 30 : 0;
        return (!filters.search || `${scan.disease || ''} ${scan.plantType || ''} ${scan.locationName || ''}`.toLowerCase().includes(filters.search.toLowerCase()))
            && (!filters.crop || scan.plantType === filters.crop)
            && (!filters.status || (filters.status === 'due' ? isFollowUpDue(scan) : (filters.status === 'review' ? assessScanDecision(scan).needsReview : !assessScanDecision(scan).needsReview && getStandardizedStatus(scan) === filters.status)))
            && (!days || (Number.isFinite(stamp) && stamp <= Date.now() && stamp >= Date.now() - days * 86400000));
    }).sort((a,b) => (new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime()) * (filters.sort === 'oldest' ? -1 : 1))]));
    const visibleCount = Object.values(filteredGroups).flat().length;
    const changeFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }));


    return (
        <div className="page history-page">
            <div className="container-superapp history-shell">
                {/* Header */}
                <div className="history-header">
                    <div className="header-title-row">
                        <span className="history-icon app-icon-badge">
                            <HistoryIcon size={22} className="header-icon" />
                        </span>
                        <div className="history-title-copy">
                            <h2 className="history-page-title">{t('history.scanHistory')}</h2>
                            <p className="history-page-subtitle">
                                {hasScans
                                    ? (t('history.reviewScansHint') === 'history.reviewScansHint'
                                        ? copy.historyHint
                                        : t('history.reviewScansHint'))
                                    : t('history.noHistoryMessage')}
                            </p>
                        </div>
                    </div>
                    {hasScans && (
                        <button onClick={handleClearAll} className="clear-btn app-pill">
                            <Trash2 size={16} />
                            {t('history.clearAll')}
                        </button>
                    )}
                </div>

                {hasScans && <section className="history-filters app-surface">
                    <label>{copy.search}<input type="search" value={filters.search} onChange={e => changeFilter('search', e.target.value)} /></label>
                    <label>{copy.crop}<select value={filters.crop} onChange={e => changeFilter('crop', e.target.value)}><option value="">{copy.all}</option>{crops.map(crop => <option key={crop}>{crop}</option>)}</select></label>
                    <label>{copy.status}<select value={filters.status} onChange={e => changeFilter('status', e.target.value)}><option value="">{copy.all}</option>{['healthy','unhealthy'].map(status => <option key={status} value={status}>{t(`results.${status}`)}</option>)}<option value="review">{copy.inspect}</option><option value="due">{copy.due}</option></select></label>
                    <label>{copy.date}<select value={filters.date} onChange={e => changeFilter('date', e.target.value)}><option value="">{copy.all}</option><option value="week">{copy.week}</option><option value="month">{copy.month}</option></select></label>
                    <label>{copy.sort}<select value={filters.sort} onChange={e => changeFilter('sort', e.target.value)}><option value="newest">{copy.newest}</option><option value="oldest">{copy.oldest}</option></select></label>
                    <button className="btn btn-secondary" onClick={() => setFilters({search:'',crop:'',status:'',date:'',sort:'newest'})}>{copy.reset}</button>
                    <p role="status" aria-live="polite">{visibleCount} / {scans.length}</p>
                </section>}
                {/* Empty State */}
                {showSkeleton ? (
                    <HistorySkeleton />
                ) : historyError ? (
                    <div role="alert" className="empty-state app-surface">
                        <p>{t('profile.dataLoadFailed')}</p>
                        <button type="button" onClick={() => refreshHistory({ showSkeleton: true })}>{t('common.retry')}</button>
                    </div>
                ) : !hasScans ? (
                    <div className="empty-state app-surface app-empty-state">
                        <div className="empty-icon-wrapper">
                            <ClipboardList size={64} className="empty-icon" />
                        </div>
                        <h3>{t('history.noHistory')}</h3>
                        <p>{t('history.noHistoryMessage')}</p>
                        <button
                            onClick={() => navigate('/?scan=true')}
                            className="btn btn-primary mt-lg scan-btn"
                        >
                            <ScanLine size={20} />
                            {t('history.scanFirstPlant')}
                        </button>
                    </div>
                ) : (
                    <div className={`history-content ${filters.sort === 'oldest' ? 'history-content--oldest' : ''}`}>
                        {visibleCount === 0 && <p className="app-empty-state">{copy.none}</p>}
                        {/* Today */}
                        {filteredGroups.today && filteredGroups.today.length > 0 && (
                            <section className="history-group app-surface app-surface--soft">
                                <div className="group-title-row">
                                    <h3 className="group-title">{t('history.today')}</h3>
                                    <span className="app-pill">{filteredGroups.today.length}</span>
                                </div>
                                {filteredGroups.today.map(scan => (
                                    <ScanHistoryCard
                                        key={scan.id}
                                        scan={scan}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </section>
                        )}

                        {/* Yesterday */}
                        {filteredGroups.yesterday && filteredGroups.yesterday.length > 0 && (
                            <section className="history-group app-surface app-surface--soft">
                                <div className="group-title-row">
                                    <h3 className="group-title">{t('history.yesterday')}</h3>
                                    <span className="app-pill">{filteredGroups.yesterday.length}</span>
                                </div>
                                {filteredGroups.yesterday.map(scan => (
                                    <ScanHistoryCard
                                        key={scan.id}
                                        scan={scan}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </section>
                        )}

                        {/* This Week */}
                        {filteredGroups.thisWeek && filteredGroups.thisWeek.length > 0 && (
                            <section className="history-group app-surface app-surface--soft">
                                <div className="group-title-row">
                                    <h3 className="group-title">{t('history.thisWeek')}</h3>
                                    <span className="app-pill">{filteredGroups.thisWeek.length}</span>
                                </div>
                                {filteredGroups.thisWeek.map(scan => (
                                    <ScanHistoryCard
                                        key={scan.id}
                                        scan={scan}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </section>
                        )}

                        {/* Last Week */}
                        {filteredGroups.lastWeek && filteredGroups.lastWeek.length > 0 && (
                            <section className="history-group app-surface app-surface--soft">
                                <div className="group-title-row">
                                    <h3 className="group-title">{t('history.lastWeek')}</h3>
                                    <span className="app-pill">{filteredGroups.lastWeek.length}</span>
                                </div>
                                {filteredGroups.lastWeek.map(scan => (
                                    <ScanHistoryCard
                                        key={scan.id}
                                        scan={scan}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </section>
                        )}

                        {/* Older */}
                        {filteredGroups.older && filteredGroups.older.length > 0 && (
                            <section className="history-group app-surface app-surface--soft">
                                <div className="group-title-row">
                                    <h3 className="group-title">{t('history.older')}</h3>
                                    <span className="app-pill">{filteredGroups.older.length}</span>
                                </div>
                                {filteredGroups.older.map(scan => (
                                    <ScanHistoryCard
                                        key={scan.id}
                                        scan={scan}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </section>
                        )}
                    </div>
                )}
            </div>

            <CustomModal
                isOpen={Boolean(pendingAction)}
                onClose={closePendingAction}
                onConfirm={confirmPendingAction}
                type="confirm"
                title={
                    pendingAction?.type === 'clear-all'
                        ? (t('history.clearAll') || 'Clear all')
                        : (t('history.deleteScan') || t('common.delete') || 'Delete scan')
                }
                message={
                    pendingAction?.type === 'clear-all'
                        ? (t('history.clearConfirm') || 'Are you sure you want to clear all scan history?')
                        : (t('history.confirmDeleteSingle') || 'Delete this scan?')
                }
                confirmText={
                    pendingAction?.type === 'clear-all'
                        ? (t('history.clearAll') || 'Clear all')
                        : (t('common.delete') || 'Delete')
                }
                cancelText={t('common.cancel') || 'Cancel'}
            />
        </div>
    );
};

export default History;
