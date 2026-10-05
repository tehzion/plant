// @vitest-environment node
import { beforeEach, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ client: { from: vi.fn(), storage: { from: vi.fn() } } }));
vi.mock('../utils/dataCollector.js', () => ({ getAuditClient: () => mocks.client }));
import { pruneDiagnosisAudit } from './diagnosisAuditService.js';
beforeEach(() => vi.clearAllMocks());

it('deletes only expired audit records and their private training images', async () => {
    const scans = { select: vi.fn().mockReturnThis(), lt: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce({ data: [{ id: 'old', images: { tree: 'training/old_tree.jpg' } }] }).mockResolvedValueOnce({ data: [] }),
        delete: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ error: null }) };
    const feedback = { delete: vi.fn().mockReturnThis(), lt: vi.fn().mockResolvedValue({ error: null }) };
    const remove = vi.fn().mockResolvedValue({ error: null });
    mocks.client.from.mockImplementation((table) => table === 'diagnosis_training_logs' ? scans : feedback);
    mocks.client.storage.from.mockReturnValue({ remove });
    const result = await pruneDiagnosisAudit(90);
    expect(result.deletedScans).toBe(1);
    expect(remove).toHaveBeenCalledWith(['training/old_tree.jpg']);
    expect(scans.in).toHaveBeenCalledWith('id', ['old']);
    expect(feedback.lt).toHaveBeenCalledWith('created_at', result.cutoff);
});
it('refuses an invalid retention window', async () => {
    await expect(pruneDiagnosisAudit(0)).rejects.toThrow('Retention');
    expect(mocks.client.from).not.toHaveBeenCalled();
});
it('stops before deleting anything when an image path is outside the audit folder', async () => {
    const query = { select: vi.fn().mockReturnThis(), lt: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [{ id: 'old', images: { tree: 'user-id/main.jpg' } }] }) };
    mocks.client.from.mockReturnValue(query);
    await expect(pruneDiagnosisAudit(90)).rejects.toThrow('Unexpected audit image path');
    expect(mocks.client.storage.from).not.toHaveBeenCalled();
});
