import { describe, expect, it } from 'vitest';
import { buildFollowUpComparisonModel, getSeverityChange, sortFollowUpEvents } from './followUpComparison.js';

const copy = {
    improved: 'Improved',
    worsened: 'Worsened',
    unchangedSeverity: 'Unchanged',
    notRecorded: 'Not recorded',
};

describe('followUpComparison', () => {
    it('sorts newest follow-up first and keeps stable IDs', () => {
        const sorted = sortFollowUpEvents([
            { id: 'older', recordedAt: '2026-01-01T00:00:00Z' },
            { id: 'newer', recordedAt: '2026-02-01T00:00:00Z' },
        ]);
        expect(sorted.map(event => event.id)).toEqual(['newer', 'older']);
    });

    it('classifies severity changes without inferring a diagnosis outcome', () => {
        expect(getSeverityChange('severe', 'moderate', copy)).toEqual({ key: 'improved', label: 'Improved', direction: 'improved' });
        expect(getSeverityChange('mild', 'critical', copy).direction).toBe('worsened');
        expect(getSeverityChange('mild', '', copy).key).toBe('notRecorded');
    });

    it('keeps original evidence and maps the existing note to follow-up notes', () => {
        const model = buildFollowUpComparisonModel({
            scan: { image: 'original.jpg', disease: 'Leaf spot', symptoms: ['Spots'], severity: 'severe', timestamp: '2026-01-01' },
            event: { id: 'event-1', recordedAt: '2026-01-03', outcome: 'improving', severity: 'moderate', note: 'Fewer spots', photo: 'latest.jpg' },
            copy,
        });
        expect(model.original.image).toBe('original.jpg');
        expect(model.original.symptoms).toEqual(['Spots']);
        expect(model.latest.notes).toBe('Fewer spots');
        expect(model.severityChange.direction).toBe('improved');
    });
});
