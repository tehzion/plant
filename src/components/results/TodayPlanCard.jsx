import { useState } from 'react';
import { CalendarCheck, CheckCircle2, ListChecks } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';
import { getScanQualityCopy } from '../../../shared/scanQualityCopy.js';
import { getFieldAnswers, localDateKey, saveFieldAnswer } from '../../utils/farmerPrefs.js';
import { nextScanStep } from '../ScanDecisionSummary.jsx';
import './TodayPlanCard.css';

const ANSWERS = ['yes', 'no', 'unsure'];
const ANSWER_KEYS = { yes: 'Yes', no: 'No', unsure: 'Unsure' };
const ANSWER_FALLBACKS = { yes: 'Yes', no: 'No', unsure: 'Not sure' };

export const recheckDays = (result = {}) => {
    if (result.requiresRetake) return null;
    if (result.healthy) return 14;
    return result.treatmentEligible ? 5 : 3;
};

// The first thing a farmer sees after the headline: up to three actions, the
// field questions as tap answers, and one button to set a re-check date.
const TodayPlanCard = ({ result, scanId, onSetRecheck }) => {
    const { language, t } = useLanguage();
    const copy = getScanQualityCopy(language);
    const label = (key, fallback) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    };
    const assessment = result.structuredAssessment?.assessment || {};
    const actions = (Array.isArray(result.immediateActions) ? result.immediateActions : []).filter(Boolean).slice(0, 3);
    const questions = assessment.follow_up_questions || [];
    const infoNeeded = assessment.additional_information_needed || [];
    const [answers, setAnswers] = useState(() => getFieldAnswers(scanId));
    const days = recheckDays(result);

    const answer = (question, value) => setAnswers(saveFieldAnswer(scanId, question, value));
    const suggestRecheck = () => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        onSetRecheck?.({ date: localDateKey(date), at: Date.now() });
    };

    return (
        <section className="today-plan app-surface" aria-labelledby="today-plan-title">
            <h2 id="today-plan-title"><ListChecks size={20} aria-hidden="true" /> {label('assessment.ux.todayTitle', 'What to do today')}</h2>
            <ol className="today-plan__actions">
                {(actions.length ? actions : [nextScanStep(result, copy) || label('assessment.ux.todayFallback', '')]).map((item, index) => (
                    <li key={index}>{item}</li>
                ))}
            </ol>

            {infoNeeded.length > 0 && (
                <div className="today-plan__block">
                    <h3>{label('assessment.infoNeededTitle', 'What would help confirm this')}</h3>
                    <ul>{infoNeeded.map((item, index) => <li key={index}>{item}</li>)}</ul>
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

            {days && (
                <div className="today-plan__recheck">
                    <p>{label('assessment.ux.checkAgainHint', 'Check the same plant again in {days} days.').replace('{days}', days)}</p>
                    <button type="button" className="btn btn-secondary" onClick={suggestRecheck}>
                        <CalendarCheck size={18} aria-hidden="true" /> {label('assessment.ux.checkAgain', 'Set a re-check date')}
                    </button>
                </div>
            )}
        </section>
    );
};

export default TodayPlanCard;
