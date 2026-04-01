import { useLanguage } from '../i18n/i18n.jsx';
import './ProgressStepper.css';

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
    </div>
  );
};

export default ProgressStepper;
