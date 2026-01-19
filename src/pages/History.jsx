import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroupedScans, deleteScan, clearAllScans, getScanHistory } from '../utils/localStorage';
import ScanHistoryCard from '../components/ScanHistoryCard';
import { useLanguage } from '../i18n/i18n.jsx';
import { ClipboardList, ScanLine, Trash2, History as HistoryIcon } from 'lucide-react';

const History = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [groupedScans, setGroupedScans] = useState(getGroupedScans());

    const handleDelete = (id) => {
        if (window.confirm(t('history.confirmDeleteSingle') || 'Delete this scan?')) {
            deleteScan(id);
            setGroupedScans(getGroupedScans());
        }
    };

    const handleClearAll = () => {
        if (window.confirm(t('history.clearConfirm'))) {
            clearAllScans();
            setGroupedScans(getGroupedScans());
        }
    };

    const hasScans = Object.values(groupedScans).some(group => group.length > 0);

    return (
        <div className="page history-page">
            <div className="container">
                {/* Header */}
                <div className="history-header">
                    <div className="header-title-row">
                        <HistoryIcon size={28} className="header-icon" />
                        <h2 className="page-title">{t('history.scanHistory')}</h2>
                    </div>
                    {hasScans && (
                        <button onClick={handleClearAll} className="clear-btn">
                            <Trash2 size={16} />
                            {t('history.clearAll')}
                        </button>
                    )}
                </div>

                {/* Empty State */}
                {!hasScans ? (
                    <div className="empty-state">
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
                        {groupedScans.Today.length > 0 && (
                            <div className="history-group">
                                <h3 className="group-title">{t('history.today')}</h3>
                                {groupedScans.Today.map(scan => (
                                    <ScanHistoryCard
                                        key={scan.id}
                                        scan={scan}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Yesterday */}
                        {groupedScans.Yesterday.length > 0 && (
                            <div className="history-group">
                                <h3 className="group-title">{t('history.yesterday')}</h3>
                                {groupedScans.Yesterday.map(scan => (
                                    <ScanHistoryCard
                                        key={scan.id}
                                        scan={scan}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        )}

                        {/* This Week */}
                        {groupedScans['This Week'].length > 0 && (
                            <div className="history-group">
                                <h3 className="group-title">{t('history.thisWeek')}</h3>
                                {groupedScans['This Week'].map(scan => (
                                    <ScanHistoryCard
                                        key={scan.id}
                                        scan={scan}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Older */}
                        {groupedScans.Older.length > 0 && (
                            <div className="history-group">
                                <h3 className="group-title">{t('history.older')}</h3>
                                {groupedScans.Older.map(scan => (
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

            <style>{`
                .history-page {
                    background-color: #F9FAFB;
                    min-height: 100vh;
                }

                .history-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 32px;
                    padding-top: 24px;
                }

                .header-title-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .header-icon {
                    color: var(--color-primary);
                }

                .page-title {
                    font-size: 1.75rem;
                    color: #1F2937;
                    margin: 0;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                }

                .clear-btn {
                    background: none;
                    border: 1px solid #FECACA; /* Light red border */
                    color: #EF4444;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 8px 16px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s ease;
                }

                .clear-btn:hover {
                    background: #FEF2F2;
                    border-color: #FCA5A5;
                }

                .export-btn {
                    background: none;
                    border: 1px solid #BFDBFE; /* Light blue border */
                    color: #2563EB;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 8px 16px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s ease;
                }

                .export-btn:hover {
                    background: #EFF6FF;
                    border-color: #93C5FD;
                }

                .empty-state {
                    text-align: center;
                    padding: 64px 24px;
                    background: white;
                    border-radius: 24px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.02);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-top: 24px;
                }

                .empty-icon-wrapper {
                    width: 120px;
                    height: 120px;
                    background: #F3F4F6;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 24px;
                    color: #9CA3AF;
                }

                .empty-icon {
                    opacity: 0.8;
                }

                .empty-state h3 {
                    font-size: 1.5rem;
                    color: #374151;
                    margin-bottom: 8px;
                    font-weight: 700;
                }

                .empty-state p {
                    color: #6B7280;
                    font-size: 1rem;
                    margin-bottom: 32px;
                    max-width: 400px;
                }

                .scan-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 14px 28px;
                    font-size: 1rem;
                    border-radius: 16px;
                }

                .history-content {
                    padding-bottom: 48px;
                }

                .history-group {
                    margin-bottom: 32px;
                }

                .group-title {
                    font-size: 1.1rem;
                    color: #6B7280; /* Secondary text color for headers */
                    margin-bottom: 16px;
                    padding-left: 4px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                @media (max-width: 768px) {
                    /* History Header */
                    .history-header {
                        padding-top: 16px;    /* Reduced from 24px */
                        margin-bottom: 20px;  /* Reduced from 32px */
                    }
                    
                    /* Page Title */
                    .page-title {
                        font-size: 1.4rem;    /* Reduced from 1.5rem */
                    }
                    
                    .header-icon {
                        width: 24px;          /* Reduced from 28px */
                        height: 24px;
                    }
                    
                    .clear-btn {
                        font-size: 0.85rem;   /* Reduced from 0.9rem */
                        padding: 8px 14px;    /* Reduced from 8px 16px */
                    }
                    
                    .group-title {
                        font-size: 0.85rem;   /* Reduced from 0.9rem */
                        margin-bottom: 12px;  /* Reduced from 16px */
                    }
                    
                    .history-group {
                        margin-bottom: 24px;  /* Reduced from 32px */
                    }
                    
                    .empty-icon-wrapper {
                        width: 100px;         /* Reduced from 120px */
                        height: 100px;
                        margin-bottom: 20px;  /* Reduced from 24px */
                    }
                    
                    .empty-icon {
                        width: 56px;          /* Reduced from 64px */
                        height: 56px;
                    }
                    
                    .empty-state h3 {
                        font-size: 1.3rem;    /* Reduced from 1.5rem */
                    }
                    
                    .empty-state p {
                        font-size: 0.9rem;    /* Reduced from 1rem */
                    }
                    
                    .scan-btn {
                        padding: 12px 24px;   /* Reduced from 14px 28px */
                        font-size: 0.95rem;   /* Reduced from 1rem */
                    }
                }
            `}</style>
        </div>
    );
};

export default History;
