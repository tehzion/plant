import React, { useEffect, useMemo, useState } from 'react';
import { getFarmProfile, getLogbook, normalizeFarmProfile, saveFarmProfile } from '../../utils/localStorage';
import { computeInputStock } from '../../../shared/mygapCompliance.js';
import FarmProfilePanel from './FarmProfilePanel';
import { createLabel } from './mygapText.js';
import './MyGapFarmDetails.css';

/**
 * The myGAP farm details (land, workers, certificate, input stock), kept with
 * the rest of the farm in My farm instead of as a separate myGAP tab. Folded,
 * because it is filled in once and rarely changed.
 */
const MyGapFarmDetails = ({ t, userId = null, notify }) => {
    const label = createLabel(t);
    const [profile, setProfile] = useState(() => normalizeFarmProfile({}));
    const [version, setVersion] = useState(0);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        let cancelled = false;
        getFarmProfile(userId)
            .then((loaded) => { if (!cancelled) { setProfile(loaded); setVersion((v) => v + 1); } })
            .catch((error) => console.error('Farm profile load failed:', error));
        Promise.resolve(getLogbook(userId))
            .then((loaded) => { if (!cancelled) setLogs(Array.isArray(loaded) ? loaded : []); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [userId]);

    const stock = useMemo(() => computeInputStock(logs), [logs]);

    const handleSave = async (next) => {
        try {
            const saved = await saveFarmProfile(next, userId);
            setProfile(saved);
            notify?.({ type: 'success', title: label('mygap.profileSaved', 'Farm profile saved'), message: saved.farmName || '' });
        } catch (error) {
            console.error('Farm profile save failed:', error);
            notify?.({ type: 'error', title: t('common.error'), message: label('mygap.correctionFailed', 'The change could not be saved. Check your connection and try again.') });
        }
    };

    return (
        <details className="mygap-farm-details content-card">
            <summary>{label('mygap.farmDetailsSection', 'myGAP farm details')}</summary>
            <FarmProfilePanel key={version} t={t} profile={profile} stock={stock} onSave={handleSave} />
        </details>
    );
};

export default MyGapFarmDetails;
