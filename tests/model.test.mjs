import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, reducer, AFFILIATE_URL, DISCLOSURE, httpUrl, renderTemplate, TEMPLATES, assertLink, canFill, importState, vnDate, csvCell } from '../extension/model.mjs';
function setup() {
  let state = emptyState();
  state = reducer(state, { type: 'SAVE_DESTINATION', data: { id: 'group', kind: 'group', name: 'Nhóm thử', url: 'https://www.facebook.com/groups/12345/', allowsAds: true } });
  return reducer(state, { type: 'ADD_JOB', data: { campaignId: 'agentshop247', destinationId: 'group', targetUrl: 'https://www.facebook.com/groups/12345/posts/67890/', body: renderTemplate(state.campaigns[0], TEMPLATES[0].body) } });
}
test('preserves every character of affiliate links including parameter order and encoding', () => {
  for (const link of [AFFILIATE_URL, 'https://vendor.test/?ref=ABC%2fdef&campaign=z&code=01', 'https://vendor.test?ref=X', 'https://vendor.test:443/path?ref=MixedCASE']) assert.equal(httpUrl(link), link);
  assert.throws(() => httpUrl(AFFILIATE_URL + ' '));
  assert.throws(() => httpUrl('javascript:alert(1)'));
});
test('templates contain exactly one unchanged referral URL on its own line', () => {
  for (const template of TEMPLATES) {
    const body = renderTemplate(emptyState().campaigns[0], template.body);
    assert.equal(assertLink({ body, affiliateUrl: AFFILIATE_URL }, []), AFFILIATE_URL);
    assert.equal(body.match(/https?:\/\/[^\s]+/g).length, 1);
  }
});
test('one changed character and an extra URL both block sending', () => {
  const body = `${AFFILIATE_URL}\n\n${DISCLOSURE}`;
  assert.throws(() => assertLink({ body: body.replace('713', '714'), affiliateUrl: AFFILIATE_URL }, []));
  assert.throws(() => assertLink({ body: body + '\nhttps://vendor.test/', affiliateUrl: AFFILIATE_URL }, []));
  assert.throws(() => assertLink({ body: body + '\nHtTpS://vendor.test/', affiliateUrl: AFFILIATE_URL }, []));
  const link = 'HTTPS://vendor.test/?ref=MixedCASE';
  assert.equal(assertLink({ body: `${link}\n\n${DISCLOSURE}`, affiliateUrl: link }, []), link);
});
test('requires advertising permission and validates the exact Facebook target', () => {
  assert.throws(() => reducer(emptyState(), { type: 'SAVE_DESTINATION', data: { kind: 'group', name: 'No', url: 'https://www.facebook.com/groups/123/', allowsAds: false } }));
  let state = setup(); const id = state.jobs[0].id;
  assert.throws(() => canFill(state.jobs[0], state.jobs[0].targetUrl, state.destinations));
  state = reducer(state, { type: 'REVIEW_JOB', id, approved: true });
  assert.equal(canFill(state.jobs[0], 'https://www.facebook.com/groups/12345/permalink/67890/?x=1', state.destinations), true);
  assert.throws(() => canFill(state.jobs[0], 'https://www.facebook.com/groups/12345/posts/9999/', state.destinations));
  assert.throws(() => canFill(state.jobs[0], 'https://www.facebook.com.evil.test/groups/12345/posts/67890/', state.destinations));
});
test('does not enqueue a second comment to the same post with alternate wording', () => {
  const state = setup();
  assert.throws(() => reducer(state, { type: 'ADD_JOB', data: { campaignId: 'agentshop247', destinationId: 'group', targetUrl: state.jobs[0].targetUrl, body: `Một câu khác.\n${AFFILIATE_URL}\n\n${DISCLOSURE}` } }));
});
test('campaign edits preserve referral snapshot in queued jobs; edits require reapproval', () => {
  let state = setup(); const id = state.jobs[0].id;
  state = reducer(state, { type: 'REVIEW_JOB', id, approved: true });
  state = reducer(state, { type: 'SAVE_CAMPAIGN', data: { ...state.campaigns[0], link: 'https://other.test/?ref=new' } });
  assert.equal(assertLink(state.jobs[0], state.campaigns), AFFILIATE_URL);
  state = reducer(state, { type: 'EDIT_JOB', id, body: state.jobs[0].body + '\nXem điều kiện trước khi mua.' });
  assert.equal(state.jobs[0].approved, false); assert.equal(state.jobs[0].status, 'draft');
});
test('backup import disables scheduling and approvals, preserves uncertain sends', () => {
  let state = setup(); state.settings.schedulerEnabled = true;
  state.jobs[0].status = 'publishing'; state.jobs[0].approved = true;
  state.aiKey = 'secret'; state.token = 'secret';
  const restored = importState(state);
  assert.equal(restored.jobs[0].status, 'uncertain'); assert.equal(restored.jobs[0].approved, false);
  assert.equal(restored.settings.schedulerEnabled, false); assert.equal(restored.aiKey, undefined); assert.equal(restored.token, undefined);
  assert.equal(restored.jobs[0].affiliateUrl, AFFILIATE_URL);
});
test('Vietnam schedules and spreadsheet formula escaping', () => {
  assert.equal(vnDate('2026-10-08T09:00'), '2026-10-08T02:00:00.000Z');
  assert.equal(csvCell('=HYPERLINK("evil")'), '"\'=HYPERLINK(""evil"")"');
});
