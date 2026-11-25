import { useLanguage } from '../i18n/i18n.jsx';
import './PlantCheckGuide.css';

// Entirely bundled with the app: reading help never calls an AI or a server.
export default function PlantCheckGuide() {
    const { t } = useLanguage();
    return <details className="plant-check-guide">
        <summary>{t('results.guideTitle')}</summary>
        <p>{t('results.guideOffline')}</p>
        {['Photos', 'Uncertain', 'Offline', 'Safety'].map(topic => <section key={topic}>
            <h2>{t(`results.guide${topic}Title`)}</h2>
            <p>{t(`results.guide${topic}Body`)}</p>
        </section>)}
    </details>;
}
