import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DiseaseCard from './DiseaseCard.jsx';

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        language: 'en',
        t: (key) => ({
            'common.unknown': 'Unknown',
            'encyclopedia.close': 'Close',
            'encyclopedia.showMore': 'Show more',
            'encyclopedia.pathogen': 'Pathogen',
            'encyclopedia.causes': 'Causes',
            'encyclopedia.treatment': 'Treatment',
            'encyclopedia.prevention': 'Prevention',
        }[key] || key),
    }),
}));

describe('DiseaseCard', () => {
    it('renders safely when category is missing', () => {
        render(
            <DiseaseCard
                disease={{
                    name: 'Leaf Spot',
                    symptoms: 'Brown lesions on leaves',
                    causes: 'Humid conditions',
                    treatment: ['Remove infected leaves'],
                    prevention: ['Improve airflow'],
                }}
            />,
        );

        expect(screen.getByText('Leaf Spot')).toBeInTheDocument();
        expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('uses the standard close button icon path on mobile modal', () => {
        render(
            <DiseaseCard
                disease={{
                    name: 'Leaf Spot',
                    category: 'Fungal',
                    symptoms: 'Brown lesions on leaves',
                    causes: 'Humid conditions',
                    treatment: ['Remove infected leaves'],
                    prevention: ['Improve airflow'],
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Show more' }));

        const closeButtons = screen.getAllByRole('button', { name: 'Close' });

        expect(closeButtons).toHaveLength(2);
        expect(closeButtons[1]).toHaveAttribute('aria-label', 'Close');
    });
});
