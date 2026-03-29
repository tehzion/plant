import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLanguage } from '../i18n/i18n.jsx';
import { Camera, ScanEye, Sprout, ArrowLeft, Check, ArrowRight, X } from 'lucide-react';
import './Onboarding.css';

const Onboarding = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        {
            title: 'onboarding.step1Title',
            desc: 'onboarding.step1Desc',
            icon: <Camera size={64} color="#4CAF50" />,
            color: '#4CAF50',
        },
        {
            title: 'onboarding.step2Title',
            desc: 'onboarding.step2Desc',
            icon: <ScanEye size={64} color="#2196F3" />,
            color: '#2196F3',
        },
        {
            title: 'onboarding.step3Title',
            desc: 'onboarding.step3Desc',
            icon: <Sprout size={64} color="#FF9800" />,
            color: '#FF9800',
        },
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            navigate('/');
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="onboarding-container page">
            <div className="onboarding-card fade-in">
                <button className="close-btn" onClick={() => navigate('/')} aria-label={t('common.close') || 'Close'}>
                    <X size={18} />
                </button>

                <div className="icon-container" style={{ background: `${steps[currentStep].color}20` }}>
                    <span className="step-icon" style={{ textShadow: `0 4px 20px ${steps[currentStep].color}60` }}>
                        {steps[currentStep].icon}
                    </span>
                </div>

                <h2 className="step-title">{t(steps[currentStep].title) || 'Title'}</h2>
                <p className="step-desc">{t(steps[currentStep].desc) || 'Description'}</p>

                <div className="dots-indicator">
                    {steps.map((_, index) => (
                        <div
                            key={index}
                            className={`dot ${index === currentStep ? 'active' : ''}`}
                            style={{ background: index === currentStep ? steps[currentStep].color : '#ddd' }}
                        />
                    ))}
                </div>

                <div className="button-group">
                    {currentStep > 0 && (
                        <button className="nav-btn secondary" onClick={handleBack}>
                            <ArrowLeft size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> {t('common.back')}
                        </button>
                    )}
                    <button
                        className="nav-btn primary"
                        onClick={handleNext}
                        style={{ background: steps[currentStep].color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {currentStep === steps.length - 1 ? (
                            <>{t('common.finish')} <Check size={18} style={{ marginLeft: 8 }} /></>
                        ) : (
                            <>{t('common.next')} <ArrowRight size={18} style={{ marginLeft: 8 }} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
