import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Send, Check } from 'lucide-react';
import { useLanguage } from '../i18n/i18n';
// Note: We'll assume the API call happens here or passed as prop. 
// For simplicity, we'll implement the fetch here or use a util.
// Use environment variable or relative path for production
const API_URL = (import.meta.env.VITE_API_URL || '') + '/api';

const FeedbackWidget = ({ scanId, className = '' }) => {
    const { t } = useLanguage();
    const [status, setStatus] = useState('idle'); // idle, rated, commenting, submitting, success, error
    const [rating, setRating] = useState(null); // 'correct' | 'incorrect'
    const [comment, setComment] = useState('');

    const handleRate = async (value) => {
        setRating(value);
        if (value === 'correct') {
            await submitFeedback(value);
        } else {
            setStatus('commenting');
        }
    };

    const submitFeedback = async (rateValue, commentValue = '') => {
        setStatus('submitting');
        try {
            const response = await fetch(`${API_URL}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scanId,
                    rating: rateValue,
                    comment: commentValue
                })
            });

            if (response.ok) {
                setStatus('success');
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error('Feedback error:', error);
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className={`feedback-card success fade-in ${className}`}>
                <Check size={20} className="text-green-600" />
                <span>{t('feedback.thankYou') || "Thanks for your feedback!"}</span>
            </div>
        );
    }

    return (
        <div className={`feedback-card ${className}`}>
            {status === 'idle' || status === 'submitting' ? (
                <>
                    <span className="feedback-label">{t('feedback.helpful') || "Was this helpful?"}</span>
                    <div className="feedback-buttons">
                        <button
                            onClick={() => handleRate('correct')}
                            className="btn-icon"
                            disabled={status === 'submitting'}
                        >
                            <ThumbsUp size={18} />
                        </button>
                        <button
                            onClick={() => handleRate('incorrect')}
                            className="btn-icon"
                            disabled={status === 'submitting'}
                        >
                            <ThumbsDown size={18} />
                        </button>
                    </div>
                </>
            ) : status === 'commenting' && (
                <div className="feedback-form fade-in">
                    <p className="feedback-prompt">{t('feedback.tellUsMore') || "Tell us what was wrong (optional):"}</p>
                    <div className="input-group">
                        <input
                            type="text"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={t('feedback.placeholder') || "e.g. It's actually Downy Mildew..."}
                            className="feedback-input"
                        />
                        <button
                            onClick={() => submitFeedback('incorrect', comment)}
                            className="btn-submit"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .feedback-card {
                    background: white;
                    border: 1px solid #E5E7EB;
                    border-radius: var(--radius-lg);
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between; /* Spread label and buttons */
                    gap: 12px;
                    margin-top: 24px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }

                .feedback-card.success {
                    background: #F0FDF4;
                    border-color: #86EFAC;
                    color: #166534;
                    justify-content: center;
                    font-weight: 500;
                }

                .feedback-label {
                    font-size: 0.9rem;
                    color: #4B5563;
                    font-weight: 500;
                }

                .feedback-buttons {
                    display: flex;
                    gap: 8px;
                }

                .btn-icon {
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
                    transition: all 0.2s;
                }

                .btn-icon:hover {
                    background: #F3F4F6;
                    color: var(--color-primary);
                    border-color: var(--color-primary);
                }

                .feedback-form {
                    width: 100%;
                }

                .feedback-prompt {
                    font-size: 0.85rem;
                    color: #6B7280;
                    margin-bottom: 8px;
                }

                .input-group {
                    display: flex;
                    gap: 8px;
                }

                .feedback-input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #D1D5DB;
                    border-radius: var(--radius-md);
                    font-size: 0.9rem;
                }
                
                .feedback-input:focus {
                    outline: 2px solid var(--color-primary);
                    border-color: transparent;
                }

                .btn-submit {
                    background: var(--color-primary);
                    color: white;
                    border: none;
                    width: 36px;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                @media (min-width: 768px) {
                    .feedback-card {
                        max-width: 400px; /* Limit width on desktop */
                        margin-left: auto;
                        margin-right: auto;
                    }
                }
            `}</style>
        </div>
    );
};

export default FeedbackWidget;
