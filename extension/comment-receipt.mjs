// L041: pure, fail-closed verifier for evidence supplied by an authorized reader.
// This module does not inspect Facebook, publish comments, or retry sends.
const ACCOUNT_ID = /^[A-Za-z0-9._-]{1,100}$/;
const COMMENT_ID = /^[1-9][0-9]{0,30}$/;
const GROUP_ID = /^[A-Za-z0-9._-]{1,100}$/;
const POST_ID = /^[1-9][0-9]{0,30}$/;
const FACEBOOK_HOSTS = new Set(['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com']);

function groupPost(raw) {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'https:' || !FACEBOOK_HOSTS.has(url.hostname) ||
      url.port || url.username || url.password || url.hash) return null;
  const match = /^\/groups\/([^/]+)\/(?:posts|permalink)\/([^/]+)\/?$/.exec(url.pathname);
  if (!match || !GROUP_ID.test(match[1]) || !POST_ID.test(match[2])) return null;
  return { url, groupId: match[1], postId: match[2] };
}

const uncertain = reason => ({ decision: 'uncertain', reason });
const samePost = (a, b) => a.groupId === b.groupId && a.postId === b.postId;
const cleanBody = value => typeof value === 'string' && value.length <= 10000
  ? value.replace(/\s+/gu, ' ').trim() : null;

/**
 * Intended to consume evidence after ONE authorized send attempt. Returns
 * observed evidence or uncertain; never grants permission to publish/retry.
 * expectedAccountId comes from a trusted local session, not a DOM field.
 */
export function verifyCommentReceipt({ expectedPostUrl, expectedBody, expectedAccountId, receipt } = {}) {
  const expected = groupPost(expectedPostUrl);
  if (!expected) return uncertain('INVALID_EXPECTED_POST');
  if (typeof expectedAccountId !== 'string' || !ACCOUNT_ID.test(expectedAccountId))
    return uncertain('EXPECTED_ACCOUNT_UNKNOWN');
  const body = cleanBody(expectedBody);
  if (!body) return uncertain('EXPECTED_BODY_UNKNOWN');
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt) ||
      receipt.source !== 'post_click_dom' || receipt.observedAfterSubmit !== true ||
      receipt.newlyObserved !== true) return uncertain('UNVERIFIED_OBSERVATION');
  if (receipt.accountId !== expectedAccountId || receipt.authorAccountId !== expectedAccountId)
    return uncertain('ACCOUNT_NOT_PROVEN');
  if (cleanBody(receipt.observedText) !== body) return uncertain('BODY_MISMATCH');
  const current = groupPost(receipt.postUrl);
  const comment = groupPost(receipt.permalink);
  if (!current || !comment || !samePost(current, expected) || !samePost(comment, expected))
    return uncertain('POST_MISMATCH');
  const ids = comment.url.searchParams.getAll('comment_id');
  if (ids.length !== 1 || !COMMENT_ID.test(ids[0]) || receipt.commentId !== ids[0])
    return uncertain('COMMENT_ID_UNVERIFIED');
  return {
    decision: 'observed', reason: 'MATCHED_COMMENT_PERMALINK',
    evidence: { kind: 'dom_observation', commentId: ids[0], permalink: receipt.permalink },
  };
}
