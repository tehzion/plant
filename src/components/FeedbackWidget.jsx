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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/feedback`, {
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

      <style>{`
        .feedback-widget {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
          margin: 24px 0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .feedback-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .feedback-question {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .feedback-buttons {
          display: flex;
          gap: 8px;
        }

        .feedback-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid #E5E7EB;
          background: white;
          color: #6B7280;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .feedback-btn:hover:not(.disabled) {
          background: #F3F4F6;
          border-color: #00B14F;
          color: #00B14F;
          transform: scale(1.05);
        }

        .feedback-btn:active:not(.disabled) {
          transform: scale(0.95);
        }

        .feedback-btn.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .feedback-widget {
            padding: 12px;
          }

          .feedback-content {
            gap: 12px;
          }

          .feedback-question {
            font-size: 13px;
          }

          .feedback-btn {
            width: 32px;
            height: 32px;
          }
        }
      `}</style>
    </div>
  );
};

export default FeedbackWidget;
