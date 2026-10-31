import { expect, it } from 'vitest';
import { getReviewerText, REVIEWER_PHRASES } from './reviewerCopy.js';
it('provides every reviewer phrase in all three languages', () => {
    for (const [source, values] of Object.entries(REVIEWER_PHRASES)) {
        expect(values.en).toBe(source);
        expect(values.ms?.trim()).toBeTruthy();
        expect(values.zh?.trim()).toBeTruthy();
    }
    expect(getReviewerText('ms', 'Save review')).toBe('Simpan semakan');
    expect(getReviewerText('zh', 'Expert review')).toBe('专家审核');
    expect(getReviewerText('ms', 'Original farmer note')).toBe('Original farmer note');
});
