import test from 'node:test';
import assert from 'node:assert/strict';
import { graphRequest } from '../extension/facebook.mjs';
import { generateBody, analyzeSource } from '../extension/ai.mjs';
import { initialCampaign, AFFILIATE_URL, assertLink } from '../extension/model.mjs';
test('publishes exact message to a numeric Page endpoint, token only in header', async () => {
  const body = `Thông tin\n${AFFILIATE_URL}`;
  await graphRequest({ version: 'v99.0', path: '123/feed', token: 'mock-secret', body, fetcher: async (url, options) => {
    assert.equal(url, 'https://graph.facebook.com/v99.0/123/feed');
    assert.equal(options.headers.Authorization, 'Bearer mock-secret');
    assert.equal(new URLSearchParams(options.body).get('message'), body);
    assert.equal(url.includes('mock-secret'), false); return { ok: true, json: async () => ({ id: '123_456' }) };
  } });
});
test('distinguishes explicit API rejection from uncertain network outcome', async () => {
  await assert.rejects(graphRequest({ version: 'v99.0', path: '123/feed', token: 'secret', body: 'test', fetcher: async () => { throw new Error('network'); } }), e => e.uncertain === true);
  await assert.rejects(graphRequest({ version: 'v99.0', path: '123/feed', token: 'secret', body: 'test', fetcher: async () => ({ ok: false, status: 400, json: async () => ({ error: { message: 'bad secret' } }) }) }), e => e.confirmedFailure && !e.message.includes('secret'));
});
test('AI-generated text gets link inserted by application, never by model', async () => {
  const before = globalThis.fetch;
  globalThis.fetch = async (url, options) => { const input = JSON.parse(options.body); assert.equal(input.store, false); assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(options.headers.Authorization, 'Bearer fake'); return { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ relevant: true, body: 'Bạn có thể xem các gói phù hợp với nhu cầu lập trình.' }) }] }] }) }; };
  try { const result = await generateBody({ key: 'fake', model: 'mock', campaign: initialCampaign, context: 'Cần công cụ AI lập trình' }); assert.equal(result.relevant, true); assert.equal(assertLink({ body: result.body, affiliateUrl: AFFILIATE_URL }, []), AFFILIATE_URL); }
  finally { globalThis.fetch = before; }
});
test('rejects model-added URLs and incomplete AI responses', async () => {
  const before = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ status: 'completed', output_text: JSON.stringify({ relevant: true, body: 'https://wrong.test/' }) }) });
  try { await assert.rejects(generateBody({ key: 'fake', model: 'mock', campaign: initialCampaign }), /không hợp lệ/); }
  finally { globalThis.fetch = before; }
});
