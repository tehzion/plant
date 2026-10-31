import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Mail, MessageCircle, MessageSquareText, ScanLine, Send, ShoppingBag, X } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import { sendAssistantMessage, STORE_URL } from '../utils/assistantService.js';
import './AssistantWidget.css';

const CONTACT = {
    whatsapp: 'https://wa.me/60136667810',
    email: 'mailto:support@smartplant.my',
};

// Each assistant reply can carry links; the greeting and quick actions are local.
const AssistantLinks = ({ message, label, onNavigate }) => (
    <>
        {message.encyclopedia?.length > 0 && (
            <div className="assistant-links">
                {message.encyclopedia.map((entry) => (
                    <Link key={entry.id} to={`/encyclopedia?q=${encodeURIComponent(entry.name)}`} className="assistant-chip" onClick={onNavigate}>
                        <BookOpen size={14} aria-hidden="true" /> {entry.name}
                    </Link>
                ))}
            </div>
        )}
        {message.products?.length > 0 && (
            <div className="assistant-products">
                <p className="assistant-section-label">{label('assistant.products', 'Products in our store')}</p>
                {message.products.map((product) => (
                    <a key={product.id} href={product.url} target="_blank" rel="noreferrer" className="assistant-product">
                        {product.image && <img src={product.image} alt="" loading="lazy" />}
                        <span className="assistant-product-name">{product.name}</span>
                        {product.price && <span className="assistant-product-price">RM {product.price}</span>}
                        <span className="assistant-product-view">{label('assistant.viewProduct', 'View')}</span>
                    </a>
                ))}
            </div>
        )}
        {message.suggestScan && (
            <div className="assistant-links">
                <Link to="/?scan=true" className="assistant-chip" onClick={onNavigate}>
                    <ScanLine size={14} aria-hidden="true" /> {label('assistant.scanNow', 'Scan a photo')}
                </Link>
            </div>
        )}
        {message.contact && (
            <div className="assistant-contact">
                <p className="assistant-section-label">{label('assistant.contactTitle', 'Talk to our team')}</p>
                <div className="assistant-links">
                    <a href={message.contact.whatsapp} target="_blank" rel="noreferrer" className="assistant-chip assistant-chip--whatsapp">
                        <MessageCircle size={14} aria-hidden="true" /> {label('assistant.whatsapp', 'WhatsApp')}
                    </a>
                    <a href={message.contact.email} className="assistant-chip">
                        <Mail size={14} aria-hidden="true" /> {label('assistant.email', 'Email')}
                    </a>
                </div>
            </div>
        )}
    </>
);

const AssistantWidget = () => {
    const { language, label: labelFn, t } = useLanguage();
    const label = (key, fallback) => (typeof labelFn === 'function' ? labelFn(key, fallback) : t(key) || fallback);
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [pending, setPending] = useState(false);
    const listRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    useEffect(() => {
        const list = listRef.current;
        if (list) list.scrollTop = list.scrollHeight;
    }, [messages, pending]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const isLegalPage = ['/terms', '/privacy'].some((path) => location.pathname.startsWith(path));
    const isScanFlow = location.pathname === '/' && location.search.includes('scan=true');
    if (isLegalPage || isScanFlow) return null;

    const ask = async (question) => {
        const text = question.trim();
        if (!text || pending) return;
        const history = [...messages, { role: 'user', content: text }];
        setMessages(history);
        setDraft('');
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            setMessages([...history, { role: 'assistant', content: label('assistant.offline', 'You are offline.'), local: true, contact: CONTACT }]);
            return;
        }
        setPending(true);
        try {
            const answer = await sendAssistantMessage(history.filter((message) => !message.local), language);
            setMessages([...history, { role: 'assistant', content: answer.reply, ...answer }]);
        } catch {
            setMessages([...history, { role: 'assistant', content: label('assistant.error', 'Sorry, please try again.'), local: true, contact: CONTACT }]);
        } finally {
            setPending(false);
        }
    };

    const close = () => setOpen(false);
    const starters = [label('assistant.starterOne', ''), label('assistant.starterTwo', ''), label('assistant.starterThree', '')].filter(Boolean);

    return (
        <div className="assistant-widget">
            {open && (
                <section className="assistant-panel" role="dialog" aria-modal="false" aria-labelledby="assistant-title">
                    <header className="assistant-header">
                        <span className="assistant-avatar" aria-hidden="true"><MessageSquareText size={20} /></span>
                        <div className="assistant-heading">
                            <h2 id="assistant-title">{label('assistant.title', 'KANB Assistant')}</h2>
                            <p>{label('assistant.subtitle', 'Farm questions, products and help')}</p>
                        </div>
                        <button type="button" className="assistant-close" onClick={close} aria-label={label('assistant.close', 'Close assistant')}>
                            <X size={20} />
                        </button>
                    </header>

                    <nav className="assistant-quick" aria-label={label('assistant.title', 'KANB Assistant')}>
                        <a href={STORE_URL} target="_blank" rel="noreferrer" className="assistant-chip">
                            <ShoppingBag size={14} aria-hidden="true" /> {label('assistant.quickStore', 'Browse store')}
                        </a>
                        <Link to="/encyclopedia" className="assistant-chip" onClick={close}>
                            <BookOpen size={14} aria-hidden="true" /> {label('assistant.quickEncyclopedia', 'Encyclopedia')}
                        </Link>
                        <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer" className="assistant-chip assistant-chip--whatsapp">
                            <MessageCircle size={14} aria-hidden="true" /> {label('assistant.quickContact', 'Contact us')}
                        </a>
                    </nav>

                    <div className="assistant-messages" ref={listRef} aria-live="polite">
                        <div className="assistant-message assistant-message--bot">
                            <p>{label('assistant.greeting', 'Hi! How can I help?')}</p>
                            {messages.length === 0 && (
                                <div className="assistant-links">
                                    {starters.map((starter) => (
                                        <button key={starter} type="button" className="assistant-chip" onClick={() => ask(starter)}>{starter}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {messages.map((message, index) => (
                            <div key={index} className={`assistant-message assistant-message--${message.role === 'user' ? 'user' : 'bot'}`}>
                                <p>{message.content}</p>
                                {message.role === 'assistant' && <AssistantLinks message={message} label={label} onNavigate={close} />}
                            </div>
                        ))}
                        {pending && (
                            <div className="assistant-message assistant-message--bot assistant-message--pending">
                                <p>{label('assistant.thinking', 'Thinking…')}</p>
                            </div>
                        )}
                    </div>

                    <form className="assistant-form" onSubmit={(event) => { event.preventDefault(); ask(draft); }}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={draft}
                            maxLength={1500}
                            onChange={(event) => setDraft(event.target.value)}
                            placeholder={label('assistant.placeholder', 'Type your question…')}
                            aria-label={label('assistant.placeholder', 'Type your question…')}
                        />
                        <button type="submit" className="assistant-send" disabled={pending || !draft.trim()} aria-label={label('assistant.send', 'Send')}>
                            <Send size={18} />
                        </button>
                    </form>
                    <p className="assistant-disclaimer">{label('assistant.disclaimer', 'AI answers are general guidance.')}</p>
                </section>
            )}

            <button
                type="button"
                className={`assistant-fab ${open ? 'is-open' : ''}`}
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-label={open ? label('assistant.close', 'Close assistant') : label('assistant.open', 'Ask KANB assistant')}
            >
                {open ? <X size={26} strokeWidth={2.1} /> : <MessageSquareText size={26} strokeWidth={2.05} />}
            </button>
        </div>
    );
};

export default AssistantWidget;
