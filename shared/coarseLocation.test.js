import { expect, it } from 'vitest';
import { coarseLocation } from './coarseLocation.js';
it('rounds coordinates before provider disclosure and supports valid zero coordinates', () => {
    expect(coarseLocation({ lat: 3.1415926, lng: 101.686534 })).toEqual({ lat: 3.14, lng: 101.69 });
    expect(coarseLocation({ lat: 0, lng: 0 })).toEqual({ lat: 0, lng: 0 });
});
it.each([null, {}, { lat: 91, lng: 4 }, { lat: 3, lng: Infinity }])('does not disclose invalid location: %j', input => {
    expect(coarseLocation(input)).toBeNull();
});
