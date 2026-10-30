import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Wand2 } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import { parseNaturalLog } from '../utils/aiFarmService.js';

const SPEECH_LANG = { ms: 'ms-MY', zh: 'zh-CN', en: 'en-MY' };

const TYPE_MAP = [
    [/spray|pesticide|fungicide|insecticide|racun|sembur|喷/i, 'pesticide'],
    [/fertili|baja|manure|肥/i, 'fertilizer'],
    [/harvest|tuai|panen|采收|收获/i, 'harvest'],
    [/irrigat|water|siram|air|灌溉|浇水/i, 'irrigation'],
];

/** Maps the parse-log response onto the myGAP logbook fields. Missing values stay untouched. */
export const mapParsedLog = (parsed = {}) => {
    const type = TYPE_MAP.find(([pattern]) => pattern.test(`${parsed.type || ''} ${parsed.chemicalName || ''}`))?.[1];
    return Object.fromEntries(Object.entries({
        type,
        plot_id: parsed.plotId,
        product_used: parsed.chemicalName,
        quantity: parsed.quantity,
        notes: parsed.notes,
    }).filter(([, value]) => typeof value === 'string' && value.trim()).map(([key, value]) => [key, value.trim()]));
};

// Farmers can describe an activity in their own words (spoken where the
// browser supports it) and have the form filled in for them to check.
const VoiceLogInput = ({ onFill }) => {
    const { language, t } = useLanguage();
    const label = (key, fallback) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    };
    const [text, setText] = useState('');
    const [listening, setListening] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const recognitionRef = useRef(null);
    const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

    useEffect(() => () => recognitionRef.current?.abort?.(), []);

    const toggleListening = () => {
        if (listening) { recognitionRef.current?.stop(); return; }
        const recognition = new SpeechRecognition();
        recognition.lang = SPEECH_LANG[language] || 'en-MY';
        recognition.interimResults = false;
        recognition.onresult = (event) => {
            const spoken = Array.from(event.results).map((result) => result[0]?.transcript || '').join(' ').trim();
            if (spoken) setText((current) => [current, spoken].filter(Boolean).join(' '));
        };
        recognition.onend = () => setListening(false);
        recognition.onerror = () => setListening(false);
        recognitionRef.current = recognition;
        setListening(true);
        recognition.start();
    };

    const fill = async () => {
        if (!text.trim() || busy) return;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            setMessage(label('assessment.ux.voiceOffline', 'Needs internet. You can still fill the form by hand.'));
            return;
        }
        setBusy(true); setMessage('');
        try {
            const fields = mapParsedLog(await parseNaturalLog(text.trim(), language));
            if (!Object.keys(fields).length) throw new Error('nothing parsed');
            onFill(fields);
            setMessage(label('assessment.ux.voiceCheck', 'Check the filled details before saving.'));
        } catch {
            setMessage(label('assessment.ux.voiceFailed', 'Could not fill the form. Please type the details instead.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="voice-log">
            <label htmlFor="voice-log-text">{label('assessment.ux.voiceTitle', 'Say or type what you did')}</label>
            <textarea
                id="voice-log-text"
                rows={2}
                maxLength={1000}
                value={text}
                placeholder={label('assessment.ux.voicePlaceholder', '')}
                onChange={(event) => setText(event.target.value)}
            />
            <div className="voice-log__actions">
                {SpeechRecognition && (
                    <button type="button" className="btn btn-secondary" onClick={toggleListening} aria-pressed={listening}>
                        {listening ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
                        {listening ? label('assessment.ux.voiceListening', 'Listening…') : label('assessment.ux.voiceStart', 'Speak')}
                    </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={fill} disabled={!text.trim() || busy}>
                    <Wand2 size={18} aria-hidden="true" />
                    {busy ? label('assessment.ux.voiceFilling', 'Filling…') : label('assessment.ux.voiceFill', 'Fill the form')}
                </button>
            </div>
            {message && <p className="voice-log__message" role="status">{message}</p>}
        </div>
    );
};

export default VoiceLogInput;
