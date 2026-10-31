import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({ configs:[], create:vi.fn(async()=>({choices:[]})) }));
vi.mock('openai',()=>({default:class {constructor(config){mocks.configs.push(config);this.chat={completions:{create:mocks.create}};}}}));
vi.mock('dotenv',()=>({default:{config:vi.fn()}}));
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();mocks.configs.length=0;mocks.create.mockClear();});
describe('OpenRouter client',()=>{
 it('sends the configured key and compatible model parameters to OpenRouter',async()=>{
  vi.stubEnv('AI_PROVIDER','openrouter');vi.stubEnv('OPENROUTER_API_KEY','test-only-key');
  const {createChatCompletion,OPENAI_PRIMARY_MODEL}=await import('../services/aiService.js');
  await createChatCompletion({model:OPENAI_PRIMARY_MODEL,messages:[],maxTokens:20,temperature:0.2});
  expect(mocks.configs[0]).toEqual({apiKey:'test-only-key',baseURL:'https://openrouter.ai/api/v1'});
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({model:'openai/gpt-5.4-mini',max_completion_tokens:20}));
  expect(mocks.create.mock.calls[0][0]).not.toHaveProperty('temperature');
 });
});
