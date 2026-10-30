import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { useAuth } from '../context/AuthContext';
import { getDailyNotes, getLogbook, getPlots } from '../utils/localStorage';
import { buildFarmTimeline } from '../utils/farmTimeline.js';
import './FarmTimeline.css';

const KIND_LABELS = { scan: ['assessment.ux.eventScan', 'Scan'], followUp: ['assessment.ux.eventFollowUp', 'Follow-up check'], log: ['assessment.ux.eventLog', 'myGAP record'], note: ['assessment.ux.eventNote', 'Daily note'] };

// One place to see everything that happened on each plot, so a farmer (or a
// myGAP auditor) can follow a problem from scan to treatment to re-check.
const FarmTimeline = ({ scans = [] }) => {
    const { t, language } = useLanguage();
    const dateLocale = language === 'ms' ? 'ms-MY' : language === 'zh' ? 'zh-MY' : 'en-MY';
    const { user } = useAuth();
    const label = (key, fallback) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    };
    const [records, setRecords] = useState({ logs: [], notes: [], plots: [] });

    useEffect(() => {
        let cancelled = false;
        const userId = user?.id ?? null;
        Promise.all([
            Promise.resolve(getLogbook(userId, { limit: 200 })).catch(() => []),
            Promise.resolve(getDailyNotes(userId, { limit: 200 })).catch(() => []),
            Promise.resolve(getPlots(userId)).catch(() => []),
        ]).then(([logs, notes, plots]) => {
            if (!cancelled) setRecords({ logs: logs || [], notes: notes || [], plots: plots || [] });
        });
        return () => { cancelled = true; };
    }, [user?.id]);

    const groups = useMemo(() => buildFarmTimeline({ scans, ...records }), [scans, records]);

    if (!groups.length) {
        return <p className="app-empty-state farm-timeline__empty">{label('assessment.ux.timelineEmpty', 'No records yet.')}</p>;
    }

    return (
        <div className="farm-timeline">
            <p className="farm-timeline__intro">{label('assessment.ux.timelineIntro', '')}</p>
            {groups.map((group) => (
                <section key={group.plot} className="farm-timeline__plot app-surface" aria-label={group.name || label('assessment.ux.timelineNoPlot', 'No plot recorded')}>
                    <h3>{group.name || label('assessment.ux.timelineNoPlot', 'No plot recorded')}</h3>
                    <ol>
                        {group.events.slice(0, 30).map((event) => {
                            const [key, fallback] = KIND_LABELS[event.kind];
                            const body = (
                                <>
                                    <span className={`farm-timeline__kind farm-timeline__kind--${event.kind}`}>{label(key, fallback)}</span>
                                    <span className="farm-timeline__date">{new Date(event.at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    {event.title && <strong>{event.kind === 'log' ? (t(`mygap.${event.title}Log`) || event.title).split(' ')[0] : event.title}</strong>}
                                    {event.detail && <span className="farm-timeline__detail">{event.detail}</span>}
                                    {event.pending && <span className="log-sync-badge">{label('assessment.sync.savedOnDeviceShort', 'Saved on device')}</span>}
                                </>
                            );
                            return (
                                <li key={event.id} className="farm-timeline__event">
                                    {event.scanId ? <Link to={`/results/${event.scanId}`}>{body}</Link> : body}
                                </li>
                            );
                        })}
                    </ol>
                </section>
            ))}
        </div>
    );
};

export default FarmTimeline;
