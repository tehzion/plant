import { useState, useEffect } from 'react';
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

const History = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { state: scanState } = useScanContext();
    const { user } = useAuth();
    const { notifySuccess } = useNotifications();
    const [groupedScans, setGroupedScans] = useState({ today: [], yesterday: [], thisWeek: [], lastWeek: [], older: [] });
    const [pendingAction, setPendingAction] = useState(null);

    const refreshHistory = async () => {
        const grouped = await getGroupedScans(user?.id ?? null);
        setGroupedScans(grouped);
    };
    // Initial load + refresh when user or scan state changes
    useEffect(() => {
        refreshHistory();
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

    const hasScans = Object.values(groupedScans).some(group => group.length > 0);

    return (
        <div className="page history-page">
            <div className="container">
                {/* Header */}
                <div className="history-header">
                    <div className="header-title-row">
                        <span className="history-icon app-icon-badge">
                            <HistoryIcon size={22} className="header-icon" />
                        </span>
                        <div className="history-title-copy">
                            <h2 className="page-title">{t('history.scanHistory')}</h2>
                            <p className="history-subtitle">{t('history.noHistoryMessage')}</p>
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
                {!hasScans ? (
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
                            <div className="history-group">
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
                            </div>
                        )}

                        {/* Yesterday */}
                        {groupedScans.yesterday && groupedScans.yesterday.length > 0 && (
                            <div className="history-group">
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
                            </div>
                        )}

                        {/* This Week */}
                        {groupedScans.thisWeek && groupedScans.thisWeek.length > 0 && (
                            <div className="history-group">
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
                            </div>
                        )}

                        {/* Last Week */}
                        {groupedScans.lastWeek && groupedScans.lastWeek.length > 0 && (
                            <div className="history-group">
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
                            </div>
                        )}

                        {/* Older */}
                        {groupedScans.older && groupedScans.older.length > 0 && (
                            <div className="history-group">
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
                            </div>
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
