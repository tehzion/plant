import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VoiceLogInput, { mapParsedLog } from './VoiceLogInput.jsx';

const parse = vi.hoisted(() => vi.fn());
vi.mock('../utils/aiFarmService.js', () => ({ parseNaturalLog: parse }));
vi.mock('../i18n/i18n.jsx', () => ({ useLanguage: () => ({ language: 'ms', t: (key) => key }) }));

afterEach(() => { vi.restoreAllMocks(); parse.mockReset(); });

describe('voice / natural-language myGAP entry', () => {
    it('maps parsed text onto logbook fields without inventing values', () => {
        expect(mapParsedLog({ type: 'spray', plotId: 'Blok A', chemicalName: 'Mancozeb', quantity: '2 tong', notes: 'Sembur pagi', kg_harvested: null }))
            .toEqual({ type: 'pesticide', plot_id: 'Blok A', product_used: 'Mancozeb', quantity: '2 tong', notes: 'Sembur pagi' });
        expect(mapParsedLog({ type: 'baja', chemicalName: null })).toEqual({ type: 'fertilizer' });
    });

    it('fills the form from typed text and asks the farmer to check it', async () => {
        parse.mockResolvedValue({ type: 'spray', plotId: 'Blok A', notes: 'Sembur' });
        const onFill = vi.fn();
        render(<VoiceLogInput onFill={onFill} />);
        fireEvent.change(screen.getByLabelText('Say or type what you did'), { target: { value: 'sembur blok a' } });
        fireEvent.click(screen.getByRole('button', { name: /Fill the form/ }));
        await waitFor(() => expect(onFill).toHaveBeenCalledWith({ type: 'pesticide', plot_id: 'Blok A', notes: 'Sembur' }));
        expect(parse).toHaveBeenCalledWith('sembur blok a', 'ms');
        expect(screen.getByRole('status')).toHaveTextContent('Check the filled details');
    });

    it('explains offline use instead of calling the service', () => {
        vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
        render(<VoiceLogInput onFill={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('Say or type what you did'), { target: { value: 'x' } });
        fireEvent.click(screen.getByRole('button', { name: /Fill the form/ }));
        expect(parse).not.toHaveBeenCalled();
        expect(screen.getByRole('status')).toHaveTextContent('Needs internet');
    });
});
