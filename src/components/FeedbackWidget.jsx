import { useMemo, useState } from 'react';
import { CheckCircle2, MessageSquareWarning, Send } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import { showToast } from '../utils/toast';
import './FeedbackWidget.css';

const ISSUE_TYPES = [
  'wrong_species',
  'wrong_disease',
  'wrong_severity',
  'bad_treatment',
  'bad_language',
  'poor_image',
];

const FeedbackWidget = ({ scanId, scan }) => {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(null);
  const [issueType, setIssueType] = useState('');
  const [correctCrop, setCorrectCrop] = useState('');
  const [correctDisease, setCorrectDisease] = useState('');
  const [note, setNote] = useState('');

  const issueOptions = useMemo(() => ISSUE_TYPES.map((value) => ({
    value,
    label: t(`feedback.issueTypes.${value}`),
  })), [t]);

  const handleSubmit = async () => {
    if (isSubmitting || wasCorrect === null) return;

    setIsSubmitting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scanId,
          rating: wasCorrect ? 5 : 2,
          comment: wasCorrect ? 'correct' : 'needs_correction',
          wasCorrect,
          correctCrop: correctCrop.trim() || undefined,
          correctDisease: correctDisease.trim() || undefined,
          issueType: issueType || undefined,
          note: note.trim() || undefined,
          correction: note.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('feedback_failed');
      }

      setIsSubmitted(true);
      showToast(t('feedback.thankYou'), 'success');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      showToast(t('feedback.submitFailed') || 'Failed to submit feedback. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="feedback-widget feedback-widget-success">
        <CheckCircle2 size={18} />
        <span>{t('feedback.thankYou')}</span>
      </div>
    );
  }

  return (
    <div className="feedback-widget">
      <div className="feedback-header">
        <MessageSquareWarning size={18} />
        <div>
          <strong>{t('feedback.title') || 'Review this result'}</strong>
          <p>{t('feedback.description') || 'Tell us if the diagnosis looks right, or share a correction.'}</p>
        </div>
      </div>

      <div className="feedback-choice-row">
        <button
          type="button"
          className={`feedback-choice ${wasCorrect === true ? 'active' : ''}`}
          onClick={() => setWasCorrect(true)}
        >
          {t('feedback.correct') || 'Looks correct'}
        </button>
        <button
          type="button"
          className={`feedback-choice ${wasCorrect === false ? 'active' : ''}`}
          onClick={() => setWasCorrect(false)}
        >
          {t('feedback.needsCorrection') || 'Needs correction'}
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

      <button
        type="button"
        className="btn btn-primary feedback-submit"
        onClick={handleSubmit}
        disabled={wasCorrect === null || isSubmitting}
      >
        <Send size={16} />
        <span>{isSubmitting ? (t('feedback.submitting') || 'Submitting...') : (t('feedback.submit') || 'Submit review')}</span>
      </button>
    </div>
  );
};

export default FeedbackWidget;
