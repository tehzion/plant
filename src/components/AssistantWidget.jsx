import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Leaf, Mail, MessageCircle, MessageSquareText, RotateCcw, ScanLine, Send, ShoppingBag, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import { sendAssistantFeedback, sendAssistantMessage, STORE_URL } from '../utils/assistantService.js';
import { getAssistantState, subscribeAssistant } from '../utils/assistantContext.js';
import { clearSavedChat, loadSavedChat, saveChat } from '../utils/assistantChatStorage.js';
import { buildContactOptions } from '../../shared/assistantContact.js';
import './AssistantWidget.css';

// Phones get a bottom sheet; only devices with a precise pointer get the
// input focused on open, so a phone keyboard does not cover the panel.
const matches = (query) => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
const isSheetLayout = () => matches('(max-width: 768px)');

// Starter questions that fit what the scan could and could not tell.
const SCAN_STARTERS = {
    diagnosed: ['assistant.scanStarterFirstStep', 'assistant.scanStarterSpread', 'assistant.scanStarterRecheck'],
    healthy: ['assistant.scanStarterKeepHealthy', 'assistant.scanStarterWatch'],
    review: ['assistant.scanStarterCheckSigns', 'assistant.scanStarterSpread'],
    retake: ['assistant.scanStarterBetterPhoto', 'assistant.scanStarterCheckSigns'],
};

// Starter questions for the page the farmer is on; anywhere else gets the
// general set. A category picked in the encyclopedia is named in the questions.
const PAGE_STARTERS = {
    '/encyclopedia': ['assistant.encyclopediaStarterOne', 'assistant.encyclopediaStarterTwo', 'assistant.encyclopediaStarterThree'],
    '/mygap': ['assistant.mygapStarterOne', 'assistant.mygapStarterTwo', 'assistant.mygapStarterThree'],
    '/nutrition': ['assistant.nutritionStarterOne', 'assistant.nutritionStarterTwo', 'assistant.nutritionStarterThree'],
};
const TOPIC_STARTERS = ['assistant.topicStarterOne', 'assistant.topicStarterTwo', 'assistant.topicStarterThree'];
const GENERAL_STARTERS = ['assistant.starterOne', 'assistant.starterTwo', 'assistant.starterThree'];

