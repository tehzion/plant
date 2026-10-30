import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DueReminders from './DueReminders.jsx';
import { addHarvestReminder, localDateKey } from '../../utils/farmerPrefs.js';

vi.mock('../../i18n/i18n.jsx', () => ({ useLanguage: () => ({ t: (key) => key }) }));
beforeEach(() => localStorage.clear());

describe('DueReminders', () => {
    it('renders nothing when nothing is due', () => {
        const { container } = render(<DueReminders scans={[{ id: 's1' }]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('lists due follow-ups and harvest dates and opens the scan', () => {
        addHarvestReminder({ date: localDateKey(), name: 'Mancozeb' });
        const onOpenScan = vi.fn();
        render(<DueReminders onOpenScan={onOpenScan} scans={[{ id: 's1', plantType: 'Chilli', disease: 'Anthracnose', followUp: { nextCheckDate: '2020-01-01', history: [] } }]} />);
        fireEvent.click(screen.getByRole('button', { name: 'Re-check: Chilli – Anthracnose' }));
        expect(onOpenScan).toHaveBeenCalledWith('s1');
        expect(screen.getByText('Safe to harvest from today: Mancozeb')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(screen.queryByText(/Mancozeb/)).not.toBeInTheDocument();
    });
});
