import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FeedbackWidget from './FeedbackWidget.jsx';

const { showToastMock } = vi.hoisted(() => ({
  showToastMock: vi.fn(),
}));

vi.mock('../i18n/i18n.jsx', () => ({
  useLanguage: () => ({
    t: (key) => ({
      'feedback.title': 'Review this result',
      'feedback.description': 'Tell us if the diagnosis looks right, or share a correction.',
      'feedback.correct': 'Looks correct',
      'feedback.needsCorrection': 'Needs correction',
      'feedback.issueLabel': 'What seems off?',
      'feedback.issuePlaceholder': 'Select an issue',
      'feedback.correctCropLabel': 'Correct crop (optional)',
      'feedback.correctDiseaseLabel': 'Correct disease (optional)',
      'feedback.noteLabel': 'Notes (optional)',
      'feedback.submit': 'Submit review',
      'feedback.submitting': 'Submitting...',
      'feedback.thankYou': 'Thank you for your feedback!',
      'feedback.quickTitle': 'Is this result right?',
      'feedback.yesCorrect': 'Yes, correct',
      'feedback.noWrong': 'No, it is wrong',
      'feedback.sendCorrection': 'Send correction',
      'feedback.thankYouCorrection': 'Thank you. Our team will check it.',
      'feedback.issueTypes.wrong_disease': 'Wrong disease',
      'feedback.issueTypes.wrong_species': 'Wrong species',
      'feedback.issueTypes.wrong_severity': 'Wrong severity',
      'feedback.issueTypes.bad_treatment': 'Bad treatment advice',
      'feedback.issueTypes.bad_language': 'Bad language',
      'feedback.issueTypes.poor_image': 'Poor image quality',
    }[key] || key),
  }),
}));

vi.mock('../utils/toast', () => ({
  showToast: showToastMock,
}));

vi.mock('../utils/neonApi.js', () => ({
  getNeonAccessToken: vi.fn(async () => ''),
}));

describe('FeedbackWidget', () => {
  beforeEach(() => {
    window.localStorage.clear();
    showToastMock.mockReset();
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ message: 'ok' }),
    }));
  });

  it('submits structured correction feedback', async () => {
    render(<FeedbackWidget scanId="scan-1" scan={{ plantType: 'Banana', disease: 'Leaf Spot', feedbackToken: 'v1.token' }} />);

    expect(screen.queryByRole('button', { name: 'Send correction' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'No, it is wrong' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'wrong_disease' } });

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Banana' } });
    fireEvent.change(inputs[1], { target: { value: 'Potassium deficiency' } });
    fireEvent.change(inputs[2], { target: { value: 'Older leaves were yellow first.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Send correction' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const [, request] = global.fetch.mock.calls[0];
    const payload = JSON.parse(request.body);

    expect(payload.scanId).toBe('scan-1');
    expect(payload.wasCorrect).toBe(false);
    expect(payload.issueType).toBe('wrong_disease');
    expect(payload.correctDisease).toBe('Potassium deficiency');
    // Feedback attribution: the scan capability travels with the submission.
    expect(payload.feedbackToken).toBe('v1.token');
    expect(request.headers.Authorization).toBeUndefined();
    expect(await screen.findByRole('status')).toHaveTextContent('Our team will check it');
  });

  it('sends "correct" in one tap and does not ask again for the same scan', async () => {
    const { unmount } = render(<FeedbackWidget scanId="scan-2" scan={{ feedbackToken: 'v1.token' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, correct' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Thank you for your feedback!');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(payload).toMatchObject({ scanId: 'scan-2', wasCorrect: true, rating: 5, comment: 'correct' });
    expect(payload.issueType).toBeUndefined();

    unmount();
    render(<FeedbackWidget scanId="scan-2" scan={{ feedbackToken: 'v1.token' }} />);
    expect(screen.queryByRole('button', { name: 'Yes, correct' })).toBeNull();
  });

  it('lets the farmer try again after a failed send', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    render(<FeedbackWidget scanId="scan-3" scan={{ feedbackToken: 'v1.token' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, correct' }));
    await waitFor(() => expect(showToastMock).toHaveBeenCalledWith(expect.anything(), 'error'));
    expect(screen.getByRole('button', { name: 'Yes, correct' })).not.toBeDisabled();
  });

  it('explains why feedback cannot be sent for an older scan instead of failing', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) }));
    render(<FeedbackWidget scanId="old-scan" scan={{ disease: 'Leaf Spot' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, correct' }));
    expect(await screen.findByRole('status')).toHaveTextContent('not available for scans saved before');
    expect(showToastMock).not.toHaveBeenCalledWith(expect.anything(), 'error');
  });
});
