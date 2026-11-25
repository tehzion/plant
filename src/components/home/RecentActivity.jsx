import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';
import { useAuth } from '../../context/AuthContext';
import { getDailyNotes, getLogbook, getPlots } from '../../utils/localStorage';
import { buildFarmTimeline } from '../../utils/farmTimeline.js';

const KIND_LABELS = { log: ['assessment.ux.eventLog', 'myGAP record'], note: ['assessment.ux.eventNote', 'Daily note'] };

// The latest few logbook entries and field notes, so the dashboard shows what
// was done on the farm and not only what the camera saw.
const RecentActivity = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const label = (key, fallback) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    };
    const dateLocale = language === 'ms' ? 'ms-MY' : language === 'zh' ? 'zh-MY' : 'en-MY';
    const [records, setRecords] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const userId = user?.id ?? null;
        Promise.all([
            Promise.resolve(getLogbook(userId, { limit: 20 })).catch(() => []),
            Promise.resolve(getDailyNotes(userId, { limit: 20 })).catch(() => []),
            Promise.resolve(getPlots(userId)).catch(() => []),
        ]).then(([logs, notes, plots]) => {
            if (!cancelled) setRecords({ logs: logs || [], notes: notes || [], plots: plots || [] });
        });
        return () => { cancelled = true; };
    }, [user?.id]);

    const events = useMemo(() => {
        if (!records) return [];
        return buildFarmTimeline(records)
            .flatMap((group) => group.events.map((event) => ({ ...event, plotName: group.name })))
            .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
            .slice(0, 4);
    }, [records]);

    if (records === null) return null;

    return (
        <section className="home-activity" aria-labelledby="home-activity-title">
            <div className="section-header-row home-section-header-row">
                <h3 id="home-activity-title" className="section-title home-section-title">
                    {label('home.recentActivityTitle', 'Recent farm activity')}
                </h3>
                {events.length > 0 && (
                    <Link to="/profile" className="home-section-link">{label('home.openFarm', 'Open My farm')}</Link>
                )}
            </div>
            {events.length ? (
                <ul className="home-activity__list">
                    {events.map((event) => {
                        const [key, fallback] = KIND_LABELS[event.kind] || KIND_LABELS.note;
                        const title = event.kind === 'log'
                            ? label(`mygap.${event.title}Log`, event.title)
                            : event.title;
                        return (
                            <li key={event.id} className="home-activity__item">
                                <span className="home-activity__date">
                                    {new Date(event.at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
                                </span>
                                <span className="home-activity__body">
                                    <span className="home-activity__title">{title || label(key, fallback)}</span>
                                    {(event.detail || event.plotName) && (
                                        <span className="home-activity__detail">
                                            {[event.plotName, event.detail].filter(Boolean).join(' · ')}
                                        </span>
                                    )}
                                </span>
                                <span className="home-activity__kind">{label(key, fallback)}</span>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="ui-empty-state">
                    <ClipboardList size={22} aria-hidden="true" />
                    <div>
                        <p className="ui-empty-state__title">{label('home.noActivity', 'No farm activity recorded yet.')}</p>
                        <p className="ui-empty-state__text">{label('home.noActivityHint', '')}</p>
                    </div>
                    <Link to="/mygap?tab=logbook" className="btn btn-secondary">{label('home.addActivity', 'Record an activity')}</Link>
                </div>
            )}
        </section>
    );
};

export default RecentActivity;
