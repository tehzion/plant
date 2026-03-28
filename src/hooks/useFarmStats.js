import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    getChecklistState,
    getDailyNotes,
    getLogbook,
    getPlots,
    getScanHistory,
    seedDemoData,
} from '../utils/localStorage';
import { DEMO_LOGBOOK, DEMO_NOTES, DEMO_PLOTS, DEMO_SCANS } from '../utils/demoData';
import { predictFarmRisk } from '../utils/aiFarmService';

const ACKNOWLEDGED_ALERTS_KEY = 'plant_ack_alerts';

const isWithinLastDays = (value, days) => {
    if (!value) return false;
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return false;
    return timestamp >= Date.now() - (days * 86400000);
};

const filterRecentEntries = (entries = [], days) =>
    entries.filter((entry) => isWithinLastDays(entry?.created_at || entry?.timestamp, days));

const createScoutAlert = (note) => ({
    id:           note.id,
    disease:      note.disease_name_observed || 'Field Observation',
    category:     note.pest_notes ? `Scout / ${note.pest_notes.slice(0, 15)}...` : 'Field Scout',
    severity:     note.scout_severity || 'High',
    timestamp:    note.created_at,
    plot_id:      note.plot_id || null,
    healthStatus: 'disease',
    result_json: {
        treatment: [
            'Verify field observation',
            'Plan targeted response based on scouting data',
            'Log secondary detailed scan if necessary',
        ],
    },
});

