import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExpertReviewPanel from './ExpertReviewPanel.jsx';

const api = vi.hoisted(() => ({ fetchReviewQueue: vi.fn(), fetchReviewCase: vi.fn(), submitReview: vi.fn() }));
vi.mock('../utils/expertReview.js', () => api);

describe('ExpertReviewPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.fetchReviewQueue.mockResolvedValue({ cases: [{ scanId: 'scan-1', category: 'Tomato', assessment: { disease: 'Early Blight', confidenceLevel: 'medium' }, farmerFeedbackCount: 1 }] });
        api.fetchReviewCase.mockResolvedValue({
            scanId: 'scan-1', category: 'Tomato', imageUrls: {},
            aiAssessment: { disease: 'Early Blight', confidenceLevel: 'medium', alternatives: [{ name: 'Septoria Leaf Spot', confidence_level: 'low' }], treatmentEligible: false },
            farmerFeedback: [{ wasCorrect: false, correctDisease: 'Septoria', verified: true }],
            expertReviews: [],
            products: [{ productId: 101, productName: 'Copper fungicide' }],
        });
        api.submitReview.mockResolvedValue({ review: { id: 'r1' } });
    });

    it('records a correction with a product verdict for the selected assessment', async () => {
        render(<ExpertReviewPanel />);
        fireEvent.click(await screen.findByRole('button', { name: /Early Blight/ }));
        expect(await screen.findByText(/Septoria Leaf Spot \(low\)/)).toBeInTheDocument();
        expect(screen.getByText(/Farmer says incorrect/)).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('Correct the diagnosis'));
        fireEvent.change(screen.getByLabelText('Correct diagnosis'), { target: { value: 'Septoria Leaf Spot' } });
        fireEvent.change(screen.getByLabelText('Professional notes'), { target: { value: 'Small grey-centred spots.' } });
        fireEvent.change(screen.getByLabelText('Verdict for Copper fungicide'), { target: { value: 'needs_more_information' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save review' }));
        await waitFor(() => expect(api.submitReview).toHaveBeenCalled());
        expect(api.submitReview).toHaveBeenCalledWith('scan-1', expect.objectContaining({
            verdict: 'corrected',
            correctedDiagnosis: 'Septoria Leaf Spot',
            notes: 'Small grey-centred spots.',
            productReviews: [{ productId: 101, productName: 'Copper fungicide', verdict: 'needs_more_information', note: '' }],
        }));
        expect(await screen.findByText(/original AI assessment is unchanged/)).toBeInTheDocument();
    });

    it('shows a server refusal to non-reviewers', async () => {
        api.fetchReviewQueue.mockRejectedValueOnce(new Error('This account is not an approved expert reviewer.'));
        render(<ExpertReviewPanel />);
        expect(await screen.findByRole('alert')).toHaveTextContent('not an approved expert reviewer');
    });
});
