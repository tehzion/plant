import { describe, expect, it } from 'vitest';
import { buildFarmTimeline } from './farmTimeline.js';

describe('farm timeline', () => {
    const plots = [{ id: 'p1', name: 'Block A' }, { id: 'p2', name: 'Block B' }];

    it('groups scans, follow-ups, myGAP logs and notes by plot, newest first', () => {
        const groups = buildFarmTimeline({
            plots,
            scans: [{ id: 's1', plotId: 'p1', disease: 'Leaf spot', timestamp: '2026-10-01T08:00:00Z',
                followUp: { history: [{ id: 'f1', recordedAt: '2026-10-06T08:00:00Z', outcome: 'improving' }] } }],
            logs: [{ id: 'l1', plot_id: 'block a', type: 'pesticide', product_used: 'Copper', activity_date: '2026-10-02' }],
            notes: [{ id: 'n1', plot_id: 'p2', activity_type: 'harvest', note: '20kg', created_at: '2026-10-03T00:00:00Z' }],
        });
        expect(groups.map((group) => group.name)).toEqual(['Block A', 'Block B']);
        expect(groups[0].events.map((event) => event.kind)).toEqual(['followUp', 'log', 'scan']);
        expect(groups[0].events[1].detail).toBe('Copper');
    });

    it('keeps free-text plots and puts unassigned records last', () => {
        const groups = buildFarmTimeline({
            scans: [{ id: 's1', timestamp: '2026-10-05T00:00:00Z' }],
            logs: [{ id: 'l1', plot_id: 'Kebun Ayah', type: 'fertilizer', timestamp: '2026-10-01T00:00:00Z', syncStatus: 'pending' }],
        });
        expect(groups.map((group) => [group.name, group.noPlot])).toEqual([['Kebun Ayah', false], ['', true]]);
        expect(groups[0].events[0].pending).toBe(true);
    });

    it('ignores records without a usable date', () => {
        expect(buildFarmTimeline({ logs: [{ id: 'x', type: 'harvest' }] })).toEqual([]);
    });
});
