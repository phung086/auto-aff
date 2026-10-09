import { z } from 'zod';
import { DISCLOSURE, httpUrl, assertLink } from '../extension/model.mjs';

export const campaignInput = z.object({ name: z.string().min(1).max(200), product: z.string().min(1).max(300), benefit: z.string().min(1).max(6000), keywords: z.string().max(500), link: z.string().max(4000), source: z.string().max(30000).default('') }).strict();
export const taskInput = z.object({ key: z.string().min(1).max(250), kind: z.enum(['compose', 'analyze']), campaign: campaignInput.optional(), context: z.string().max(2200).default(''), postKind: z.enum(['comment', 'page']).default('comment'), link: z.string().max(4000).optional(), source: z.string().max(28000).default(''), extra: z.string().max(6000).default('') }).strict().superRefine((v,c) => { if (v.kind === 'compose' && !v.campaign || v.kind === 'analyze' && (!v.link || !v.source)) c.addIssue({code:'custom',message:'Thiếu chiến dịch hoặc nguồn để phân tích.'}); });
export const resultInput = z.object({ id: z.string().uuid(), relevant: z.boolean().optional(), body: z.string().max(4000).optional(), campaign: z.object({name:z.string().min(1).max(200),product:z.string().min(1).max(300),benefit:z.string().min(1).max(6000),keywords:z.string().max(500)}).strict().optional() }).strict();
export const leaseTokenInput = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const claimInput = z.object({owner:z.string().min(1).max(100),ttlMs:z.number().int().min(15000).max(600000).default(300000)}).strict();
export const leaseActionInput = z.object({leaseToken:leaseTokenInput,ttlMs:claimInput.shape.ttlMs}).strict();
export const submissionInput = resultInput.extend({leaseToken:leaseTokenInput});
const noUrl = value => { if (/https?:\/\//i.test(value)) throw new Error('ChatGPT trả nội dung chứa URL; ứng dụng tự gắn link nguyên bản.'); };
export function normalizeTask(raw) { const data = taskInput.parse(raw); if (data.campaign) data.campaign.link = httpUrl(data.campaign.link); if (data.link) data.link = httpUrl(data.link); return data; }
export function normalizeResult(task, raw) {
  const value = resultInput.parse(raw);
  if (task.kind === 'compose') {
    if (typeof value.relevant !== 'boolean' || typeof value.body !== 'string' || value.campaign) throw new Error('Cần relevant và body cho yêu cầu soạn bài.');
    noUrl(value.body);
    if (value.relevant && !value.body.trim()) throw new Error('Nội dung trống.');
    const body = `${value.body.trim()}\n\n${task.campaign.link}\n\n${DISCLOSURE}`;
    assertLink({ body, affiliateUrl: task.campaign.link }, []);
    return { relevant: value.relevant, body };
  }
  if (!value.campaign || value.body !== undefined || value.relevant !== undefined) throw new Error('Cần campaign cho yêu cầu phân tích nguồn.');
  Object.values(value.campaign).forEach(noUrl);
  return { campaign: { ...value.campaign, link: task.link, source: task.source } };
}
