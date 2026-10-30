import { ArrowRight, CheckCircle2, FileText, Leaf, ScanLine, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';
import './EventProductHero.css';

const WORKFLOW_STEPS = [
    { key: 'capture', icon: ScanLine, labelKey: 'eventStepCapture', descriptionKey: 'eventCaptureDesc' },
    { key: 'analyze', icon: FileText, labelKey: 'eventStepAnalyze', descriptionKey: 'eventAnalyzeDesc' },
    { key: 'act', icon: CheckCircle2, labelKey: 'eventStepAct', descriptionKey: 'eventActDesc' },
];

const DEMO_SCENARIOS = [
    { id: 'demo-scan-2', labelKey: 'eventDemoHealthy', tone: 'healthy' },
    { id: 'demo-scan-1', labelKey: 'eventDemoSymptomatic', tone: 'attention' },
    { id: 'demo-scan-4', labelKey: 'eventDemoUnclear', tone: 'review' },
];

const EventProductHero = ({ onScan, showDemoScenarios = false, onDemoScenario }) => {
    const { t } = useLanguage();

    return (
        <section className="event-product-hero" aria-labelledby="event-product-hero-title">
            <div className="event-product-hero__main">
                <div className="event-product-hero__copy">
                    <p className="event-product-hero__eyebrow">{t('home.eventEyebrow')}</p>
                    <h1 id="event-product-hero-title">{t('home.eventHeadline')}</h1>
                    <p className="event-product-hero__description">{t('home.eventDescription')}</p>
                    <div className="event-product-hero__actions">
                        <button type="button" className="btn btn-primary event-product-hero__primary" onClick={onScan}>
                            <ScanLine size={19} aria-hidden="true" />
                            {t('home.eventPrimaryAction')}
                            <ArrowRight size={17} aria-hidden="true" />
                        </button>
                        <a className="event-product-hero__secondary" href="#home-how-it-works">
                            {t('home.eventSecondaryAction')}
                        </a>
                    </div>
                    <p className="event-product-hero__trust">
                        <ShieldCheck size={16} aria-hidden="true" />
                        {t('home.eventTrust')}
                    </p>
                </div>

                <div className="event-report-preview" aria-label={t('home.eventExampleNote')}>
                    <div className="event-report-preview__topline">
                        <span className="event-report-preview__label">
                            <FileText size={15} aria-hidden="true" />
                            {t('home.eventExampleLabel')}
                        </span>
                        <span className="event-report-preview__status">{t('home.eventExampleNote')}</span>
                    </div>
                    <div className="event-report-preview__plant">
                        <span className="event-report-preview__plant-icon"><Leaf size={28} aria-hidden="true" /></span>
                        <div>
                            <span className="event-report-preview__caption">{t('home.eventObserved')}</span>
                            <strong>{t('home.step1Title')}</strong>
                        </div>
                    </div>
                    <div className="event-report-preview__rows">
                        <div>
                            <span>{t('home.eventAction')}</span>
                            <strong>{t('home.eventActDesc')}</strong>
                        </div>
                        <div>
                            <span>{t('home.eventFollowUp')}</span>
                            <strong>{t('home.viewHistory')}</strong>
                        </div>
                    </div>
                    <div className="event-report-preview__bar" aria-hidden="true">
                        <span />
                    </div>
                </div>
            </div>

            <div id="home-how-it-works" className="event-workflow" aria-labelledby="event-workflow-title">
                <div className="event-workflow__heading">
                    <p className="event-workflow__eyebrow">{t('home.eventSecondaryAction')}</p>
                    <h2 id="event-workflow-title">{t('home.eventHowItWorks')}</h2>
                </div>
                <div className="event-workflow__steps" role="list">
                    {WORKFLOW_STEPS.map(({ key, icon: Icon, labelKey, descriptionKey }, index) => (
                        <div className="event-workflow__step" role="listitem" key={key}>
                            <div className="event-workflow__step-number" aria-hidden="true">0{index + 1}</div>
                            <Icon size={19} aria-hidden="true" />
                            <div>
                                <h3>{t(`home.${labelKey}`)}</h3>
                                <p>{t(`home.${descriptionKey}`)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {showDemoScenarios && (
                <div className="event-demo-panel" aria-labelledby="event-demo-title">
                    <div>
                        <p className="event-workflow__eyebrow">{t('home.demoMode')}</p>
                        <h2 id="event-demo-title">{t('home.eventDemoTitle')}</h2>
                        <p>{t('home.eventDemoNote')}</p>
                    </div>
                    <div className="event-demo-panel__scenarios">
                        {DEMO_SCENARIOS.map(({ id, labelKey, tone }) => (
                            <button
                                type="button"
                                key={id}
                                className={`event-demo-scenario event-demo-scenario--${tone}`}
                                onClick={() => onDemoScenario?.(id)}
                            >
                                <span className="event-demo-scenario__dot" aria-hidden="true" />
                                <span>{t(`home.${labelKey}`)}</span>
                                <ArrowRight size={16} aria-hidden="true" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};

export default EventProductHero;
