import { describe, expect, it } from 'vitest';
import { getPageTitle } from './navItems.js';

describe('getPageTitle', () => {
    it('keeps the app name on Home', () => {
        expect(getPageTitle({ pathname: '/', search: '' })).toBeNull();
    });

    it('names the scan flow and detail pages', () => {
        expect(getPageTitle({ pathname: '/', search: '?scan=true' }).key).toBe('nav.checkPlant');
        expect(getPageTitle({ pathname: '/results/abc', search: '' }).key).toBe('nav.pageResult');
        expect(getPageTitle({ pathname: '/mygap', search: '?tab=farm' }).key).toBe('nav.mygap');
    });

    it('falls back to the not-found title for unknown paths', () => {
        expect(getPageTitle({ pathname: '/nope', search: '' }).key).toBe('common.notFoundTitle');
    });
});
