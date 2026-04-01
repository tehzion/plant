import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OverviewTab from './OverviewTab.jsx';

vi.mock('lucide-react', async () => {
    const React = await import('react');
    const Icon = ({ children, ...props }) => React.createElement('svg', props, children);
    return {
        AlertTriangle: Icon,
        CheckCircle2: Icon,
        Calendar: Icon,
        MapPin: Icon,
        BrainCircuit: Icon,
        ShieldCheck: Icon,
        ScanLine: Icon,
        Sprout: Icon,
        Sun: Icon,
        Cloud: Icon,
        Sparkles: Icon,
        CheckSquare: Icon,
        Info: Icon,
        ChevronRight: Icon,
        BookOpen: Icon,
        Database: Icon,
        Leaf: Icon,
        ClipboardList: Icon,
        Search: Icon,
        FlaskConical: Icon,
        Droplets: Icon,
        Scissors: Icon,
        PackageCheck: Icon,
        Microscope: Icon,
        Wheat: Icon,
        BarChart2: Icon,
    };
});

const t = (key) => ({
    'profile.weatherForecast': 'Weather Forecast',
    'profile.weatherForecastUnavailable': 'Forecast will appear here after weather data is loaded.',
    'profile.recentScans': 'Recent Scans',
    'profile.noRecentHistory': 'No recent scans.',
    'profile.userGuide': 'User Guide',
    'profile.learnMore': 'How to use Plant',
    'profile.offlineDb': 'Disease DB',
    'profile.browseOffline': 'Search pests offline',
    'profile.analytics': 'Analytics',
    'profile.activePlots': 'active plots',
    'home.mygapTitle': 'myGAP Guide',
    'common.ready': 'Ready',
    'common.seeAll': 'See all',
    'common.today': 'Today',
}[key] || key);

describe('OverviewTab', () => {
    it('navigates to the scan results page when a recent scan row is clicked', () => {
        const navigate = vi.fn();
        const onSelectAlert = vi.fn();

        render(
            <OverviewTab
                alerts={[]}
                acknowledgedIds={[]}
                notes={[]}
                scanHistory={[{ id: 'scan-123', disease: 'Leaf Blight', category: 'Coconut', created_at: '2026-03-28T00:00:00.000Z' }]}
                t={t}
                stats={{ scannedThisMonth: 1 }}
                hasLoggedToday={false}
                streak={0}
                setTab={vi.fn()}
                setAddingNote={vi.fn()}
                complianceNudges={[]}
                setNoteForm={vi.fn()}
                emptyForm={{}}
                navigate={navigate}
                assessingRisk={false}
                predictiveRisk={null}
                forecast={[]}
                checklistPct={13}
                plots={[]}
                relDate={() => 'Today'}
                onSelectAlert={onSelectAlert}
                onGenerateInsights={vi.fn()}
                generatingInsights={false}
                aiInsights={null}
                onPrefillRecommendedTreatment={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Leaf Blight/i }));

        expect(navigate).toHaveBeenCalledWith('/results/scan-123');
        expect(onSelectAlert).not.toHaveBeenCalled();
    });
});
