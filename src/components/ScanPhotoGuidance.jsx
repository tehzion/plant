import { AlertTriangle, Check, Focus, Leaf, Sun, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { getScanQualityCopy } from '../../shared/scanQualityCopy.js';
import './ScanPhotoGuidance.css';

const ScanPhotoGuidance = ({
    plantPart = 'leaf',
    captureRole = 'whole',
    qualityIssue = '',
    onDismissIssue,
}) => {
    const { language } = useLanguage();
    const guidanceRef = useRef(null);
    const copy = getScanQualityCopy(language).photoGuidance;
    const closeUp = captureRole === 'closeup';
    const issueMessage = qualityIssue ? (copy.issues?.[qualityIssue] || copy.issues?.LOW_IMAGE_QUALITY) : '';
    const subjectLabel = getScanQualityCopy(language)[plantPart] || getScanQualityCopy(language).leaf;

    useEffect(() => {
        if (qualityIssue) guidanceRef.current?.focus({ preventScroll: true });
    }, [qualityIssue]);

    return (
        <aside ref={guidanceRef} tabIndex={qualityIssue ? -1 : undefined} className="scan-photo-guidance app-surface app-surface--soft" aria-live={issueMessage ? 'assertive' : 'polite'}>
            <div className="scan-photo-guidance__heading">
                <div className="scan-photo-guidance__icon" aria-hidden="true"><Leaf size={20} /></div>
                <div>
                    <h3>{issueMessage ? copy.retakeTitle : copy.title}</h3>
                    <p>{issueMessage || copy.intro}</p>
                </div>
                {issueMessage && onDismissIssue && (
                    <button type="button" className="scan-photo-guidance__dismiss" onClick={onDismissIssue} aria-label={copy.dismiss}>
                        <X size={18} />
                    </button>
                )}
            </div>

            <div className="scan-photo-guidance__examples" aria-label={`${copy.title}: ${subjectLabel}`}>
                <div className={`scan-photo-guidance__example ${!closeUp ? 'is-active' : ''}`}>
                    <div className="scan-photo-guidance__illustration scan-photo-guidance__illustration--whole" aria-hidden="true">
                        <Sun size={18} /><Leaf size={35} /><span className="scan-photo-guidance__ground" />
                    </div>
                    <strong>{copy.wholeTitle}</strong>
                    <span>{copy.wholeHint}</span>
                </div>
                <div className={`scan-photo-guidance__example ${closeUp ? 'is-active' : ''}`}>
                    <div className="scan-photo-guidance__illustration scan-photo-guidance__illustration--close" aria-hidden="true">
                        <Focus size={21} /><Leaf size={39} />
                    </div>
                    <strong>{copy.closeUpTitle}</strong>
                    <span>{copy.closeUpHint}</span>
                </div>
            </div>

            <div className="scan-photo-guidance__tips">
                <strong>{copy.tipsTitle}</strong>
                <ul>
                    {(copy.tips || []).map(tip => <li key={tip}><Check size={15} aria-hidden="true" />{tip}</li>)}
                </ul>
            </div>

            {!issueMessage && (
                <p className="scan-photo-guidance__hint"><AlertTriangle size={15} aria-hidden="true" />{copy.noIssue}</p>
            )}
        </aside>
    );
};

export default ScanPhotoGuidance;
