import { beforeEach, describe, expect, it } from 'vitest';
import { addHarvestReminder, dismissHarvestReminder, dueHarvestReminders, getFieldAnswers, getLogDefaults, rememberLogDefaults, saveFieldAnswer } from './farmerPrefs.js';

beforeEach(() => localStorage.clear());

describe('farmer preferences', () => {
    it('saves field answers per scan', () => {
        saveFieldAnswer('scan-1', 'When did it start?', 'yes');
        expect(getFieldAnswers('scan-1')).toMatchObject({ 'When did it start?': 'yes' });
        expect(getFieldAnswers('scan-2')).toEqual({});
    });

    it('remembers only plot, crop and operator for the next log', () => {
        rememberLogDefaults({ plot_id: 'Block A', crop: 'Chilli', operator: 'Ali', quantity: '2 tanks', notes: 'x' });
        expect(getLogDefaults()).toEqual({ plot_id: 'Block A', crop: 'Chilli', operator: 'Ali' });
    });

    it('returns harvest reminders that are due and lets them be dismissed', () => {
        addHarvestReminder({ date: '2026-10-30', name: 'Mancozeb' });
        addHarvestReminder({ date: '2099-01-01', name: 'Later' });
        expect(addHarvestReminder({ date: 'soon', name: 'bad' })).toBe(false);
        const due = dueHarvestReminders(new Date('2026-10-31T09:00:00'));
        expect(due.map((item) => item.name)).toEqual(['Mancozeb']);
        dismissHarvestReminder(due[0].id);
        expect(dueHarvestReminders(new Date('2026-10-31T09:00:00'))).toEqual([]);
    });

    it('survives unavailable storage', () => {
        const original = Storage.prototype.getItem;
        Storage.prototype.getItem = () => { throw new Error('blocked'); };
        expect(getFieldAnswers('scan-1')).toEqual({});
        Storage.prototype.getItem = original;
    });
});
