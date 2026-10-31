import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AssistantWidget from './AssistantWidget.jsx';
import { openAssistant, setAssistantPageTopic, setAssistantScanContext } from '../utils/assistantContext.js';

const api = vi.hoisted(() => ({ sendAssistantMessage: vi.fn(), sendAssistantFeedback: vi.fn() }));
vi.mock('../utils/assistantService.js', () => ({ ...api, STORE_URL: 'https://store.example/products/' }));
vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({ language: 'ms', t: (key) => key, label: (key, fallback) => ({ 'assistant.starterOne': 'My leaves are turning yellow', 'assistant.scanStarterFirstStep': 'What should I do first?', 'assistant.scanStarterCheckSigns': 'What signs should I check?', 'assistant.mygapStarterOne': 'What records do I need for myGAP?', 'assistant.topicStarterOne': 'How do I spot {topic} early?' }[key] ?? fallback) }),
}));

const renderAt = (path = '/') => render(<MemoryRouter initialEntries={[path]}><AssistantWidget /></MemoryRouter>);
const openPanel = () => fireEvent.click(screen.getByRole('button', { name: 'Ask KANB assistant' }));
const askQuestion = (text) => {
    fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
};

beforeEach(() => {
    api.sendAssistantMessage.mockReset();
    api.sendAssistantFeedback.mockReset().mockResolvedValue({});
    localStorage.clear();
});
afterEach(() => { vi.restoreAllMocks(); act(() => { setAssistantScanContext(null); setAssistantPageTopic(null); }); });

const SCAN = { crop: 'Durian', diagnosis: 'Phytophthora', severity: 'moderate', status: 'diagnosed', symptoms: ['Bark lesions'], nextSteps: [] };

