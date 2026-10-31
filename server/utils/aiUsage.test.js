import { describe, expect, it } from 'vitest';
import { recordAiUsage, trackAiUsage } from './aiUsage.js';

describe('aiUsage', () => {
    it('sums usage across calls made inside one tracked operation', async () => {
        const { result, usage } = await trackAiUsage(async () => {
            recordAiUsage({ prompt_tokens: 100, completion_tokens: 20, total_tokens: 120, cost: 0.0011 });
            await Promise.resolve();
            recordAiUsage({ prompt_tokens: 50, completion_tokens: 10, total_tokens: 60, cost: 0.0004 });
            return 'done';
        });
        expect(result).toBe('done');
        expect(usage).toEqual({ calls: 2, promptTokens: 150, completionTokens: 30, totalTokens: 180, costUsd: 0.0015 });
    });

    it('leaves cost null when the provider does not report it', async () => {
        const { usage } = await trackAiUsage(async () => recordAiUsage({ prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }));
        expect(usage.costUsd).toBeNull();
    });

    it('ignores usage recorded outside a tracked operation and keeps operations separate', async () => {
        recordAiUsage({ total_tokens: 999 });
        const [a, b] = await Promise.all([
            trackAiUsage(async () => recordAiUsage({ total_tokens: 5 })),
            trackAiUsage(async () => recordAiUsage({ total_tokens: 7 })),
        ]);
        expect(a.usage.totalTokens).toBe(5);
        expect(b.usage.totalTokens).toBe(7);
    });
});
