import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import UserDashboardPanel from './UserDashboardPanel.jsx';

const navigateMock = vi.fn();
const signOutMock = vi.fn();

const translationMap = {
    'profile.tabOverview': 'Overview',
    'profile.tabReports': 'Reports',
    'profile.tabPlots': 'Plots',
    'profile.tabNotes': 'Daily Log',
    'home.onlineStatus': 'Online',
    'common.signOut': 'Sign out',
    'profile.verifiedFarmer': 'Verified Farmer',
    'profile.totalScans': 'Scans',
    'profile.healthy': 'Healthy',
    'profile.diseased': 'Issues',
    'profile.plots': 'Plots',
    'common.save': 'Save',
};

vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateMock,
}));

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => translationMap[key],
    }),
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'user-1', email: 'farmer@example.com' },
        signOut: signOutMock,
    }),
}));

vi.mock('../hooks/useLocation', () => ({
    useLocation: () => ({
        getLocation: vi.fn().mockResolvedValue({ lat: 3.14, lng: 101.68 }),
    }),
}));

vi.mock('../hooks/useWeather', () => ({
    useWeather: () => ({
        forecast: [],
        fetchWeather: vi.fn(),
    }),
}));

vi.mock('../context/NotificationProvider.jsx', () => ({
    useNotifications: () => ({
        notify: vi.fn(),
        notifyError: vi.fn(),
        notifySuccess: vi.fn(),
    }),
}));

vi.mock('../hooks/useFarmStats', () => ({
    useFarmStats: () => ({
        stats: { total: 4, healthy: 3, diseases: 1, scannedThisMonth: 2, accuracy: 91 },
        scanHistory: [{ id: 'scan-1', disease: 'Leaf Rust', category: 'Fruits', created_at: new Date().toISOString() }],
        checklistPct: 78,
        hasLoggedToday: false,
        streak: 5,
        complianceNudges: [],
        alerts: [{ id: 'alert-1', disease: 'Leaf Rust', category: 'Fruits', created_at: new Date().toISOString() }],
        notes: [],
        setNotes: vi.fn(),
        plots: [{ id: 'plot-1', name: 'Plot A', cropType: 'Durian' }],
        setPlots: vi.fn(),
        acknowledgedIds: [],
        setAcknowledgedIds: vi.fn(),
        assessingRisk: false,
        predictiveRisk: null,
    }),
}));

vi.mock('../hooks/useAIAdvisor', () => ({
    useAIAdvisor: () => ({
        aiInsights: null,
        generatingInsights: false,
        enhancing: false,
        enhanceText: '',
        setEnhanceText: vi.fn(),
        handleGenerateInsights: vi.fn(),
        handleAutoEnhance: vi.fn(),
    }),
}));

vi.mock('../utils/localStorage', () => ({
    saveDailyNote: vi.fn(),
    savePlot: vi.fn(),
    deletePlot: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
    supabase: null,
}));

vi.mock('./dashboard/OverviewTab', () => ({
    default: ({ onPrefillRecommendedTreatment }) => (
        <div data-testid="overview-tab">
            <button onClick={() => onPrefillRecommendedTreatment('Risk warning', { activity: 'spray', chemical: 'Copper' })}>
                Prefill treatment
            </button>
        </div>
    ),
}));

vi.mock('./dashboard/ReportsTab', () => ({
    default: () => <div data-testid="reports-tab">Reports tab</div>,
}));

vi.mock('./dashboard/PlotsTab', () => ({
    default: () => <div data-testid="plots-tab">Plots tab</div>,
}));

vi.mock('./dashboard/NotesTab', () => ({
    default: ({ noteForm }) => (
        <div data-testid="notes-tab">
            {noteForm.activity_type}|{noteForm.chemical_name}|{noteForm.note}
        </div>
    ),
}));

vi.mock('./AlertDetailModal', () => ({
    default: () => <div data-testid="alert-modal">Alert modal</div>,
}));

describe('UserDashboardPanel', () => {
    beforeEach(() => {
        navigateMock.mockReset();
        signOutMock.mockReset();
    });

    it('renders the overview tab and alert badge by default', () => {
        render(<UserDashboardPanel />);

        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('switches between extracted tabs from the dashboard shell', () => {
        render(<UserDashboardPanel />);

        fireEvent.click(screen.getByRole('button', { name: 'Reports' }));

        expect(screen.getByTestId('reports-tab')).toBeInTheDocument();
    });

    it('prefills a recommended treatment and switches into the notes tab', () => {
        render(<UserDashboardPanel />);

        fireEvent.click(screen.getByRole('button', { name: 'Prefill treatment' }));

        expect(screen.getByTestId('notes-tab')).toHaveTextContent('spray|Copper|[AI Suggested] Risk warning');
    });
});
