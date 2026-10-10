import test from 'node:test';
import assert from 'node:assert/strict';
import { createReviewCard, prepareHelpfulDraft, DISCLOSURE } from '../extension/opportunity-workbench.mjs';

const link = 'https://agentshop247.com/?ref=AS362560C5A713';
const campaign = { id:'seller', product:'Gói Claude Pro', link, topics:['claude'] };
const scope = { advertisingAllowed:true, ownerConfirmed:true, platformAccessAllowed:true, rulesEvidence:'Owner verified', expiresAt:'2099-01-01T00:00:00Z' };
const args = { text:'Mình cần mua tài khoản Claude Pro, có ai bán không?', permalink:'https://example.test/posts/1', postId:'1', campaign, scope, now:Date.parse('2026-10-10T00:00:00Z') };

test('actionable purchase question produces review candidate', () => {
 const result=createReviewCard(args); assert.equal(result.decision,'draft_for_review');
 assert.equal(result.affiliateUrl,link);
});
test('prepared draft contains the exact original link once and standalone disclosure',()=>{
 const card=createReviewCard(args);
 const body=prepareHelpfulDraft(card,campaign,{confirmedProduct:true});
 assert.equal(body.split(link).length,2); assert.ok(body.includes('\n'+link+'\n')); assert.ok(body.endsWith(DISCLOSURE));
});
test('no approval from product verification means no draft',()=>{
 assert.throws(()=>prepareHelpfulDraft(createReviewCard(args),campaign),/xác nhận/);
});
test('technical demo is not converted into a marketing comment',()=>{
 const card=createReviewCard({...args,text:'Demo Claude Code vừa xây web đẹp'});
 assert.equal(card.decision,'skip'); assert.throws(()=>prepareHelpfulDraft(card,campaign,{confirmedProduct:true}));
});
test('missing source permission cannot generate a draft',()=>{
 const card=createReviewCard({...args,scope:null}); assert.equal(card.decision,'review');
});
test('campaign changes invalidate prepared draft',()=>{
 const card=createReviewCard(args);
 assert.throws(()=>prepareHelpfulDraft(card,{...campaign,link:link+'x'},{confirmedProduct:true}),/thay đổi/);
});
test('campaign unknown topic cannot generate a promotion',()=>{
 const card=createReviewCard({...args,campaign:{...campaign,topics:['gemini']}});
 assert.equal(card.decision,'skip');
});
test('link is not normalized, even when query string looks equivalent',()=>{
 const alternate={...campaign,link:'https://agentshop247.com/?ref=AS362560C5A713&x=1'};
 const card=createReviewCard({...args,campaign:alternate});
 assert.equal(card.affiliateUrl,alternate.link);
 assert.notEqual(card.affiliateUrl,link);
});
test('invalid text and invalid links are rejected',()=>{
 assert.throws(()=>createReviewCard({...args,text:''}));
 assert.throws(()=>createReviewCard({...args,campaign:{...campaign,link:'http://unsafe.test/'}}));
});
test('missing post identity remains review-only',()=>{
 const card=createReviewCard({...args,postId:''}); assert.equal(card.decision,'review');
});
