import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import UserDashboardPanel from './UserDashboardPanel.jsx';

const navigateMock = vi.fn();
const signOutMock = vi.fn();

const translationMap = {
    'profile.tabOverview': 'Overview',
    'profile.tabReports': 'Reports',
    'profile.tabPlots': 'Plots',
    'profile.tabNotes': 'Daily Log',
    'profile.tabProducts': 'Products',
    'profile.productsCatalogSubtitle': 'Browse the live MojoSense catalog without leaving your dashboard.',
    'profile.openFullCatalog': 'Open Full Catalog',
    'nav.shop': 'Shop',
    'home.onlineStatus': 'Online',
    'common.signOut': 'Sign out',
    'profile.verifiedFarmer': 'Verified Farmer',
    'profile.totalScans': 'Scans',
    'profile.healthy': 'Healthy',
    'profile.diseased': 'Issues',
    'profile.plots': 'Plots',
    'common.save': 'Save',
};

vi.mock('lucide-react', async () => {
    const React = await import('react');
    const Icon = ({ children, ...props }) => React.createElement('svg', props, children);
    return {
        LogOut: Icon,
        MapPinned: Icon,
        NotebookPen: Icon,
        ShieldCheck: Icon,
        ShoppingBag: Icon,
        ScanLine: Icon,
        Calendar: Icon,
        Microscope: Icon,
        FlaskConical: Icon,
        Wheat: Icon,
        MapPin: Icon,
        BarChart2: Icon,
        BarChart3: Icon,
        LayoutDashboard: Icon,
        Leaf: Icon,
        User: Icon,
    };
});

vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateMock,
}));

vi.mock('../i18n/i18n.jsx', () => ({
    useLanguage: () => ({
        t: (key) => translationMap[key],
        label: (key, fallback) => translationMap[key] ?? fallback,
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
        notifyWarning: vi.fn(),
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
        generatingInsightsScopeKey: null,
        enhancing: false,
        enhanceText: '',
        setEnhanceText: vi.fn(),
        handleGenerateInsights: vi.fn(),
        handleAutoEnhance: vi.fn(),
    }),
}));

vi.mock('../utils/localStorage', () => ({
    consumeStorageCleanupNotice: vi.fn(() => null),
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

vi.mock('./dashboard/ProductsTab', () => ({
    default: () => <div data-testid="products-tab">Products tab</div>,
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
        const overviewButton = screen.getByRole('button', { name: /Overview/ });
        expect(overviewButton).toBeInTheDocument();
        expect(within(overviewButton).getByText('1')).toBeInTheDocument();
    });

    it('switches between extracted tabs from the dashboard shell', async () => {
        render(<UserDashboardPanel />);

        fireEvent.click(screen.getByRole('button', { name: 'Reports' }));

        expect(await screen.findByTestId('reports-tab')).toBeInTheDocument();
    });

    it('prefills a recommended treatment and switches into the notes tab', async () => {
        render(<UserDashboardPanel />);

        fireEvent.click(screen.getByRole('button', { name: 'Prefill treatment' }));

        expect(await screen.findByTestId('notes-tab')).toHaveTextContent('spray|Copper|Risk warning');
    });

    it('renders the products tab after switching from the dashboard shell', async () => {
        render(<UserDashboardPanel />);

        fireEvent.click(screen.getByRole('button', { name: 'Products' }));

        expect(await screen.findByTestId('products-tab')).toBeInTheDocument();
    });
});