export const useFarmStats = ({ userId, getLocation, notify, t }) => {
    const [scanHistory,    setScanHistory]    = useState([]);
    const [checklistState, setChecklistState] = useState({});
    const [logbook,        setLogbook]        = useState([]);
    const [notes,          setNotes]          = useState([]);
    const [plots,          setPlots]          = useState([]);
    const [assessingRisk,  setAssessingRisk]  = useState(false);
    const [predictiveRisk, setPredictiveRisk] = useState(null);
    const [acknowledgedIds, setAcknowledgedIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(ACKNOWLEDGED_ALERTS_KEY) || '[]');
        } catch {
            return [];
        }
    });

    // Track the last risk warning so we don't spam the same message
    const lastRiskMessageRef = useRef('');

    // ── Initial data load ─────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            // Seed demo data if this is the test/demo account and localStorage is empty
            if (userId === 'demo-user-123') {
                seedDemoData(userId, {
                    scans:   DEMO_SCANS,
                    notes:   DEMO_NOTES,
                    plots:   DEMO_PLOTS,
                    logbook: DEMO_LOGBOOK,
                });
            }

            const [history, checklist, loadedLogbook, dailyNotes, farmPlots] = await Promise.all([
                Promise.resolve(getScanHistory(userId ?? null)),
                Promise.resolve(getChecklistState(userId ?? null)),
                Promise.resolve(getLogbook(userId ?? null)),
                Promise.resolve(getDailyNotes(userId ?? null)),
                Promise.resolve(getPlots(userId ?? null)),
            ]);

            if (cancelled) return;

            setScanHistory(history);
            setChecklistState(checklist);
            setLogbook(loadedLogbook);
            setNotes((dailyNotes || []).sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
            setPlots(farmPlots);
        };

        load();
        return () => { cancelled = true; };
    }, [userId]);

    // ── Derived stats ─────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total   = scanHistory.length;
        const healthy = scanHistory.filter((s) => s.healthStatus === 'healthy').length;
        const now = new Date();
        const scannedThisMonth = scanHistory.filter(s => {
            const d = new Date(s.timestamp || s.created_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
        const accuracy = total > 0 ? Math.round((healthy / total) * 100) : 100;

        return {
            total,
            healthy,
            diseases: total - healthy,
            scannedThisMonth,
            accuracy,
            lastScan: scanHistory[0]?.timestamp ?? scanHistory[0]?.created_at ?? null,
        };
    }, [scanHistory]);

    const recentScans = useMemo(() => scanHistory.slice(0, 3), [scanHistory]);

    const autoCheckedItems = useMemo(() => {
        const hasPesticideLogo = notes.some(n => n.activity_type === 'spray' || (n.activity_type === 'note' && n.chemical_name))
                               || logbook.some(l => l.type === 'pesticide');
        const hasScoutLogs = notes.some(n => ['scout', 'inspect', 'prune'].includes(n.activity_type));
        const hasIrrigationLogs = logbook.some(l => l.type === 'irrigation');
        const hasTraceability = plots.length > 0 && (notes.length + logbook.length) > 5;

        return {
            check1: hasPesticideLogo,
            check3: hasScoutLogs,
            check4: hasIrrigationLogs,
            check8: hasTraceability,
        };
    }, [notes, logbook, plots]);

    const derivedChecklist = useMemo(() => {
        const combined = { ...checklistState };
        Object.keys(autoCheckedItems).forEach(key => {
            if (autoCheckedItems[key]) combined[key] = true;
        });
        return combined;
    }, [checklistState, autoCheckedItems]);

    const { hasLoggedToday, streak, complianceNudges } = useMemo(() => {
        // Use local date string YYYY-MM-DD
        const getLocalDate = (d) => {
            if (!d) return '';
            const date = new Date(d);
            if (isNaN(date.getTime())) return '';
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };

        const todayStr = getLocalDate(new Date());
        const allEvents = [...notes, ...logbook, ...scanHistory];
        
        const hasLog = allEvents.some(e => getLocalDate(e.created_at || e.timestamp) === todayStr);

        // Helper for days ago
        const daysOld = (date) => {
            if (!date) return Infinity;
            return Math.floor((Date.now() - new Date(date)) / 86400000);
        };

        const activityDates = new Set(allEvents.map(e => getLocalDate(e.created_at || e.timestamp)));

        // Streak
        let currentStreak = 0;
        let d = new Date();
        for (let i = 0; i < 365; i++) { // cap at 1 year
            const dateStr = getLocalDate(d);
            const hasActivity = activityDates.has(dateStr);
            if (hasActivity) {
                currentStreak++;
                d.setDate(d.getDate() - 1);
            } else {
                if (dateStr === todayStr) {
                    d.setDate(d.getDate() - 1);
                    continue;
                }
                break;
            }
        }

        // Nudges
        const nudges = [];
        const lastSpray = notes.find(n => n.activity_type === 'spray' || (n.activity_type === 'note' && n.chemical_name));
        const lastScout = notes.find(n => ['scout', 'inspect', 'prune'].includes(n.activity_type));
        
        if (daysOld(lastSpray?.created_at) > 14) {
            nudges.push({
                id: 'stale-spray',
                title: t?.('profile.nudgeStaleSprayTitle') || 'Spray Record Stale',
                desc: t?.('profile.nudgeStaleSpray') || 'No spray records for 14 days. Need an update?',
                type: 'note',
                activityType: 'spray'
            });
        }
        if (daysOld(lastScout?.created_at) > 7) {
            nudges.push({
                id: 'stale-scout',
                title: t?.('profile.nudgeStaleScoutTitle') || 'Scouting Overdue',
                desc: t?.('profile.nudgeStaleScout') || 'It has been 7 days since your last scout. Time for a field check?',
                type: 'note',
                activityType: 'scout'
            });
        }

        return { hasLoggedToday: hasLog, streak: currentStreak, complianceNudges: nudges };
    }, [notes, logbook, scanHistory, t]);

    const checklistPct = useMemo(() => {
        const values = Object.values(derivedChecklist);
        if (values.length === 0) return 0;
        // The total number of checklist items in MyGap is 8
        return Math.round((values.filter(Boolean).length / 8) * 100);
    }, [derivedChecklist]);

    const logs = useMemo(() => logbook.slice(0, 5), [logbook]);

    // ── Alert computation ─────────────────────────────────────────────────────
    const alerts = useMemo(() => {
        const cutoff = Date.now() - 7 * 86400000;

        const scanAlerts = scanHistory.filter((scan) => {
            const ts  = new Date(scan.timestamp ?? scan.created_at).getTime();
            const sev = (scan.severity ?? '').toLowerCase();
            return ts > cutoff
                && scan.healthStatus !== 'healthy'
                && (sev === 'severe' || sev === 'critical' || sev === 'sederhana');
        });

        const scoutAlerts = notes
            .filter((note) => {
                const ts = new Date(note.created_at).getTime();
                return ts > cutoff
                    && note.activity_type === 'scout'
                    && (note.disease_incidence > 10 || note.scout_severity === 'High' || note.scout_severity === 'Moderate');
            })
            .map(createScoutAlert);

        return [...scanAlerts, ...scoutAlerts]
            .sort((a, b) =>
                new Date(b.timestamp ?? b.created_at).getTime() -
                new Date(a.timestamp ?? a.created_at).getTime(),
            )
            .slice(0, 5);
    }, [notes, scanHistory]);

    const activeAlerts = useMemo(
        () => alerts.filter((a) => !acknowledgedIds.includes(a.id)),
        [acknowledgedIds, alerts],
    );

    // ── Predictive risk assessment ─────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        const assessRisk = async () => {
            if (activeAlerts.length === 0 || plots.length === 0) {
                setPredictiveRisk(null);
                return;
            }

            const language = localStorage.getItem('appLanguage') || 'en';
            setAssessingRisk(true);

            try {
                const location = await getLocation();
                const recentNotes = filterRecentEntries(notes, 14);
                const result   = await predictFarmRisk(
                    plots,
                    recentNotes,
                    activeAlerts,
                    location,
                    language,
                );

                if (cancelled) return;

                setPredictiveRisk(result);

                // Only fire the toast if the warning is new
                if (
                    result?.hasRisk &&
                    result.warningMessage &&
                    lastRiskMessageRef.current !== result.warningMessage
                ) {
                    lastRiskMessageRef.current = result.warningMessage;
                    notify?.({
                        type:     'error',
                        message:  result.warningMessage,
                        duration: 7000,
                    });
                }

                // Browser push notification (best-effort)
                if (result?.hasRisk && typeof window !== 'undefined' && 'Notification' in window) {
                    if (Notification.permission === 'granted') {
                        new Notification('Plant Farm AI Alert', { body: result.warningMessage });
                    } else if (Notification.permission !== 'denied') {
                        Notification.requestPermission().then((perm) => {
                            if (perm === 'granted') {
                                new Notification('Plant Farm AI Alert', { body: result.warningMessage });
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Risk assessment error:', error);
            } finally {
                if (!cancelled) setAssessingRisk(false);
            }
        };

        assessRisk();
        return () => { cancelled = true; };
    }, [activeAlerts, getLocation, notes, notify, plots]);

    // ── Acknowledge handler ───────────────────────────────────────────────────
    const persistAcknowledgedIds = useCallback((nextIds) => {
        setAcknowledgedIds(nextIds);
        try {
            localStorage.setItem(ACKNOWLEDGED_ALERTS_KEY, JSON.stringify(nextIds));
        } catch { /* non-fatal */ }
    }, []);

    return {
        stats,
        scanHistory,
        checklistPct,
        checklistState,
        setChecklistState,
        derivedChecklist,
        autoCheckedItems,
        hasLoggedToday,
        streak,
        complianceNudges,
        recentScans,
        alerts,
        activeAlerts,
        logs: logbook,
        setLogbook,
        notes,
        setNotes,
        plots,
        setPlots,
        acknowledgedIds,
        setAcknowledgedIds: persistAcknowledgedIds,
        assessingRisk,
        predictiveRisk,
        hasLoggedToday,
        streak,
        complianceNudges,
        allEvents: [...notes, ...logbook, ...scanHistory]
    };
};
