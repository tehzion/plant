import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertTriangle,
    BarChart3,
    ExternalLink,
    MessageCircle,
    MousePointerClick,
    RefreshCcw,
    Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchAdminReviewSummary } from '../utils/adminAnalytics.js';
import LoadingSpinner from '../components/LoadingSpinner';
import './AdminReviewDashboard.css';

const formatDate = (value) => {
    if (!value) return '-';
    try {
        return new Intl.DateTimeFormat('en-MY', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
    } catch {
        return '-';
    }
};

const formatPercent = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return '-';
    return `${Math.round(number)}%`;
};

const StatCard = ({ icon: Icon, label, value, tone = 'neutral' }) => (
    <div className={`admin-stat admin-stat--${tone}`}>
        <div className="admin-stat-icon">
            <Icon size={20} />
        </div>
        <div>
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    </div>
);

const EmptyState = ({ children }) => (
    <div className="admin-empty">{children}</div>
);

const AdminReviewDashboard = () => {
    const { user } = useAuth();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [windowDays, setWindowDays] = useState(30);

    const loadSummary = async () => {
        if (!user) return;
        setLoading(true);
        setError('');
        try {
            const data = await fetchAdminReviewSummary({ days: windowDays, limit: 30 });
            setSummary(data);
        } catch (err) {
            setSummary(null);
            setError(err.message || 'Could not load admin analytics.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, windowDays]);

    const counts = summary?.counts || {};
    const conversionRate = useMemo(() => {
        const scanCount = Number(counts.recentScans || 0);
        const leadCount = Number(counts.consultationLeads || 0);
        if (!scanCount) return '-';
        return `${Math.round((leadCount / scanCount) * 100)}%`;
    }, [counts.consultationLeads, counts.recentScans]);

    if (user === undefined) {
        return (
            <div className="admin-page admin-page--center">
                <LoadingSpinner />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="admin-page admin-page--center">
                <div className="admin-access-card">
                    <AlertTriangle size={28} />
                    <h1>Admin sign-in required</h1>
                    <p>Sign in with an approved team account to view scan reviews and lead analytics.</p>
                    <Link to="/profile" className="admin-primary-link">Go to sign in</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <header className="admin-header">
                <div>
                    <span className="admin-eyebrow">KANB team</span>
                    <h1>Review Dashboard</h1>
                    <p>Track scan quality, consultation leads, product interest, and checkout intent.</p>
                </div>
                <div className="admin-header-actions">
                    <select
                        value={windowDays}
                        onChange={(event) => setWindowDays(Number(event.target.value))}
                        aria-label="Analytics window"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                    <button type="button" onClick={loadSummary} disabled={loading}>
                        <RefreshCcw size={16} />
                        <span>Refresh</span>
                    </button>
                </div>
            </header>

            {error && (
                <div className="admin-error">
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {loading && !summary ? (
                <div className="admin-loading">
                    <LoadingSpinner />
                </div>
            ) : (
                <>
                    <section className="admin-stats-grid">
                        <StatCard icon={Search} label="Recent scans" value={counts.recentScans || 0} />
                        <StatCard icon={AlertTriangle} label="Need review" value={counts.uncertainScans || 0} tone="warning" />
                        <StatCard icon={MessageCircle} label="Consultation leads" value={counts.consultationLeads || 0} tone="success" />
                        <StatCard icon={MousePointerClick} label="Product clicks" value={counts.productClicks || 0} />
                        <StatCard icon={ExternalLink} label="Checkout intent" value={counts.checkoutClicks || 0} />
                        <StatCard icon={BarChart3} label="Lead conversion" value={conversionRate} tone="success" />
                    </section>

                    <section className="admin-grid">
                        <div className="admin-panel admin-panel--wide">
                            <div className="admin-panel-header">
                                <h2>Scans Needing Review</h2>
                                <span>{summary?.uncertainScans?.length || 0}</span>
                            </div>
                            {summary?.uncertainScans?.length ? (
                                <div className="admin-table-wrap">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Scan</th>
                                                <th>Crop</th>
                                                <th>Disease</th>
                                                <th>Confidence</th>
                                                <th>Status</th>
                                                <th>Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summary.uncertainScans.map((scan) => (
                                                <tr key={scan.id}>
                                                    <td><Link to={`/results/${scan.id}`}>{scan.id}</Link></td>
                                                    <td>{scan.crop}</td>
                                                    <td>{scan.disease}</td>
                                                    <td>{formatPercent(scan.confidence)}</td>
                                                    <td><span className="admin-status-pill">{scan.status || 'review'}</span></td>
                                                    <td>{formatDate(scan.createdAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState>No uncertain scans in this window.</EmptyState>
                            )}
                        </div>

                        <div className="admin-panel">
                            <div className="admin-panel-header">
                                <h2>Consultation Leads</h2>
                                <span>{summary?.recentLeads?.length || 0}</span>
                            </div>
                            {summary?.recentLeads?.length ? (
                                <div className="admin-list">
                                    {summary.recentLeads.map((lead) => (
                                        <div className="admin-list-item" key={lead.id}>
                                            <strong>{lead.crop} · {lead.disease}</strong>
                                            <span>{lead.recommendationIntent || 'consultation'} · {formatDate(lead.createdAt)}</span>
                                            {lead.scanId && <Link to={`/results/${lead.scanId}`}>Open scan</Link>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState>No consultation leads yet.</EmptyState>
                            )}
                        </div>

                        <div className="admin-panel">
                            <div className="admin-panel-header">
                                <h2>Top Products</h2>
                            </div>
                            {summary?.topProducts?.length ? (
                                <div className="admin-rank-list">
                                    {summary.topProducts.map((item) => (
                                        <div className="admin-rank-row" key={item.name}>
                                            <span>{item.name}</span>
                                            <strong>{item.count}</strong>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState>No product clicks yet.</EmptyState>
                            )}
                        </div>

                        <div className="admin-panel">
                            <div className="admin-panel-header">
                                <h2>Common Issues</h2>
                            </div>
                            {summary?.commonDiseases?.length ? (
                                <div className="admin-rank-list">
                                    {summary.commonDiseases.map((item) => (
                                        <div className="admin-rank-row" key={item.name}>
                                            <span>{item.name}</span>
                                            <strong>{item.count}</strong>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState>No issue data yet.</EmptyState>
                            )}
                        </div>

                        <div className="admin-panel admin-panel--wide">
                            <div className="admin-panel-header">
                                <h2>Recent Product Activity</h2>
                                <span>{summary?.recentProductEvents?.length || 0}</span>
                            </div>
                            {summary?.recentProductEvents?.length ? (
                                <div className="admin-table-wrap">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Event</th>
                                                <th>Product</th>
                                                <th>Crop</th>
                                                <th>Disease</th>
                                                <th>Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summary.recentProductEvents.map((event) => (
                                                <tr key={event.id}>
                                                    <td><span className="admin-status-pill">{event.eventType}</span></td>
                                                    <td>{event.productName}</td>
                                                    <td>{event.crop}</td>
                                                    <td>{event.disease}</td>
                                                    <td>{formatDate(event.createdAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState>No product activity yet.</EmptyState>
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default AdminReviewDashboard;
