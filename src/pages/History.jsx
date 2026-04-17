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
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { state: scanState } = useScanContext();
    const { user } = useAuth();
    const { notifySuccess } = useNotifications();
    const [groupedScans, setGroupedScans] = useState({ today: [], yesterday: [], thisWeek: [], lastWeek: [], older: [] });
    const [pendingAction, setPendingAction] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyLoadedOnce, setHistoryLoadedOnce] = useState(false);

    const refreshHistory = async ({ showSkeleton = false } = {}) => {
        if (showSkeleton) {
            setHistoryLoading(true);
        }
        try {
            const grouped = await getGroupedScans(user?.id ?? null);
            setGroupedScans(grouped);
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
                                        ? 'Review recent scans, revisit diagnoses, and keep your field timeline organized.'
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

                {/* Empty State */}
                {showSkeleton ? (
                    <HistorySkeleton />
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
                    <div className="history-content">
                        {/* Today */}
                        {groupedScans.today && groupedScans.today.length > 0 && (
                            <section className="history-group app-surface app-surface--soft">
                                <div className="group-title-row">
                                    <h3 className="group-title">{t('history.today')}</h3>
                                    <span className="app-pill">{groupedScans.today.length}</span>
                                </div>
                                {groupedScans.today.map(scan => (
                                    <ScanHistoryCard
                                        key={scan.id}
                                        scan={scan}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </section>
                        )}

                        {/* Yesterday */}
                        {groupedScans.yesterday && groupedScans.yesterday.length > 0 && (
                            <section className="history-group app-surface app-surface--soft">
                                <div className="group-title-row">
                                    <h3 className="group-title">{t('history.yesterday')}</h3>
                                    <span className="app-pill">{groupedScans.yesterday.length}</span>
                                </div>
                                {groupedScans.yesterday.map(scan => (
                                    <ScanHistoryCard
                                        key={scan.id}
                                        scan={scan}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </section>
                        )}

                        {/* This Week */}
                        {groupedScans.thisWeek && groupedScans.thisWeek.length > 0 && (
                            <section className="history-group app-surface app-surface--soft">
                                <div className="group-title-row">
                                    <h3 className="group-title">{t('history.thisWeek')}</h3>
                                    <span className="app-pill">{groupedScans.thisWeek.length}</span>
                                </div>
                                {groupedScans.thisWeek.map(scan => (
                                    <ScanHistoryCard
                                        key={scan.id}
                                        scan={scan}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </section>
                        )}

                        {/* Last Week */}
                        {groupedScans.lastWeek && groupedScans.lastWeek.length > 0 && (
                            <section className="history-group app-surface app-surface--soft">
                                <div className="group-title-row">
                                    <h3 className="group-title">{t('history.lastWeek')}</h3>
                                    <span className="app-pill">{groupedScans.lastWeek.length}</span>
                                </div>
                                {groupedScans.lastWeek.map(scan => (
                                    <ScanHistoryCard
                                        key={scan.id}
                                        scan={scan}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </section>
                        )}

                        {/* Older */}
                        {groupedScans.older && groupedScans.older.length > 0 && (
                            <section className="history-group app-surface app-surface--soft">
                                <div className="group-title-row">
                                    <h3 className="group-title">{t('history.older')}</h3>
                                    <span className="app-pill">{groupedScans.older.length}</span>
                                </div>
                                {groupedScans.older.map(scan => (
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
