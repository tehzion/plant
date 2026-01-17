import { useLanguage } from '../i18n/i18n.jsx';

const ProgressStepper = ({ currentStep, steps }) => {
  const { t } = useLanguage();
  return (
    <div className="progress-stepper">
      <div className="step-text">
        <span className="step-count">{t('common.step')} {currentStep} {t('common.of')} {steps.length}</span>
        <span className="step-label">{steps[currentStep - 1]?.label}</span>
      </div>
      <div className="progress-bar-container">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`progress-segment ${index + 1 <= currentStep ? 'active' : ''}`}
          />
        ))}
      </div>

      <style>{`
                .progress-stepper {
                    width: 100%;
                    max-width: 600px; /* Constrain width */
                    margin: 0 auto var(--space-lg);
                    padding: 0 var(--space-sm);
                }

                .step-text {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-xs);
                    font-size: var(--font-size-sm);
                    font-weight: 500;
                }

                .step-count {
                    color: var(--color-text-secondary);
                }

                .step-label {
                    color: var(--color-text-primary);
                    font-weight: 600;
                }

                .progress-bar-container {
                    display: flex;
                    gap: 6px; /* Small gap between segments */
                    height: 4px; /* Slim bars */
                }

                .progress-segment {
                    flex: 1;
                    height: 100%;
                    background-color: var(--color-border);
                    border-radius: 4px;
                    transition: background-color var(--transition-base);
                }

                .progress-segment.active {
                    background-color: var(--color-primary);
                }
            `}</style>
    </div>
  );
};

export default ProgressStepper;
