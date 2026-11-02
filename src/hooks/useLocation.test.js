import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useLocation } from './useLocation.js';
afterEach(() => vi.restoreAllMocks());
it('does not obtain or send location when the person declines', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const lookup = vi.fn();
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: lookup } });
    const { result } = renderHook(() => useLocation());
    await act(async () => { expect(await result.current.getLocation()).toBeNull(); });
    expect(lookup).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
});
