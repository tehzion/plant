import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Results from './Results.jsx';

const navigateMock = vi.fn();
const getScanByIdMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'scan-123' }),
  useNavigate: () => navigateMock,
}));

vi.mock('../utils/localStorage', () => ({
  getScanById: (...args) => getScanByIdMock(...args),
}));

vi.mock('../i18n/i18n.jsx', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key) => ({
      'history.noHistory': 'No history',
      'history.noHistoryMessage': 'No saved scan found.',
      'common.back': 'Back',
      'results.diseaseInfo': 'Disease Info',
      'results.treatment': 'Treatment',
      'results.care': 'Care',
      'results.nutrition': 'Nutrition',
      'results.products': 'Products',
      'results.unknownDisease': 'Unknown disease',
      'common.unknown': 'Unknown',
    }[key] || key),
  }),
}));

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

vi.mock('../utils/liveProductRecommendations.js', () => ({
  createEmptyProductRecommendations: vi.fn(() => ({
    treatmentProducts: [],
    fertilizers: [],
    supplements: [],
    otherPopular: [],
    fallbackMeta: null,
  })),
  fetchLiveProductRecommendations: vi.fn(),
}));

vi.mock('../components/QuickActions', () => ({
  default: () => <div data-testid="quick-actions" />,
}));

vi.mock('../components/TabbedResults', () => ({
  default: ({ tabs }) => <div data-testid="tabbed-results">{tabs[0]?.content}</div>,
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
  default: () => <div />,
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
      expect(screen.getByTestId('tree-image')).toHaveTextContent('https://example.com/tree.jpg');
      expect(screen.getByTestId('leaf-image')).toHaveTextContent('https://example.com/leaf.jpg');
    });
  });

  it('shows the no-history state when scan lookup fails', async () => {
    getScanByIdMock.mockRejectedValue(new Error('lookup failed'));

    render(<Results />);

    await waitFor(() => {
      expect(screen.getByText('No history')).toBeInTheDocument();
      expect(screen.getByText('No saved scan found.')).toBeInTheDocument();
    });
  });
});
