import { useMemo } from 'react';
import { ImageOff, MoveRight } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import { getScanQualityCopy } from '../../shared/scanQualityCopy.js';
import { buildFollowUpComparisonModel, sortFollowUpEvents } from '../utils/followUpComparison.js';
import './FollowUpComparison.css';

const formatDate = (value, language) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'ms' ? 'ms-MY' : 'en-GB');
};

const FollowUpImage = ({ src, alt, emptyLabel }) => src ? (
    <img className="follow-up-comparison__image" src={src} alt={alt} loading="lazy" />
) : (
    <div className="follow-up-comparison__image-placeholder" role="img" aria-label={emptyLabel}>
        <ImageOff size={22} aria-hidden="true" />
        <span>{emptyLabel}</span>
    </div>
);

const FollowUpComparison = ({ scan, events = [], resolvedPhotos = {}, selectedEventId, onSelectEvent }) => {
    const { language } = useLanguage();
    const copy = getScanQualityCopy(language).comparison;
    const sortedEvents = useMemo(() => sortFollowUpEvents(events), [events]);
    const activeEvent = sortedEvents.find(event => event.id === selectedEventId) || sortedEvents[0] || null;
    const model = useMemo(() => buildFollowUpComparisonModel({
        scan,
        event: activeEvent,
        photoUrl: activeEvent ? resolvedPhotos[activeEvent.id] : '',
        copy,
    }), [activeEvent, copy, resolvedPhotos, scan]);

    if (!sortedEvents.length) {
        return <p className="follow-up-comparison__empty">{copy.noHistory}</p>;
    }

    const scanCopy = getScanQualityCopy(language);
    const outcomeLabel = activeEvent?.outcome ? scanCopy[activeEvent.outcome] || activeEvent.outcome : copy.notRecorded;
    const severityLabel = value => value ? scanCopy[value] || value : copy.notRecorded;
    const stateLabel = value => value ? scanCopy[value] || value : copy.notRecorded;

    return (
        <section className="follow-up-comparison" aria-labelledby="follow-up-comparison-title">
            <div className="follow-up-comparison__header">
                <div>
                    <h3 id="follow-up-comparison-title">{copy.title}</h3>
                    <p>{copy.noInference}</p>
                </div>
                <label>
                    <span>{copy.select}</span>
                    <select value={activeEvent?.id || ''} onChange={event => onSelectEvent?.(event.target.value)}>
                        {sortedEvents.map(item => <option key={item.id} value={item.id}>{formatDate(item.recordedAt, language) || copy.notRecorded}</option>)}
                    </select>
                </label>
            </div>

            <div className="follow-up-comparison__columns">
                <article className="follow-up-comparison__panel">
                    <h4>{copy.original}</h4>
                    <FollowUpImage src={model.original.image} alt={copy.original} emptyLabel={copy.noPhoto} />
                    {model.original.secondaryImage && <FollowUpImage src={model.original.secondaryImage} alt={`${copy.original} ${copy.closeUp || ''}`} emptyLabel={copy.noPhoto} />}
                    <dl>
                        <div><dt>{copy.diagnosis}</dt><dd>{model.original.diagnosis}</dd></div>
                        <div><dt>{copy.health}</dt><dd>{stateLabel(model.original.health)}</dd></div>
                        <div><dt>{copy.severity}</dt><dd>{severityLabel(model.original.severity)}</dd></div>
                        <div><dt>{copy.recorded}</dt><dd>{formatDate(model.original.recordedAt, language) || copy.notRecorded}</dd></div>
                    </dl>
                    {model.original.symptoms.length > 0 && <div className="follow-up-comparison__notes"><strong>{copy.symptoms}</strong><ul>{model.original.symptoms.map(symptom => <li key={symptom}>{symptom}</li>)}</ul></div>}
                </article>

                <div className="follow-up-comparison__arrow" aria-hidden="true"><MoveRight size={20} /></div>

                <article className="follow-up-comparison__panel">
                    <h4>{copy.latest}</h4>
                    <FollowUpImage src={model.latest.image} alt={copy.latest} emptyLabel={copy.noPhoto} />
                    <dl>
                        <div><dt>{copy.outcome}</dt><dd>{outcomeLabel}</dd></div>
                        <div><dt>{copy.severity}</dt><dd>{severityLabel(model.latest.severity)}</dd></div>
                        <div><dt>{copy.recorded}</dt><dd>{formatDate(model.latest.recordedAt, language) || copy.notRecorded}</dd></div>
                    </dl>
                    {model.latest.notes && <div className="follow-up-comparison__notes"><strong>{copy.reportedNotes}</strong><p>{model.latest.notes}</p></div>}
                </article>
            </div>

            <div className={`follow-up-comparison__summary is-${model.severityChange.direction}`}>
                <strong>{copy.summary}</strong>
                <span>{copy.severityChange}: {model.severityChange.label}</span>
            </div>
        </section>
    );
};

export default FollowUpComparison;
