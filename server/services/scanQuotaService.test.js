// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../utils/neonDatabase.js', () => ({getNeonPool:()=>null,queryNeon:vi.fn()}));
import { consumeAiQuota } from './aiQuotaService.js';
import { consumeFreeScanQuota } from './scanQuotaService.js';
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();});
describe('free daily plant scans',()=>{
 it.each(['guest:free-a','user:free-b'])('allows ten scans and blocks the eleventh for %s',async identity=>{
  vi.stubEnv('FREE_SCAN_DAILY_LIMIT','');
  for(let i=0;i<10;i++)expect((await consumeFreeScanQuota(identity)).allowed).toBe(true);
  expect(await consumeFreeScanQuota(identity)).toMatchObject({allowed:false,limit:10});
 });
 it('resets at Malaysia midnight and keeps other AI spending separate',async()=>{
  vi.stubEnv('FREE_SCAN_DAILY_LIMIT','');vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-02T15:59:00Z'));
  for(let i=0;i<50;i++)await consumeAiQuota({identity:'user:midnight',limit:50});
  for(let i=0;i<10;i++)expect((await consumeFreeScanQuota('user:midnight')).allowed).toBe(true);
  expect((await consumeFreeScanQuota('user:midnight')).allowed).toBe(false);
  vi.setSystemTime(new Date('2026-11-02T16:00:00Z'));
  expect(await consumeFreeScanQuota('user:midnight')).toMatchObject({allowed:true,used:1});
 });
});
