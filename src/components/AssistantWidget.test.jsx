import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AssistantWidget from './AssistantWidget.jsx';

const api = vi.hoisted(() => ({ sendAssistantMessage: vi.fn() }));
vi.mock('../utils/assistantService.js', () => ({ ...api, STORE_URL: 'https://store.example/products/' }));
vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({ language: 'ms', t: (key) => key, label: (_key, fallback) => fallback }),
}));

const renderAt = (path = '/') => render(<MemoryRouter initialEntries={[path]}><AssistantWidget /></MemoryRouter>);
const openPanel = () => fireEvent.click(screen.getByRole('button', { name: 'Ask KANB assistant' }));
const askQuestion = (text) => {
    fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
};

beforeEach(() => { api.sendAssistantMessage.mockReset(); });
afterEach(() => vi.restoreAllMocks());

describe('AssistantWidget', () => {
    it('opens with links to the store, encyclopedia and contact', () => {
        renderAt();
        openPanel();
        expect(screen.getByRole('link', { name: /Browse store/ })).toHaveAttribute('href', 'https://store.example/products/');
        expect(screen.getByRole('link', { name: /Encyclopedia/ })).toHaveAttribute('href', '/encyclopedia');
        expect(screen.getByRole('link', { name: /Contact us/ })).toHaveAttribute('href', expect.stringContaining('wa.me/60136667810'));
    });

    it('sends the question in the current language and shows linked results', async () => {
        api.sendAssistantMessage.mockResolvedValue({
            reply: 'Mungkin penyakit karah.',
            encyclopedia: [{ id: 'rice-blast', name: 'Penyakit Karah Padi' }],
            products: [{ id: 1, name: 'Fungisid A', url: 'https://store.example/p/1', price: '35' }],
            suggestScan: true,
            contact: { whatsapp: 'https://wa.me/60136667810?text=hi', email: 'mailto:support@smartplant.my' },
        });
        renderAt();
        openPanel();
        askQuestion('Daun padi ada bintik');
        expect(await screen.findByText('Mungkin penyakit karah.')).toBeInTheDocument();
        expect(api.sendAssistantMessage).toHaveBeenCalledWith([{ role: 'user', content: 'Daun padi ada bintik' }], 'ms');
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

    it('stays out of the way during a scan', () => {
        const { container } = renderAt('/?scan=true');
        expect(container).toBeEmptyDOMElement();
    });
});
