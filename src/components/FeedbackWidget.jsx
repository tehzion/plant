import { useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { showToast } from '../utils/toast';

const FeedbackWidget = ({ scanId }) => {
  const { t } = useLanguage();
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (isHelpful) => {
    if (feedbackGiven || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Send feedback to backend
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scanId,
          rating: isHelpful ? 5 : 1,
          comment: isHelpful ? 'Helpful' : 'Not helpful',
        }),
      });

      if (response.ok) {
        setFeedbackGiven(true);
        showToast(t('feedback.thankYou'), 'success');
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Still mark as given to prevent spam
      setFeedbackGiven(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feedback-widget">
      <div className="feedback-content">
        <span className="feedback-question">{t('feedback.helpful')}</span>
        <div className="feedback-buttons">
          <button
            className={`feedback-btn ${feedbackGiven ? 'disabled' : ''}`}
            onClick={() => handleFeedback(true)}
            disabled={feedbackGiven || isSubmitting}
            aria-label={t('feedback.yes')}
          >
            <ThumbsUp size={16} />
          </button>
          <button
            className={`feedback-btn ${feedbackGiven ? 'disabled' : ''}`}
            onClick={() => handleFeedback(false)}
            disabled={feedbackGiven || isSubmitting}
            aria-label={t('feedback.no')}
          >
            <ThumbsDown size={16} />
          </button>
        </div>
      </div>

    </div>
  );
};

export default FeedbackWidget;
