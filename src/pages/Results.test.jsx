vi.mock('../components/ScanFollowUpTracker.jsx', () => ({ default: () => null }));
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Results from './Results.jsx';
import { SCAN_FOLLOW_UP_DRAFT_KEY } from '../utils/scanFollowUpDraft.js';

const navigateMock = vi.fn();
const getScanByIdMock = vi.fn();
const productRecommendationProps = vi.hoisted(() => []);
const fetchLiveProductRecommendationsMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'scan-123' }),
  useNavigate: () => navigateMock,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('../utils/localStorage', () => ({
  getScanById: (...args) => getScanByIdMock(...args),
}));

vi.mock('../i18n/i18n.jsx', async () => {
  const { default: translations } = await import('../i18n/translations.js');
  return { useLanguage: () => ({ language: 'en', t: key => key.split('.').reduce((value, part) => value?.[part], translations.en) || key }) };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

vi.mock('../utils/pdfGenerator', () => ({
  generatePDFReport: vi.fn(),
}));

vi.mock('../utils/toast', () => ({
  showToast: vi.fn(),
}));

vi.mock('../utils/liveProductRecommendations.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchLiveProductRecommendations: fetchLiveProductRecommendationsMock.mockImplementation(async () => ({
      diseaseControl: [],
      fertilizers: [],
      supplements: [],
      otherPopular: [],
      fallbackMeta: null,
      recommendationIntent: '',
      consultation: null,
      storeUrl: '',
    })),
  };
});

vi.mock('../components/QuickActions', () => ({
  default: () => <div data-testid="quick-actions" />,
}));

vi.mock('../components/TabbedResults', () => ({
  default: ({ tabs }) => <div data-testid="tabbed-results">{tabs.map((tab) => <div key={tab.id}>{tab.content}</div>)}</div>,
}));

vi.mock('../components/DiseaseResult', () => ({
  default: ({ image, leafImage }) => (
    <div data-testid="disease-result">
      <span data-testid="tree-image">{image || ''}</span>
      <span data-testid="leaf-image">{leafImage || ''}</span>
    </div>
  ),
}));

vi.mock('../components/TreatmentRecommendations', () => ({
  default: () => <div />,
}));

vi.mock('../components/NutritionalAnalysis', () => ({
  default: () => <div />,
}));

vi.mock('../components/ProductRecommendations', () => ({
  default: (props) => {
    productRecommendationProps.push(props);
    return <div data-testid={`product-${props.displayMode || 'all'}`} data-has-shared-state={String(Boolean(props.recommendationState))} />;
  },
}));

vi.mock('../components/HealthyCarePlan', () => ({
  default: () => <div />,
}));

vi.mock('../components/FeedbackWidget', () => ({
  default: () => <div />,
}));

