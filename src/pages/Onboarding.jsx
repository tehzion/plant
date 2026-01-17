
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLanguage } from '../i18n/i18n.jsx';
import { Camera, ScanEye, Sprout, ArrowLeft, Check, ArrowRight, X } from 'lucide-react';


const Onboarding = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        {
            title: 'onboarding.step1Title',
            desc: 'onboarding.step1Desc',
            icon: <Camera size={64} color="#4CAF50" />,
            color: '#4CAF50'
        },
        {
            title: 'onboarding.step2Title',
            desc: 'onboarding.step2Desc',
            icon: <ScanEye size={64} color="#2196F3" />,
            color: '#2196F3'
        },
        {
            title: 'onboarding.step3Title',
            desc: 'onboarding.step3Desc',
            icon: <Sprout size={64} color="#FF9800" />,
            color: '#FF9800'
        }
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
                <button className="close-btn" onClick={() => navigate('/')}>✕</button>

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

            <style>{`
                .onboarding-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 80vh;
                    padding: var(--space-lg);
                    padding-bottom: 150px; /* Extra padding for mobile nav */
                    background: var(--color-bg-secondary);
                }

                .onboarding-card {
                    background: white;
                    padding: 40px var(--space-xl);
                    border-radius: var(--radius-2xl);
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                    text-align: center;
                    max-width: 400px;
                    width: 100%;
                    position: relative;
                }

                .close-btn {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    color: var(--color-text-secondary);
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }

                .close-btn:hover {
                    background: #f5f5f5;
                }

                .icon-container {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    margin: 0 auto var(--space-xl);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .step-icon {
                    font-size: 4rem;
                }

                .step-title {
                    font-size: var(--font-size-2xl);
                    font-weight: 700;
                    margin-bottom: var(--space-md);
                    color: var(--color-text-primary);
                }

                .step-desc {
                    color: var(--color-text-secondary);
                    line-height: 1.6;
                    margin-bottom: var(--space-xl);
                    min-height: 80px;
                }

                .dots-indicator {
                    display: flex;
                    justify-content: center;
                    gap: 8px;
                    margin-bottom: var(--space-xl);
                }

                .dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    transition: all 0.3s ease;
                }
                
                .dot.active {
                    width: 24px;
                    border-radius: 12px;
                }

                .button-group {
                    display: flex;
                    gap: var(--space-md);
                    justify-content: center;
                }

                .nav-btn {
                    padding: 12px 24px;
                    border-radius: var(--radius-lg);
                    font-weight: 600;
                    border: none;
                    cursor: pointer;
                    transition: transform 0.2s;
                    flex: 1;
                }

                .nav-btn:active {
                    transform: scale(0.96);
                }

                .nav-btn.primary {
                    color: white;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }

                .nav-btn.secondary {
                    background: #f5f5f5;
                    color: var(--color-text-primary);
                }

                .fade-in {
                    animation: fadeIn 0.4s ease-out;
                }
            `}</style>
        </div>
    );
};

export default Onboarding;
