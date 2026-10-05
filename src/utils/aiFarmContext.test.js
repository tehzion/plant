import { it, expect } from 'vitest';
import { prepareAiFarmContext } from './aiFarmContext.js';

it('bounds AI context without discarding the full report records or sending photos', () => {
    const records = Array.from({ length: 100 }, (_, index) => ({
        id: String(index), created_at: new Date(index * 86400000).toISOString(),
        note: 'x'.repeat(4000), kg_harvested: index, photo_url: 'data:image/jpeg;base64,private',
        result_json: { image: 'private-photo' },
    }));
    const summary = prepareAiFarmContext(records, 12);
    expect(summary).toHaveLength(12);
    expect(summary[0].id).toBe('99');
    expect(summary[0].note).toHaveLength(1000);
    expect(summary[0]).not.toHaveProperty('photo_url');
    expect(summary[0]).not.toHaveProperty('result_json');
    expect(records).toHaveLength(100);
    expect(records[0].id).toBe('0');
    expect(records[0].note).toHaveLength(4000);
});
