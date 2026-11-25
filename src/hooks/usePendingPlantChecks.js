import { useCallback, useEffect, useRef, useState } from 'react';
import { refreshScanService } from './useScanService.js';
import { listPendingPlantChecks, removePendingPlantCheck, updatePendingPlantCheck, isWaitingError, PENDING_CHECKS_EVENT } from '../utils/pendingPlantChecks.js';

/** Live list of this owner's saved offline checks, for the notice on Home. */
export const usePendingPlantCheckList = (owner) => {
    const [checks, setChecks] = useState([]);
    const refresh = useCallback(() => {
        listPendingPlantChecks(owner).then(setChecks).catch(() => setChecks([]));
    }, [owner]);
    useEffect(() => {
        refresh();
        const onChange = (event) => { if (!event.detail?.owner || event.detail.owner === owner) refresh(); };
        window.addEventListener(PENDING_CHECKS_EVENT, onChange);
        return () => window.removeEventListener(PENDING_CHECKS_EVENT, onChange);
    }, [owner, refresh]);
    return checks;
};

// Runs saved checks one at a time, oldest first, whenever the phone gets
// signal back or the app is reopened. A check that fails for connection or
// service reasons waits for the next chance; one with a photo problem is held
// for the farmer to retake.
export const usePendingPlantCheckRunner = ({ owner, analyze, isBusy, onReady, onNeedsAttention }) => {
    const running = useRef(false);
    const latest = useRef({ analyze, isBusy, onReady, onNeedsAttention });
    useEffect(() => { latest.current = { analyze, isBusy, onReady, onNeedsAttention }; });

    const run = useCallback(async () => {
        if (!owner || running.current || latest.current.isBusy()) return;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        running.current = true;
        try {
            const waiting = (await listPendingPlantChecks(owner)).filter(check => check.state === 'waiting' && check.selectedImage);
            if (!waiting.length || await refreshScanService() !== 'online') return;
            for (const check of waiting) {
                try {
                    const scanId = await latest.current.analyze(check);
                    await removePendingPlantCheck(owner, check.id);
                    latest.current.onReady(scanId, check);
                } catch (error) {
                    if (error?.code === 'ANALYSIS_CANCELLED') return;
                    if (isWaitingError(error)) {
                        await updatePendingPlantCheck(owner, check, { attempts: check.attempts + 1, lastError: error.userMessage || error.message || '' });
                        return;
                    }
                    await updatePendingPlantCheck(owner, check, { state: 'needs-attention', attempts: check.attempts + 1, lastError: error.userMessage || error.message || '' });
                    latest.current.onNeedsAttention(check, error);
                }
            }
        } catch { /* IndexedDB unavailable; nothing was saved to run */ } finally {
            running.current = false;
        }
    }, [owner]);

    useEffect(() => {
        run();
        const visible = () => { if (document.visibilityState === 'visible') run(); };
        const onQueued = (event) => { if (event.detail?.owner === owner) run(); };
        window.addEventListener('online', run);
        window.addEventListener(PENDING_CHECKS_EVENT, onQueued);
        document.addEventListener('visibilitychange', visible);
        // Signal can return without an "online" event (a weak link that was
        // never fully lost), so check again now and then.
        const interval = window.setInterval(run, 120000);
        return () => {
            window.removeEventListener('online', run);
            window.removeEventListener(PENDING_CHECKS_EVENT, onQueued);
            document.removeEventListener('visibilitychange', visible);
            window.clearInterval(interval);
        };
    }, [owner, run]);
};
