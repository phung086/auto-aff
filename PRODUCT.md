# LinkDesk

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Manifest V3 Chrome extension using HTML, CSS and JavaScript modules. The user chose Chrome and explicitly asked to continue building the existing tool. No build dependencies or remote executable code.

## Users

A Vietnamese speaking affiliate for an AI resource supplier, expanding to additional suppliers later.

## Product Purpose

Read supplier information, produce relevant Vietnamese content using a configured AI API, attach the exact referral URL and publish to selected Facebook destinations that permit advertising.

## Operating Context

The user says their intended groups permit advertising and most activity is commenting on posts or publishing to their own Page. Chrome must run, Facebook must be logged in, and the user configures destinations locally. The user provided exactly https://agentshop247.com/?ref=AS362560C5A713 and requires byte-for-byte preservation of the textual URL.

## Capabilities and Constraints

- Multiple independent supplier campaigns, each with product information, referral URL and keywords.
- AI source analysis and content generation use a user-supplied OpenAI API key and model. Never fabricate provider prices or endorsements.
- Pages use the authorized Pages API. Groups have no public publishing API; the experimental group adapter scans loaded DOM posts and sends through the Facebook interface.
- Automatic runs begin only after the user chooses destinations and permits the run. Send once and stop on ambiguous outcome or unsupported interface.
- Session secrets stay in Chrome session storage, are omitted from state, exports and UI readbacks. Backups require reapproval of pending jobs and disable scheduling.
- No CAPTCHA solving, account rotation, cookie collection or evasion mechanisms.

## Evidence on Hand

The exact user-supplied referral link was opened on 07/10/2026. AgentShop247's homepage and catalog describe the shop as an independent retailer. Supplier claims remain attributed; no independent verification of quality, licensing, price or warranty has been performed.

## Product Principles

- Keep one unmodified affiliate URL on its own line in every outgoing message.
- Show exact campaign and destination before a run starts.
- Distinguish API success, observed comment, manual confirmation and uncertain result.
- Avoid duplicate comments to the same post and never retry an uncertain send automatically.

## Open Decisions

Actual Facebook destinations, Page token, AI key and API model must be supplied locally by the user. Real Facebook sending has not been validated in this environment.
