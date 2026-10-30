import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/i18n.jsx';
import DataConsentToggle from './DataConsentToggle';
import { getDataConsent } from '../utils/dataConsent';

const renderToggle = () => render(
    <MemoryRouter><LanguageProvider><DataConsentToggle /></LanguageProvider></MemoryRouter>,
);

describe('DataConsentToggle', () => {
    beforeEach(() => localStorage.clear());

    it('is unticked by default and records an explicit opt-in', () => {
        renderToggle();
        const box = screen.getByRole('checkbox');
        expect(box).not.toBeChecked();
        expect(getDataConsent().aiImprovement).toBe(false);
        fireEvent.click(box);
        expect(getDataConsent().aiImprovement).toBe(true);
        fireEvent.click(box);
        expect(getDataConsent().aiImprovement).toBe(false);
    });

    it('asks again when the stored answer is for older wording', () => {
        localStorage.setItem('agropreneur.dataConsent', JSON.stringify({ aiImprovement: true, version: 'old' }));
        renderToggle();
        expect(screen.getByRole('checkbox')).not.toBeChecked();
    });
});
