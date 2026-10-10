import test from 'node:test';
import assert from 'node:assert/strict';
import { AFFILIATE_URL, emptyState } from '../extension/model.mjs';
import { rawCampaignLink } from '../extension/campaign-link-copy.mjs';

test('returns the original default affiliate URL without rewriting characters', () => {
  assert.equal(rawCampaignLink(emptyState().campaigns, 'agentshop247'), AFFILIATE_URL);
});

test('selects the right supplier while preserving URL parameter spelling and order', () => {
  const second = 'https://vendor.example/Path/?z=9&ref=A%2fb&a=1';
  const campaigns = [{ id: 'first', link: AFFILIATE_URL }, { id: 'second', link: second }];
  assert.equal(rawCampaignLink(campaigns, 'second'), second);
  assert.equal(rawCampaignLink(campaigns, 'first'), AFFILIATE_URL);
});

test('fails closed for missing or duplicate campaign identifiers', () => {
  assert.throws(() => rawCampaignLink([], 'unknown'));
  assert.throws(() => rawCampaignLink(null, 'first'));
  assert.throws(() => rawCampaignLink([{ id: 'same', link: AFFILIATE_URL }, { id: 'same', link: AFFILIATE_URL }], 'same'));
});

test('rejects invalid links instead of copying them', () => {
  for (const link of ['javascript:alert(1)', ' https://vendor.example/', 'https://vendor.example/path with space']) {
    assert.throws(() => rawCampaignLink([{ id: 'bad', link }], 'bad'));
  }
});

test('never alters the campaign records', () => {
  const campaigns = Object.freeze([Object.freeze({ id: 'one', link: AFFILIATE_URL })]);
  assert.equal(rawCampaignLink(campaigns, 'one'), AFFILIATE_URL);
  assert.equal(campaigns[0].link, AFFILIATE_URL);
});