describe('Results', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    getScanByIdMock.mockReset();
    sessionStorage.clear();
    productRecommendationProps.length = 0;
    fetchLiveProductRecommendationsMock.mockReset();
    fetchLiveProductRecommendationsMock.mockResolvedValue({
      diseaseControl: [],
      fertilizers: [],
      supplements: [],
      otherPopular: [],
      fallbackMeta: null,
      recommendationIntent: '',
      consultation: null,
      storeUrl: '',
    });
  });

  it('passes persisted image URLs into the disease result view', async () => {
    getScanByIdMock.mockResolvedValue({
      id: 'scan-123',
      disease: 'Leaf Blight',
      plantType: 'Coconut',
      healthStatus: 'unhealthy',
      image_url: 'https://example.com/tree.jpg',
      leaf_image_url: 'https://example.com/leaf.jpg',
    });

    render(<Results />);

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /plant photo/i })).toHaveAttribute('src', 'https://example.com/tree.jpg');
    });
  });

  it('says this scan is missing, not that history is empty, when lookup fails', async () => {
    getScanByIdMock.mockRejectedValue(new Error('lookup failed'));

    render(<Results />);

    expect(await screen.findByRole('heading', { name: 'Scan not found' })).toBeInTheDocument();
    expect(screen.getByText(/This scan is not saved on this phone/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(navigateMock).toHaveBeenCalledWith('/history');

    fireEvent.click(screen.getByRole('button', { name: 'Check plant health' }));
    expect(navigateMock).toHaveBeenCalledWith('/?scan=true');
  });

  it('saves a follow-up draft and navigates to the profile daily log', async () => {
    getScanByIdMock.mockResolvedValue({
      id: 'scan-123',
      disease: 'Leaf Blight',
      plantType: 'Coconut',
      healthStatus: 'unhealthy',
      analysisLanguage: 'en',
      severity: 'moderate',
      confidence: 88,
      status: 'high_confidence',
      pathogenType: 'Fungal',
      immediateActions: ['Remove infected leaves'],
      treatments: ['Apply labeled fungicide'],
    });

    render(<Results />);

    fireEvent.click(await screen.findByText('More details', { selector: 'summary' }));
    fireEvent.click(await screen.findByRole('button', { name: /log care/i }));

    const stored = JSON.parse(sessionStorage.getItem(SCAN_FOLLOW_UP_DRAFT_KEY));
    expect(stored.draft).toMatchObject({
      activity_type: 'note',
      disease_name_observed: 'Leaf Blight',
      scout_severity: 'Moderate',
      expense_category: 'Labor',
    });
    expect(stored.draft.note).toContain('Select the actual activity');
    expect(navigateMock).toHaveBeenCalledWith('/profile?tab=notes&draft=scan-follow-up');
  });

  it('passes one shared recommendation state to disease and nutrition product views', async () => {
    getScanByIdMock.mockResolvedValue({
      id: 'scan-shared-products',
      disease: 'Fungal leaf spot',
      plantType: 'Durian',
      healthStatus: 'unhealthy',
      status: 'confirmed',
      resultState: 'confident_treatment',
      confidence: 92,
      pathogenType: 'fungal',
      nutritionalIssues: {
        status: 'possible',
        possibleNutrients: ['Magnesium'],
      },
    });

    render(<Results />);

    fireEvent.click(await screen.findByText('More details', { selector: 'summary' }));
    await waitFor(() => {
      const diseaseView = productRecommendationProps.find((props) => props.displayMode === 'disease');
      const nutritionView = productRecommendationProps.find((props) => props.displayMode === 'nutrition');
      expect(diseaseView).toBeTruthy();
      expect(nutritionView).toBeTruthy();
      expect(diseaseView.recommendationState).toBe(nutritionView.recommendationState);
    });

    expect(fetchLiveProductRecommendationsMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('product-disease')).toHaveAttribute('data-has-shared-state', 'true');
    expect(screen.getByTestId('product-nutrition')).toHaveAttribute('data-has-shared-state', 'true');
  });
  it.each([
    ['retake_required', 'Unknown', 0, 'We need a clearer photo', 'Retake photo'],
    ['uncertain', 'Possible leaf spot', 52, 'An expert should check this', 'Ask an expert'],
    ['healthy', 'Healthy plant', 93, 'Your plant looks healthy', 'Set a re-check'],
    ['confident_treatment', 'Rice blast', 88, 'Rice blast', 'Start treatment plan'],
  ])('gives %s its own headline and next action', async (resultState, disease, confidence, headline, action) => {
    getScanByIdMock.mockResolvedValue({ id: 'scan-123', resultState, disease, confidence,
      healthStatus: resultState === 'healthy' ? 'healthy' : 'unhealthy', pathogenType: 'Fungal',
      ...(resultState === 'retake_required' ? { requiresRetake: true, retakeReason: 'Photo out of focus' } : {}),
      treatments: ['Labelled product: 2 ml per litre'], immediateActions: ['Check nearby plants'],
    });
    render(<Results />);
    expect(await screen.findByRole('heading', { level: 1, name: headline })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: action })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    if (['retake_required', 'uncertain'].includes(resultState)) {
      fireEvent.click(screen.getByText('More details', { selector: 'summary' }));
      expect(screen.queryByTestId('product-disease')).not.toBeInTheDocument();
      expect(screen.queryByText('Labelled product: 2 ml per litre')).not.toBeInTheDocument();
    }
    if (resultState === 'confident_treatment') {
      expect(screen.getByText('Labelled product: 2 ml per litre')).toBeVisible();
      expect(screen.getByText(/Follow the product label for the dose/)).toBeVisible();
    }
    if (resultState === 'healthy') expect(screen.queryByText(/Severity:/)).not.toBeInTheDocument();
  });

});