const sameScan = (a, b) => Boolean(a && b && a.crop === b.crop && a.diagnosis === b.diagnosis && a.status === b.status);

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
    const [saved] = useState(loadSavedChat);
    const [messages, setMessages] = useState(saved.messages);
    const [draft, setDraft] = useState('');
    const [pending, setPending] = useState(false);
    const listRef = useRef(null);
    const inputRef = useRef(null);
    const fabRef = useRef(null);
    const wasOpen = useRef(false);
    const { scanContext, pageTopic, openRequest } = useSyncExternalStore(subscribeAssistant, getAssistantState, getAssistantState);
    const contact = buildContactOptions(language);
    // A conversation keeps the scan it started with, even after the farmer
    // leaves the results page; a different scan starts a new conversation.
    const [chatScan, setChatScan] = useState(saved.scan);
    const activeScan = messages.length > 0 ? chatScan : scanContext;

    // The conversation survives a page reload, so a farmer who checks the
    // field and comes back still sees what was said.
    useEffect(() => {
        if (messages.length) saveChat(messages, chatScan);
        else clearSavedChat();
    }, [messages, chatScan]);

    useEffect(() => {
        if (scanContext && chatScan && !sameScan(scanContext, chatScan)) {
            setMessages([]);
            setChatScan(null);
        }
    }, [scanContext, chatScan]);

    // Only a request made after this widget mounted opens it.
    const seenOpenRequest = useRef(openRequest);
    useEffect(() => {
        if (openRequest !== seenOpenRequest.current) {
            seenOpenRequest.current = openRequest;
            setOpen(true);
        }
    }, [openRequest]);

    useEffect(() => {
        if (open) {
            if (matches('(pointer: fine)')) inputRef.current?.focus();
        } else if (wasOpen.current) {
            fabRef.current?.focus();
        }
        wasOpen.current = open;
    }, [open]);

    // The sheet covers the page on phones, so the page behind must not scroll.
    useEffect(() => {
        if (!open || !isSheetLayout()) return undefined;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [open]);

    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        // A new answer is shown from its first line so it reads top-down;
        // anything else (the farmer's own message, typing dots) pins to the end.
        const last = list.lastElementChild;
        const isAnswer = !pending && messages.at(-1)?.role === 'assistant';
        if (isAnswer && last) {
            list.scrollTop += last.getBoundingClientRect().top - list.getBoundingClientRect().top - 12;
        } else {
            list.scrollTop = list.scrollHeight;
        }
    // Only a new message scrolls; a vote on an old answer must not move the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages.length, pending]);

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
        const scan = messages.length > 0 ? chatScan : scanContext;
        if (messages.length === 0) setChatScan(scanContext);
        setMessages(history);
        setDraft('');
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            setMessages([...history, { role: 'assistant', content: label('assistant.offline', 'You are offline.'), local: true, contact }]);
            return;
        }
        setPending(true);
        try {
            const answer = await sendAssistantMessage(history.filter((message) => !message.local), language, scan);
            setMessages([...history, { role: 'assistant', content: answer.reply, ...answer }]);
        } catch {
            setMessages([...history, { role: 'assistant', content: label('assistant.error', 'Sorry, please try again.'), local: true, contact }]);
        } finally {
            setPending(false);
        }
    };

    const close = () => setOpen(false);
    const restart = () => { setMessages([]); setDraft(''); setChatScan(null); };

    // One vote per answer; the vote is kept on the message so it shows after a reload.
    const rate = (index, rating) => {
        const answer = messages[index];
        if (!answer || answer.rating) return;
        const question = messages.slice(0, index).findLast((message) => message.role === 'user');
        setMessages((current) => current.map((message, i) => (i === index ? { ...message, rating } : message)));
        sendAssistantFeedback({
            rating,
            question: question?.content || '',
            answer: answer.content,
            language,
            page: location.pathname.split('/')[1] || 'home',
            scanStatus: chatScan?.status || null,
        }).catch(() => {});
    };

    const starterKeys = activeScan
        ? SCAN_STARTERS[activeScan.status] || SCAN_STARTERS.review
        : location.pathname === '/encyclopedia' && pageTopic
            ? TOPIC_STARTERS
            : PAGE_STARTERS[location.pathname] || GENERAL_STARTERS;
    const starters = starterKeys.map((key) => label(key, '').replace('{topic}', (pageTopic || '').toLocaleLowerCase())).filter(Boolean);
    const scanTitle = activeScan && [activeScan.crop, activeScan.diagnosis].filter(Boolean).join(' · ');

    return (
        <div className={`assistant-widget ${open ? 'is-open' : ''}`}>
            {open && <div className="assistant-backdrop" onClick={close} aria-hidden="true" />}
            {open && (
                <section className="assistant-panel" role="dialog" aria-modal="false" aria-labelledby="assistant-title">
                    <header className="assistant-header">
                        <span className="assistant-avatar" aria-hidden="true"><MessageSquareText size={20} /></span>
                        <div className="assistant-heading">
                            <h2 id="assistant-title">{label('assistant.title', 'KANB Assistant')}</h2>
                            <p>{label('assistant.subtitle', 'Farm questions, products and help')}</p>
                        </div>
                        {messages.length > 0 && (
                            <button type="button" className="assistant-icon-button" onClick={restart} disabled={pending} aria-label={label('assistant.newChat', 'New chat')} title={label('assistant.newChat', 'New chat')}>
                                <RotateCcw size={18} />
                            </button>
                        )}
                        <button type="button" className="assistant-icon-button" onClick={close} aria-label={label('assistant.close', 'Close assistant')}>
                            <X size={20} />
                        </button>
                    </header>

                    <nav className="assistant-quick" aria-label={label('assistant.title', 'KANB Assistant')}>
                        <a href={STORE_URL} target="_blank" rel="noreferrer" className="assistant-chip">
                            <ShoppingBag size={14} aria-hidden="true" /> <span className="assistant-chip-text">{label('assistant.quickStore', 'Browse store')}</span>
                        </a>
                        <Link to="/encyclopedia" className="assistant-chip" onClick={close}>
                            <BookOpen size={14} aria-hidden="true" /> <span className="assistant-chip-text">{label('assistant.quickEncyclopedia', 'Encyclopedia')}</span>
                        </Link>
                        <a href={contact.whatsapp} target="_blank" rel="noreferrer" className="assistant-chip assistant-chip--whatsapp">
                            <MessageCircle size={14} aria-hidden="true" /> <span className="assistant-chip-text">{label('assistant.quickContact', 'Contact us')}</span>
                        </a>
                    </nav>

                    {scanTitle && (
                        <div className="assistant-scan">
                            <Leaf size={14} aria-hidden="true" />
                            <span className="assistant-scan-label">{label('assistant.scanAbout', 'About your scan')}</span>
                            <span className="assistant-scan-name">{scanTitle}</span>
                        </div>
                    )}

                    <div className="assistant-messages" ref={listRef} aria-live="polite">
                        <div className="assistant-message assistant-message--bot">
                            <p>{activeScan ? label('assistant.scanGreeting', 'Ask me anything about this scan result.') : label('assistant.greeting', 'Hi! How can I help?')}</p>
                        </div>
                        {messages.length === 0 && starters.length > 0 && (
                            <div className="assistant-starters">
                                {starters.map((starter) => (
                                    <button key={starter} type="button" className="assistant-starter" onClick={() => ask(starter)}>{starter}</button>
                                ))}
                            </div>
                        )}
                        {messages.map((message, index) => (
                            <div key={index} className={`assistant-message assistant-message--${message.role === 'user' ? 'user' : 'bot'}`}>
                                <p>{message.content}</p>
                                {message.role === 'assistant' && <AssistantLinks message={message} label={label} onNavigate={close} />}
                                {message.role === 'assistant' && !message.local && (
                                    <div className="assistant-rating">
                                        {message.rating ? (
                                            <span className="assistant-rating-thanks" role="status">{label('assistant.ratingThanks', 'Thanks for your feedback')}</span>
                                        ) : (
                                            <>
                                                <button type="button" className="assistant-rating-button" onClick={() => rate(index, 'up')} aria-label={label('assistant.ratingUp', 'Helpful answer')} title={label('assistant.ratingUp', 'Helpful answer')}>
                                                    <ThumbsUp size={15} aria-hidden="true" />
                                                </button>
                                                <button type="button" className="assistant-rating-button" onClick={() => rate(index, 'down')} aria-label={label('assistant.ratingDown', 'Not helpful')} title={label('assistant.ratingDown', 'Not helpful')}>
                                                    <ThumbsDown size={15} aria-hidden="true" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {pending && (
                            <div className="assistant-message assistant-message--bot assistant-message--pending">
                                <span className="assistant-typing" aria-hidden="true"><span /><span /><span /></span>
                                <span className="sr-only">{label('assistant.thinking', 'Thinking…')}</span>
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
                ref={fabRef}
                type="button"
                className={`assistant-fab ${open ? 'is-open' : ''}`}
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-label={open ? label('assistant.close', 'Close assistant') : label('assistant.open', 'Ask KANB assistant')}
            >
                {open ? <X size={24} strokeWidth={2.1} aria-hidden="true" /> : <MessageSquareText size={24} strokeWidth={2.05} aria-hidden="true" />}
                {!open && <span className="assistant-fab-label" aria-hidden="true">{label('assistant.fabLabel', 'Ask KANB')}</span>}
            </button>
        </div>
    );
};

export default AssistantWidget;
