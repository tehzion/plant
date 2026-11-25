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

const renderOverview = (overrides = {}) => {
    const props = {
        alerts: [],
        acknowledgedIds: [],
        notes: [],
        scanHistory: [{ id: 'scan-123', disease: 'Leaf Blight', category: 'Coconut', created_at: '2026-03-28T00:00:00.000Z' }],
        t,
        stats: { scannedThisMonth: 1 },
        hasLoggedToday: true,
        streak: 0,
        setTab: vi.fn(),
        setAddingNote: vi.fn(),
        complianceNudges: [],
        setNoteForm: vi.fn(),
        emptyForm: { activity_type: '' },
        navigate: vi.fn(),
        assessingRisk: false,
        predictiveRisk: null,
        forecast: [],
        checklistPct: 13,
        plots: [{ id: 'plot-1' }],
        relDate: () => 'Today',
        onSelectAlert: vi.fn(),
        onGenerateInsights: vi.fn(),
        generatingInsights: false,
        aiInsights: null,
        onPrefillRecommendedTreatment: vi.fn(),
        ...overrides,
    };
    render(<OverviewTab {...props} />);
    return props;
};

describe('OverviewTab', () => {
    it('offers one log button that opens the daily log form, instead of a button per activity type', () => {
        const props = renderOverview();

        expect(screen.queryByRole('button', { name: /profile\.actSpray|Spray/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /home\.addActivity|Log activity/ }));

        expect(props.setNoteForm).toHaveBeenCalledWith({ activity_type: '' });
        expect(props.setAddingNote).toHaveBeenCalledWith(true);
        expect(props.setTab).toHaveBeenCalledWith('notes');
    });

    it('shows the most urgent alert as the single next step', () => {
        const alert = { id: 'scan-9', disease: 'Leaf Blight' };
        const props = renderOverview({ alerts: [alert] });

        fireEvent.click(screen.getByRole('button', { name: /profile\.reviewNow|Review now/ }));

        expect(props.onSelectAlert).toHaveBeenCalledWith(alert);
    });
});
