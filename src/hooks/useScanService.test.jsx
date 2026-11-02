import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const health = vi.hoisted(() => ({ checkHealthOnce: vi.fn(), hasRecentHealth: () => false }));
vi.mock('../utils/serverHealth.js', () => health);
import { useScanService } from './useScanService.js';
beforeEach(() => {
 Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
 health.checkHealthOnce.mockReset(); health.checkHealthOnce.mockResolvedValue({});
});
afterEach(cleanup);
describe('shared scan connection state', () => {
 it('shares an in-flight check and keeps observing when one consumer leaves', async () => {
  let finish; health.checkHealthOnce.mockReturnValue(new Promise(resolve => { finish=resolve; }));
  const first=renderHook(useScanService), second=renderHook(useScanService);
  expect(health.checkHealthOnce).toHaveBeenCalledTimes(1);
  first.unmount();
  await act(async()=>finish({}));
  expect(second.result.current.status).toBe('online');
  act(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,value:false});window.dispatchEvent(new Event('offline'));});
  expect(second.result.current.status).toBe('offline');
 });
 it('allows retry after failure and announces success without losing prior state while retrying', async () => {
  health.checkHealthOnce.mockRejectedValueOnce(new Error('down'));
  const {result}=renderHook(useScanService);
  await waitFor(()=>expect(result.current.status).toBe('unavailable'));
  let finish; health.checkHealthOnce.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
  let retry;
  act(()=>{retry=result.current.retry();});
  expect(result.current.checking).toBe(true);
  expect(result.current.status).toBe('unavailable');
  await act(async()=>{finish({});await retry;});
  expect(result.current.status).toBe('online');
  expect(result.current.checking).toBe(false);
 });
 it('does not report online when the phone disconnects during a check', async () => {
  let finish; health.checkHealthOnce.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
  const {result}=renderHook(useScanService);
  act(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,value:false});window.dispatchEvent(new Event('offline'));});
  await act(async()=>finish({}));
  expect(result.current.status).toBe('offline');
 });
});
