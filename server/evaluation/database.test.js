// @vitest-environment node
import { describe,it,expect,vi,afterEach } from 'vitest';
const mocks=vi.hoisted(()=>({pool:vi.fn(),poolQuery:vi.fn(),fallback:vi.fn()}));
vi.mock('pg',()=>({default:{Pool:mocks.pool}}));
vi.mock('../utils/neonDatabase.js',()=>({queryNeon:mocks.fallback}));
mocks.pool.mockImplementation(function(){return {query:mocks.poolQuery,end:vi.fn()};});
const {queryEvaluation}=await import('./database.js');
afterEach(()=>vi.unstubAllEnvs());
describe('evaluation database isolation',()=>{
 it('uses the farmer database only when no separate evaluation URL is configured',async()=>{
  vi.stubEnv('EVALUATION_DATABASE_URL','');mocks.fallback.mockResolvedValue({rows:[]});
  await queryEvaluation('select 1');expect(mocks.fallback).toHaveBeenCalledWith('select 1',[]);
 });
 it('routes evaluation queries to a separate pool when configured',async()=>{
  vi.stubEnv('EVALUATION_DATABASE_URL','postgres://evaluation.example/test');mocks.poolQuery.mockResolvedValue({rows:[]});
  await queryEvaluation('select 2',[3]);expect(mocks.pool).toHaveBeenCalledWith(expect.objectContaining({connectionString:'postgres://evaluation.example/test'}));
  expect(mocks.poolQuery).toHaveBeenCalledWith('select 2',[3]);
 });
});
