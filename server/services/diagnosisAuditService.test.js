// @vitest-environment node
import { beforeEach, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ client: { from: vi.fn(), storage: { from: vi.fn() } }, queryNeon: vi.fn() }));
vi.mock('../utils/dataCollector.js', () => ({ getAuditClient: () => mocks.client }));
vi.mock('../utils/neonDatabase.js', () => ({ queryNeon: mocks.queryNeon }));
import { pruneDiagnosisAudit } from './diagnosisAuditService.js';
beforeEach(() => { vi.clearAllMocks(); mocks.queryNeon.mockReset(); });

it('deletes only expired audit records and their private training images', async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    mocks.client.storage.from.mockReturnValue({ remove });
    mocks.queryNeon.mockImplementation((sql) => sql.includes('diagnosis_training_logs')
        ? { rows: mocks.queryNeon.mock.calls.filter(([text]) => text.includes('diagnosis_training_logs')).length === 1 ? [{ id: 'old', images: { tree: 'training/old_tree.jpg' } }] : [] }
        : { rows: [{ id: 'feedback-1' }] });
    const result = await pruneDiagnosisAudit(90);
    expect(result.deletedScans).toBe(1);
    expect(remove).toHaveBeenCalledWith(['training/old_tree.jpg']);
    expect(mocks.queryNeon).toHaveBeenCalledWith(expect.stringContaining('delete from public.diagnosis_training_logs'), ['old']);
    expect(result.deletedFeedback).toBe(1);
});
it('refuses an invalid retention window', async () => {
    await expect(pruneDiagnosisAudit(0)).rejects.toThrow('Retention');
    expect(mocks.client.from).not.toHaveBeenCalled();
});
it('stops before deleting anything when an image path is outside the audit folder', async () => {
    mocks.queryNeon.mockResolvedValue({ rows: [{ id: 'old', images: { tree: 'user-id/main.jpg' } }] });
    await expect(pruneDiagnosisAudit(90)).rejects.toThrow('Unexpected audit image path');
    expect(mocks.client.storage.from).not.toHaveBeenCalled();
});
