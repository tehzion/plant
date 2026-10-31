import React from 'react';
import { ScanSearch } from 'lucide-react';
import { isHealthy } from '../../utils/statusUtils';
import { createLabel } from './mygapText.js';

// Plant scans double as pest monitoring records (myGAP 4-4). Each finding can
// start a treatment record with the reason already filled in.
const PestCheckList = ({ t, scans = [], onRecordTreatment }) => {
    const label = createLabel(t);
    return (
        <section className="pest-checks" aria-labelledby="mygap-pest-checks-title">
            <h3 id="mygap-pest-checks-title" className="pest-checks__title"><ScanSearch size={18} aria-hidden="true" />{label('mygap.pestChecksTitle', 'Recent pest checks from your scans')}</h3>
            <p className="pest-checks__subtitle">{label('mygap.pestChecksSubtitle', 'Each scan counts as a pest monitoring record (myGAP 4-4).')}</p>
            {scans.length === 0 ? (
                <p className="field-hint">{label('mygap.noRecentScans', 'No scans in the last 60 days.')}</p>
            ) : (
                <ul className="pest-checks__list">
                    {scans.map((scan) => {
                        const healthy = isHealthy(scan);
                        return (
                            <li key={scan.id} className="pest-checks__item">
                                <div>
                                    <strong>{healthy ? label('mygap.healthyFinding', 'No disease found') : scan.disease}</strong>
                                    <span className="field-hint">{[new Date(scan.timestamp || scan.created_at).toLocaleDateString(), scan.category, scan.plotId || scan.plot_id].filter(Boolean).join(' · ')}</span>
                                </div>
                                {!healthy && (
                                    <button type="button" className="btn btn-secondary pest-checks__action" onClick={() => onRecordTreatment(scan)}>
                                        {label('mygap.recordTreatment', 'Record treatment')}
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
};

export default PestCheckList;
