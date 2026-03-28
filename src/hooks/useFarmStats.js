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

const createScoutAlert = (note) => ({
    id:           note.id,
    disease:      note.disease_name_observed || 'Field Observation',
    category:     note.pest_notes ? `Scout / ${note.pest_notes.slice(0, 15)}...` : 'Field Scout',
    severity:     note.scout_severity || 'High',
    timestamp:    note.created_at,
    healthStatus: 'disease',
    result_json: {
        treatment: [
            'Verify field observation',
            'Plan targeted response based on scouting data',
            'Log secondary detailed scan if necessary',
        ],
    },
});

export const useFarmStats = ({ userId, getLocation, notify }) => {
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
            setNotes(dailyNotes);
            setPlots(farmPlots);
        };

        load();
        return () => { cancelled = true; };
    }, [userId]);

    // ── Derived stats ─────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total   = scanHistory.length;
        const healthy = scanHistory.filter((s) => s.healthStatus === 'healthy').length;
        return {
            total,
            healthy,
            diseases: total - healthy,
            lastScan: scanHistory[0]?.timestamp ?? scanHistory[0]?.created_at ?? null,
        };
    }, [scanHistory]);

    const recentScans = useMemo(() => scanHistory.slice(0, 3), [scanHistory]);

    const checklistPct = useMemo(() => {
        const values = Object.values(checklistState);
        if (values.length === 0) return 0;
        return Math.round((values.filter(Boolean).length / 8) * 100);
    }, [checklistState]);

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
                const result   = await predictFarmRisk(
                    plots,
                    notes.slice(0, 30),
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
        recentScans,
        alerts,
        activeAlerts,
        logs,
        notes,
        setNotes,
        plots,
        setPlots,
        acknowledgedIds,
        setAcknowledgedIds: persistAcknowledgedIds,
        assessingRisk,
        predictiveRisk,
    };
};
