import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Sprout, History as HistoryIcon, ScanLine } from 'lucide-react';
import { SCAN_PATH } from '../components/navItems.js';
import { fetchScanHistoryPage, getScanById } from '../utils/localStorage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/i18n.jsx';
import './Nutrition.css';

const Nutrition = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id: routeId } = useParams();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [hasScan, setHasScan] = useState(false);
    // A named scan that is missing is a different problem from having none yet.
    const missingNamedScan = Boolean(routeId || searchParams.get('scan'));

    useEffect(() => {
        let cancelled = false;
        const requestedId = routeId || searchParams.get('scan');

        const loadLatestScan = async () => {
            try {
                const result = requestedId
                    ? await getScanById(requestedId, user?.id ?? null)
                    : (await fetchScanHistoryPage(user?.id ?? null, { limit: 1 }))?.rows?.[0] || null;

                if (cancelled) return;
                if (result?.id) {
                    setHasScan(true);
                    navigate(`/results/${encodeURIComponent(result.id)}?tab=nutrition`, { replace: true });
                } else {
                    setHasScan(false);
                    setLoading(false);
                }
            } catch {
                if (!cancelled) {
                    setHasScan(false);
                    setLoading(false);
                }
            }
        };

        loadLatestScan();
        return () => {
            cancelled = true;
        };
    }, [navigate, routeId, searchParams, user?.id]);

    if (loading && !hasScan) {
        return <div className="nutrition-page-state" role="status">{t('common.loading')}</div>;
    }

    return (
        <main className="page nutrition-page">
            <div className="container nutrition-page-container">
                <section className="nutrition-empty-state app-surface" role="status">
                    <div className="nutrition-empty-icon"><Sprout size={30} aria-hidden="true" /></div>
                    <h1>{t('results.nutrition') || 'Nutrition'}</h1>
                    <p>{missingNamedScan ? t('history.scanNotFoundMessage') : t('history.needScanFirst')}</p>
                    {missingNamedScan ? (
                        <button type="button" className="btn btn-primary" onClick={() => navigate('/history')}>
                            <HistoryIcon size={18} aria-hidden="true" />
                            <span>{t('nav.history')}</span>
                        </button>
                    ) : (
                        <button type="button" className="btn btn-primary" onClick={() => navigate(SCAN_PATH)}>
                            <ScanLine size={18} aria-hidden="true" />
                            <span>{t('nav.checkPlant')}</span>
                        </button>
                    )}
                </section>
            </div>
        </main>
    );
};

export default Nutrition;
