import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ListChecks } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';
import { getScanQualityCopy } from '../../../shared/scanQualityCopy.js';
import { getFieldAnswers, saveFieldAnswer } from '../../utils/farmerPrefs.js';
import { nextScanStep } from '../ScanDecisionSummary.jsx';
import './TodayPlanCard.css';

const ANSWERS = ['yes', 'no', 'unsure'];
const ANSWER_KEYS = { yes: 'Yes', no: 'No', unsure: 'Unsure' };
const ANSWER_FALLBACKS = { yes: 'Yes', no: 'No', unsure: 'Not sure' };

export const recheckDays = (result = {}) => {
    if (result.requiresRetake) return null;
    if (result.healthy) return 14;
    return 3;
};

// The first thing a farmer sees after the headline: up to three actions, the
// field questions as tap answers, and an optional treatment checklist.
const TodayPlanCard = ({ result, scanId, planStarted = false, onSetRecheck }) => {
    const { language, t } = useLanguage();
    const copy = getScanQualityCopy(language);
    const label = (key, fallback) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    };
    const assessment = result.structuredAssessment?.assessment || {};
    const immediate = (Array.isArray(result.immediateActions) ? result.immediateActions : []).filter(Boolean);
    const treatment = result.treatmentEligible ? result.treatments?.[0] : null;
    const actions = result.needsReview ? [t(result.requiresRetake ? 'results.retakeHint' : 'results.nextChecksAdvice')] : [...new Set([treatment, ...immediate].filter(Boolean))].slice(0, 3);
    const questions = assessment.follow_up_questions || [];
    const infoNeeded = assessment.additional_information_needed || [];
    const [answers, setAnswers] = useState(() => getFieldAnswers(scanId));
    const firstAction = useRef(null);
    useEffect(() => {
        if (planStarted) firstAction.current?.focus();
    }, [planStarted]);
    const answer = (question, value) => setAnswers(saveFieldAnswer(scanId, question, value));

    return (
        <section className="today-plan app-surface" aria-labelledby="today-plan-title">
            <h2 id="today-plan-title"><ListChecks size={20} aria-hidden="true" /> {t('results.doNow')}</h2>
            <ol className="today-plan__actions">
                {(actions.length ? actions : [nextScanStep(result, copy) || label('assessment.ux.todayFallback', '')]).map((item, index) => (
                    <li key={index}>{planStarted ? <label className="today-plan__check"><input ref={index === 0 ? firstAction : undefined} type="checkbox" checked={answers[`care:${item}`] === 'yes'} onChange={event => answer(`care:${item}`, event.target.checked ? 'yes' : 'no')} />{item}</label> : item}</li>
                ))}
            </ol>

            {planStarted && <div className="today-plan__started"><p role="status">{t('results.planIntro')}</p><button type="button" className="btn btn-secondary" onClick={onSetRecheck}>{t('results.setRecheck')}</button></div>}
            {result.treatmentEligible && <p className="today-plan__label">{t('results.followLabel')}</p>}
            {(infoNeeded.length > 0 || questions.length > 0) && <details className="today-plan__questions"><summary>{t('assessment.questionsTitle')}</summary>
            {infoNeeded.length > 0 && (
                <div className="today-plan__block">
                    <h3>{label('assessment.infoNeededTitle', 'What would help confirm this')}</h3>
                    <ul>{infoNeeded.map((item, index) => <li key={index}>{planStarted ? <label className="today-plan__check"><input ref={index === 0 ? firstAction : undefined} type="checkbox" checked={answers[`care:${item}`] === 'yes'} onChange={event => answer(`care:${item}`, event.target.checked ? 'yes' : 'no')} />{item}</label> : item}</li>)}</ul>
                </div>
            )}

            {questions.length > 0 && (
                <div className="today-plan__block">
                    <h3>{label('assessment.questionsTitle', 'Questions to check in the field')}</h3>
                    <p className="today-plan__hint">{label('assessment.ux.answersIntro', 'Tap an answer.')}</p>
                    {questions.map((question) => (
                        <fieldset key={question} className="today-plan__question">
                            <legend>{question}</legend>
                            <div className="today-plan__answers">
                                {ANSWERS.map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        aria-pressed={answers[question] === value}
                                        className={answers[question] === value ? 'is-selected' : ''}
                                        onClick={() => answer(question, value)}
                                    >
                                        {answers[question] === value && <CheckCircle2 size={16} aria-hidden="true" />}
                                        {label(`assessment.ux.answer${ANSWER_KEYS[value]}`, ANSWER_FALLBACKS[value])}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    ))}
                </div>
            )}

            </details>}
        </section>
    );
};

export default TodayPlanCard;
