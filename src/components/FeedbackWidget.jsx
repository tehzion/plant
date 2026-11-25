import { useMemo, useState } from 'react';
import { CheckCircle2, MessageSquareWarning, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import { showToast } from '../utils/toast';
import { getNeonAccessToken } from '../utils/neonApi.js';
import './FeedbackWidget.css';

const ISSUE_TYPES = [
  'wrong_species',
  'wrong_disease',
  'wrong_severity',
  'bad_treatment',
  'bad_language',
  'poor_image',
];

// Remembers on this phone which scans already have an answer, so the
// question is not asked again each time the result is opened.
const SENT_KEY_PREFIX = 'plant-feedback-sent:';
const readSent = (scanId) => {
  try { return Boolean(scanId) && window.localStorage.getItem(`${SENT_KEY_PREFIX}${scanId}`) === '1'; } catch { return false; }
};
const rememberSent = (scanId) => {
  try { if (scanId) window.localStorage.setItem(`${SENT_KEY_PREFIX}${scanId}`, '1'); } catch { /* storage full or blocked */ }
};

const FeedbackWidget = ({ scanId, scan }) => {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(() => readSent(scanId));
  const [sentCorrection, setSentCorrection] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(null);
  const [issueType, setIssueType] = useState('');
  const [correctCrop, setCorrectCrop] = useState('');
  const [correctDisease, setCorrectDisease] = useState('');
  const [note, setNote] = useState('');
  // Set when the server refuses feedback for this scan (older scans have no
  // feedback token), so the farmer gets an explanation instead of a retry loop.
  const [blockedMessage, setBlockedMessage] = useState('');
  const label = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  const issueOptions = useMemo(() => ISSUE_TYPES.map((value) => ({
    value,
    label: t(`feedback.issueTypes.${value}`),
  })), [t]);

  // "Yes, correct" sends at once; "No, it is wrong" opens the short form first.
  const handleSubmit = async (answer = wasCorrect) => {
    if (isSubmitting || answer === null) return;

    setIsSubmitting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      // The server only accepts feedback from the scan's own device (signed
      // feedback token) or from the signed-in account that saved the scan.
      const accessToken = await getNeonAccessToken().catch(() => '');
      const response = await fetch(`${apiUrl}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          scanId,
          feedbackToken: scan?.feedbackToken || undefined,
          rating: answer ? 5 : 2,
          comment: answer ? 'correct' : 'needs_correction',
          wasCorrect: answer,
          correctCrop: answer ? undefined : correctCrop.trim() || undefined,
          correctDisease: answer ? undefined : correctDisease.trim() || undefined,
          issueType: answer ? undefined : issueType || undefined,
          note: answer ? undefined : note.trim() || undefined,
          correction: answer ? undefined : note.trim() || undefined,
        }),
      });

      if (response.status === 403) {
        setBlockedMessage(scan?.feedbackToken
          ? label('assessment.ux.feedbackNotAllowed', 'Feedback can only be sent from the phone or account that ran this scan.')
          : label('assessment.ux.feedbackUnavailable', 'Feedback is not available for scans saved before the latest update.'));
        return;
      }

      if (!response.ok) {
        throw new Error('feedback_failed');
      }

      rememberSent(scanId);
      setSentCorrection(!answer);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      showToast(t('feedback.submitFailed') || 'Failed to submit feedback. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (blockedMessage) {
    return (
      <div className="feedback-widget" role="status">
        <MessageSquareWarning size={18} />
        <span>{blockedMessage}</span>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="feedback-widget feedback-widget-success" role="status">
        <CheckCircle2 size={18} aria-hidden="true" />
        <span>{sentCorrection
          ? label('feedback.thankYouCorrection', 'Thank you. Our team will check it.')
          : t('feedback.thankYou')}</span>
      </div>
    );
  }

  return (
    <section className="feedback-widget" aria-labelledby={`feedback-title-${scanId}`}>
      <div className="feedback-header">
        <MessageSquareWarning size={18} aria-hidden="true" />
        <div>
          <h2 className="feedback-title" id={`feedback-title-${scanId}`}>{label('feedback.quickTitle', 'Is this result right?')}</h2>
          <p>{label('feedback.quickHint', 'One tap helps the app give better answers.')}</p>
        </div>
      </div>

      <div className="feedback-choice-row">
        <button
          type="button"
          className={`feedback-choice ${wasCorrect === true ? 'active' : ''}`}
          onClick={() => { setWasCorrect(true); handleSubmit(true); }}
          disabled={isSubmitting}
        >
          <ThumbsUp size={18} aria-hidden="true" />
          <span>{label('feedback.yesCorrect', 'Yes, correct')}</span>
        </button>
        <button
          type="button"
          className={`feedback-choice ${wasCorrect === false ? 'active' : ''}`}
          onClick={() => setWasCorrect(false)}
          aria-expanded={wasCorrect === false}
          disabled={isSubmitting}
        >
          <ThumbsDown size={18} aria-hidden="true" />
          <span>{label('feedback.noWrong', 'No, it is wrong')}</span>
        </button>
      </div>

      {wasCorrect === false && (
        <div className="feedback-form">
          <label className="feedback-field">
            <span>{t('feedback.issueLabel') || 'What seems off?'}</span>
            <select value={issueType} onChange={(event) => setIssueType(event.target.value)}>
              <option value="">{t('feedback.issuePlaceholder') || 'Select an issue'}</option>
              {issueOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="feedback-field">
            <span>{t('feedback.correctCropLabel') || 'Correct crop (optional)'}</span>
            <input
              type="text"
              value={correctCrop}
              onChange={(event) => setCorrectCrop(event.target.value)}
              placeholder={scan?.plantType || t('feedback.correctCropPlaceholder') || 'e.g. Banana'}
            />
          </label>

          <label className="feedback-field">
            <span>{t('feedback.correctDiseaseLabel') || 'Correct disease (optional)'}</span>
            <input
              type="text"
              value={correctDisease}
              onChange={(event) => setCorrectDisease(event.target.value)}
              placeholder={scan?.disease || t('feedback.correctDiseasePlaceholder') || 'e.g. Potassium deficiency'}
            />
          </label>

          <label className="feedback-field">
            <span>{t('feedback.noteLabel') || 'Notes (optional)'}</span>
            <textarea
              rows="3"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('feedback.notePlaceholder') || 'Share what looked wrong or what you observed in the field.'}
            />
          </label>
        </div>
      )}

      {wasCorrect === false && (
        <button
          type="button"
          className="btn btn-primary feedback-submit"
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting}
        >
          <Send size={16} aria-hidden="true" />
          <span>{isSubmitting ? (t('feedback.submitting') || 'Submitting...') : label('feedback.sendCorrection', 'Send correction')}</span>
        </button>
      )}
    </section>
  );
};

export default FeedbackWidget;
