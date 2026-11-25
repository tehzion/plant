import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HeroSection from './HeroSection.jsx';

vi.mock('../../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => ({
            'common.farmer': 'Farmer',
            'common.location': 'Location',
            'common.setLocationShort': 'Set',
            'common.locationNA': 'Location N/A',
            'common.retry': 'Try Again',
            'profile.weatherForecast': 'Weather Forecast',
            'profile.weatherErrorNetwork': 'Could not reach the weather service.',
            'profile.weatherUsingCached': 'Showing a recent saved forecast.',
        }[key] || key),
    }),
}));

const renderHero = (props = {}) => render(
    <HeroSection greeting="Good evening" onLocationClick={vi.fn()} {...props} />,
);

describe('HeroSection', () => {
    it('asks for a location instead of showing N/A', () => {
        renderHero({ locationName: 'common.locationNA' });

        expect(screen.getByRole('button', { name: 'Location: Set' })).toBeInTheDocument();
        expect(screen.queryByText('Location N/A')).not.toBeInTheDocument();
    });

    it('turns failed weather into a retry button with no red note', () => {
        const onWeatherRetry = vi.fn();
        renderHero({ weatherTemp: null, weatherError: 'profile.weatherErrorNetwork', onWeatherRetry });

        const retry = screen.getByRole('button', { name: 'Could not reach the weather service. Try Again' });
        fireEvent.click(retry);

        expect(onWeatherRetry).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('--')).not.toBeInTheDocument();
        expect(document.querySelector('.weather-error-note')).toBeNull();
    });

    it('keeps the temperature and a quiet note when a saved forecast is shown', () => {
        renderHero({ weatherTemp: 31, weatherError: 'profile.weatherUsingCached' });

        expect(screen.getByText('31°C')).toBeInTheDocument();
        expect(screen.getByText('Showing a recent saved forecast.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Try Again/ })).not.toBeInTheDocument();
    });
});
