import { describe, expect, it } from 'vitest';
import { withStoreAttribution } from './storeLinks.js';

describe('withStoreAttribution', () => {
    it('adds app tags and keeps the cart parameters', () => {
        const url = new URL(withStoreAttribution('https://www.kanb.coop.my/checkout/?add-to-cart=12,34&quantity=1,1', 'plant-check-checkout'));
        expect(url.searchParams.get('add-to-cart')).toBe('12,34');
        expect(url.searchParams.get('quantity')).toBe('1,1');
        expect(url.searchParams.get('utm_source')).toBe('kanb-agropreneur');
        expect(url.searchParams.get('utm_medium')).toBe('app');
        expect(url.searchParams.get('utm_campaign')).toBe('plant-check-checkout');
    });

    it('keeps tags that are already there', () => {
        const url = new URL(withStoreAttribution('https://store.example/p/1?utm_source=whatsapp'));
        expect(url.searchParams.get('utm_source')).toBe('whatsapp');
        expect(url.searchParams.get('utm_medium')).toBe('app');
    });

    it('leaves empty, relative and non-web links alone', () => {
        expect(withStoreAttribution('')).toBe('');
        expect(withStoreAttribution(null)).toBe(null);
        expect(withStoreAttribution('/cart')).toBe('/cart');
        expect(withStoreAttribution('mailto:shop@example.com')).toBe('mailto:shop@example.com');
    });
});
