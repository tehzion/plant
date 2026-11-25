import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAppUpdateReady } from './useAppUpdateReady.js';

const original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
const fakeServiceWorker = (controller) => {
    const target = new EventTarget();
    target.controller = controller;
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: target });
    return target;
};

afterEach(() => {
    if (original) Object.defineProperty(navigator, 'serviceWorker', original);
    else delete navigator.serviceWorker;
});

describe('useAppUpdateReady', () => {
    it('turns on when a newer version takes over an open page', () => {
        const sw = fakeServiceWorker({});
        const { result } = renderHook(() => useAppUpdateReady());
        expect(result.current).toBe(false);
        act(() => { sw.dispatchEvent(new Event('controllerchange')); });
        expect(result.current).toBe(true);
    });

    it('stays off for the first install, when nothing older was running', () => {
        const sw = fakeServiceWorker(null);
        const { result } = renderHook(() => useAppUpdateReady());
        act(() => { sw.dispatchEvent(new Event('controllerchange')); });
        expect(result.current).toBe(false);
    });
});
