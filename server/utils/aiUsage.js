import { AsyncLocalStorage } from 'node:async_hooks';

// Collects token usage (and OpenRouter cost) for every AI call made while a
// request is being handled, so one scan's total can be logged with it.
const usageStorage = new AsyncLocalStorage();

const emptyTotals = () => ({ calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: null });

export const trackAiUsage = (operation) => {
    const totals = emptyTotals();
    return usageStorage.run(totals, async () => ({ result: await operation(), usage: totals }));
};

export const recordAiUsage = (usage) => {
    const totals = usageStorage.getStore();
    if (!totals || !usage) return;
    totals.calls += 1;
    totals.promptTokens += Number(usage.prompt_tokens) || 0;
    totals.completionTokens += Number(usage.completion_tokens) || 0;
    totals.totalTokens += Number(usage.total_tokens) || 0;
    // OpenRouter reports the charged amount in credits (USD) as usage.cost.
    const cost = Number(usage.cost);
    if (Number.isFinite(cost)) totals.costUsd = Math.round(((totals.costUsd || 0) + cost) * 1e6) / 1e6;
};
