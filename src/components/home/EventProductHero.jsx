import { ArrowRight, Camera } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';
import './EventProductHero.css';

const PHOTO_TIPS = ['checkTip1', 'checkTip2', 'checkTip3'];

const DEMO_SCENARIOS = [
    { id: 'demo-scan-2', labelKey: 'eventDemoHealthy', tone: 'healthy' },
    { id: 'demo-scan-1', labelKey: 'eventDemoSymptomatic', tone: 'attention' },
    { id: 'demo-scan-4', labelKey: 'eventDemoUnclear', tone: 'review' },
];

// Primary dashboard action: start a plant health check, with the photo
// guidance that most affects result quality shown up front.
const EventProductHero = ({ onScan, showDemoScenarios = false, onDemoScenario }) => {
    const { t } = useLanguage();

    return (
        <section className="check-panel" aria-labelledby="check-panel-title">
            <div className="check-panel__main">
                <div className="check-panel__copy">
                    <h2 id="check-panel-title">{t('home.checkTitle')}</h2>
                    <p className="check-panel__description">{t('home.checkDesc')}</p>
                    <button type="button" className="btn btn-primary btn-large check-panel__action" onClick={onScan}>
                        <Camera size={20} aria-hidden="true" />
                        {t('home.checkAction')}
                    </button>
                </div>

                <div className="check-panel__tips">
                    <h3>{t('home.checkTipsLabel')}</h3>
                    <ol>
                        {PHOTO_TIPS.map((key) => (
                            <li key={key}>{t(`home.${key}`)}</li>
                        ))}
                    </ol>
                </div>
            </div>

            {showDemoScenarios && (
                <div className="check-panel__demo" aria-labelledby="check-panel-demo-title">
                    <div>
                        <h3 id="check-panel-demo-title">{t('home.eventDemoTitle')}</h3>
                        <p>{t('home.eventDemoNote')}</p>
                    </div>
                    <div className="check-panel__demo-list">
                        {DEMO_SCENARIOS.map(({ id, labelKey, tone }) => (
                            <button
                                type="button"
                                key={id}
                                className={`check-panel__demo-item check-panel__demo-item--${tone}`}
                                onClick={() => onDemoScenario?.(id)}
                            >
                                <span className="check-panel__demo-dot" aria-hidden="true" />
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