describe('AssistantWidget', () => {
    it('opens with links to the store, encyclopedia and contact', () => {
        renderAt();
        openPanel();
        expect(screen.getByRole('link', { name: /Browse store/ })).toHaveAttribute('href', 'https://store.example/products/');
        expect(screen.getByRole('link', { name: /Encyclopedia/ })).toHaveAttribute('href', '/encyclopedia');
        expect(screen.getByRole('link', { name: /Contact us/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/60146193328\?text=Hai%20pasukan%20KANB/));
    });

    it('sends the question in the current language and shows linked results', async () => {
        api.sendAssistantMessage.mockResolvedValue({
            reply: 'Mungkin penyakit karah.',
            encyclopedia: [{ id: 'rice-blast', name: 'Penyakit Karah Padi' }],
            products: [{ id: 1, name: 'Fungisid A', url: 'https://store.example/p/1', price: '35' }],
            suggestScan: true,
            contact: { whatsapp: 'https://wa.me/60146193328?text=hi', email: 'mailto:support@smartplant.my' },
        });
        renderAt();
        openPanel();
        askQuestion('Daun padi ada bintik');
        expect(await screen.findByText('Mungkin penyakit karah.')).toBeInTheDocument();
        expect(api.sendAssistantMessage).toHaveBeenCalledWith([{ role: 'user', content: 'Daun padi ada bintik' }], 'ms', null);
        expect(screen.getByRole('link', { name: /Penyakit Karah Padi/ })).toHaveAttribute('href', '/encyclopedia?q=Penyakit%20Karah%20Padi');
        expect(screen.getByRole('link', { name: /Fungisid A/ })).toHaveAttribute('href', 'https://store.example/p/1');
        expect(screen.getByRole('link', { name: /Scan a photo/ })).toHaveAttribute('href', '/?scan=true');
        expect(screen.getByRole('link', { name: /Email/ })).toHaveAttribute('href', 'mailto:support@smartplant.my');
    });

    it('offers contact details when the assistant fails', async () => {
        api.sendAssistantMessage.mockRejectedValue(new Error('down'));
        renderAt();
        openPanel();
        askQuestion('Hello');
        expect(await screen.findByText(/Sorry/)).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /WhatsApp/ }).length).toBeGreaterThan(0);
    });

    it('does not call the server while offline', async () => {
        vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
        renderAt();
        openPanel();
        askQuestion('Hello');
        expect(await screen.findByText(/offline/)).toBeInTheDocument();
        expect(api.sendAssistantMessage).not.toHaveBeenCalled();
    });

    it('shows a typing indicator, then lets the farmer start a new chat', async () => {
        let answer;
        api.sendAssistantMessage.mockReturnValue(new Promise((resolve) => { answer = resolve; }));
        renderAt();
        openPanel();
        fireEvent.click(screen.getByRole('button', { name: 'My leaves are turning yellow' }));
        expect(screen.getByText('Thinking…')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'My leaves are turning yellow' })).not.toBeInTheDocument();
        answer({ reply: 'Check nitrogen.' });
        expect(await screen.findByText('Check nitrogen.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
        expect(screen.queryByText('Check nitrogen.')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'My leaves are turning yellow' })).toBeInTheDocument();
    });

    it('closes from the dimmed backdrop and returns focus to the chat button', () => {
        const { container } = renderAt();
        openPanel();
        fireEvent.click(container.querySelector('.assistant-backdrop'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ask KANB assistant' })).toHaveFocus();
    });

    it('opens from the results page and asks about the scan being viewed', async () => {
        api.sendAssistantMessage.mockResolvedValue({ reply: 'Cut away the infected bark first.' });
        renderAt('/results/1');
        act(() => { setAssistantScanContext(SCAN); openAssistant(); });
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Durian · Phytophthora')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'My leaves are turning yellow' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'What should I do first?' }));
        expect(await screen.findByText('Cut away the infected bark first.')).toBeInTheDocument();
        expect(api.sendAssistantMessage).toHaveBeenCalledWith([{ role: 'user', content: 'What should I do first?' }], 'ms', SCAN);
    });

    it('keeps the scan for the conversation and starts over for a different scan', async () => {
        api.sendAssistantMessage.mockResolvedValue({ reply: 'Noted.' });
        renderAt('/results/1');
        act(() => { setAssistantScanContext(SCAN); openAssistant(); });
        askQuestion('Is it serious?');
        expect(await screen.findByText('Noted.')).toBeInTheDocument();
        act(() => setAssistantScanContext(null));
        askQuestion('And after rain?');
        expect(api.sendAssistantMessage).toHaveBeenLastCalledWith(expect.any(Array), 'ms', SCAN);
        act(() => setAssistantScanContext({ ...SCAN, crop: 'Padi', diagnosis: 'Unclear', status: 'review' }));
        expect(screen.queryByText('Noted.')).not.toBeInTheDocument();
        expect(screen.getByText('Padi · Unclear')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'What signs should I check?' })).toBeInTheDocument();
    });

    it('offers the greeting WhatsApp link when the assistant fails', async () => {
        api.sendAssistantMessage.mockRejectedValue(new Error('down'));
        renderAt();
        openPanel();
        askQuestion('Hello');
        const links = await screen.findAllByRole('link', { name: /WhatsApp/ });
        links.forEach((link) => expect(link).toHaveAttribute('href', expect.stringContaining('wa.me/60146193328?text=')));
    });

    it('keeps the conversation after a reload', async () => {
        api.sendAssistantMessage.mockResolvedValue({ reply: 'Check nitrogen.' });
        const { unmount } = renderAt();
        openPanel();
        askQuestion('Why yellow?');
        expect(await screen.findByText('Check nitrogen.')).toBeInTheDocument();
        unmount();
        renderAt();
        openPanel();
        expect(screen.getByText('Why yellow?')).toBeInTheDocument();
        expect(screen.getByText('Check nitrogen.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
        expect(localStorage.getItem('kanb_assistant_chat_v1')).toBeNull();
    });

    it('suggests questions that fit the page', () => {
        const { unmount } = renderAt('/mygap');
        openPanel();
        expect(screen.getByRole('button', { name: 'What records do I need for myGAP?' })).toBeInTheDocument();
        unmount();
        renderAt('/encyclopedia');
        act(() => setAssistantPageTopic('Penyakit Kulat'));
        openPanel();
        expect(screen.getByRole('button', { name: 'How do I spot penyakit kulat early?' })).toBeInTheDocument();
    });

    it('records one vote per answer with the question it answered', async () => {
        api.sendAssistantMessage.mockResolvedValue({ reply: 'Check nitrogen.' });
        renderAt();
        openPanel();
        askQuestion('Why yellow?');
        expect(await screen.findByText('Check nitrogen.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Not helpful' }));
        expect(api.sendAssistantFeedback).toHaveBeenCalledWith({
            rating: 'down', question: 'Why yellow?', answer: 'Check nitrogen.', language: 'ms', page: 'home', scanStatus: null,
        });
        expect(screen.getByText('Thanks for your feedback')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Helpful answer' })).not.toBeInTheDocument();
    });

    it('does not ask for a vote on offline or error messages', async () => {
        api.sendAssistantMessage.mockRejectedValue(new Error('down'));
        renderAt();
        openPanel();
        askQuestion('Hello');
        expect(await screen.findByText(/Sorry/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Not helpful' })).not.toBeInTheDocument();
    });

    it('stays out of the way during a scan', () => {
        const { container } = renderAt('/?scan=true');
        expect(container).toBeEmptyDOMElement();
    });
});
