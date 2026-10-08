---
name: LinkDesk
description: Local Vietnamese affiliate workbench
colors:
  paper: "#f5f6f2"
  surface: "#fff"
  ink: "#202b28"
  muted: "#59665e"
  line: "#dce1db"
  accent: "#245a43"
  accent-hover: "#164630"
  tint: "#eaf1e8"
  error: "#a3302a"
  focus: "#276c9f"
  secondary: "#e9ece7"
  input-border: "#b8c3ba"
  ready-bg: "#dfeee0"
  ready-ink: "#285331"
typography:
  headline:
    fontFamily: "BeVietnam, 'Segoe UI', sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-.025em"
  title:
    fontFamily: "BeVietnam, 'Segoe UI', sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-.015em"
  body:
    fontFamily: "BeVietnam, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "BeVietnam, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  control: "6px"
  surface: "8px"
  dialog: "12px"
spacing:
  base: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  compose:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    padding: "24px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 11px"
  nav-active:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.accent}"
    rounded: "{rounded.control}"
    padding: "9px 11px"
  tag-ready:
    backgroundColor: "{colors.ready-bg}"
    textColor: "{colors.ready-ink}"
    typography: "{typography.label}"
    rounded: "4px"
    padding: "4px 9px"
  exact-link:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.accent}"
    rounded: "{rounded.control}"
    padding: "12px"
---

# Design System: LinkDesk

## Overview

This records the implemented interface in `extension/style.css` and `dashboard.html`. Its descriptive language is provisional and implementation-derived. The user requested continuation of the working tool; no visual world or comp was explicitly approved. Original seed `922c22fd` is provenance only.

The interface is a local workbench for campaigns, exact referral links, destinations and publishing outcomes. Flat white work areas sit on a pale green ground. Labels and statuses explain the next action, while a restrained green accent identifies primary controls and the active view.

## Colors

`accent` is used for primary buttons, links and selected navigation; `accent-hover` is its button hover state. `paper`, `surface`, `ink`, `muted` and `line` provide the ground, work areas, text hierarchy and separators. `tint` highlights the selected view and exact URL. `error` marks destructive/error text; `focus` marks keyboard focus. CSS values in the frontmatter are authoritative for these extracted tokens.

## Typography

Bundled Be Vietnam Pro is registered as `BeVietnam`, with weights 400 and 600 and Segoe UI/sans-serif fallbacks. H1 uses the headline role; H2 uses title; H3 is 16px/1.4 at weight 600. Body uses 14px/1.65. Labels and button text are generally 12px/600; contextual checkbox labels use 13px/400. Job content is 13px/1.85, limited to 75ch; prose is limited to 72ch. Code uses 12px/1.5 Consolas/monospace. H1 becomes 27px on narrow screens.

## Layout

Main content has maximum width 1320px, desktop padding 38px 24px 64px and a 28px heading gap. The queue uses a 340px composer plus a flexible list, separated by 36px. Other working views use a 320–480px form column and a flexible companion column with a 56px gap. The white app bar is sticky on desktop, with minimum height 82px.

At 1160px the preview marker disappears and the app bar can wrap. At 1060px the composer becomes 310px and its gap becomes 24px. At 760px work columns stack with a 28px gap, navigation wraps, the app bar becomes static, main padding becomes 28px 20px 48px, and form surfaces use 21px padding. Long referral URLs and content wrap without modifying their stored text.

## Elevation & Depth

Work surfaces are flat; background tones and divider lines carry hierarchy. Only the toast has `0 8px 28px #202b2826` shadow. Modal depth uses backdrop `#20332973`, not a card shadow system. Do not infer additional elevations.

## Shapes

Controls and exact-link panels use 6px corners, work surfaces 8px, dialogs 12px, and status tags 4px. Fields have a 1px `#b8c3ba` border. Primary controls have minimum height 42px; compact job actions have minimum height 36px.

## Components

Buttons use compact text, solid green primary actions and pale `#e9ece7` secondary actions. Disabled buttons retain their shape, use opacity .55 and a not-allowed cursor. Fields have white backgrounds, 10px 11px padding and green borders when focused. Textareas resize vertically. Global keyboard focus uses a 3px blue outline with 3px offset; the restore-file label mirrors focus from its clipped file input.

Navigation exposes the selected view with the green tint and `aria-current`. Contextual links reveal their target view and focus its H1. The edit dialog has an accessible title and description. Queue rows use top dividers, separate text/status/actions and preserve line breaks. The exact-link panel is green-tinted, wraps long text and shows the campaign URL unchanged. Outcome labels distinguish API success, observed comments, manual confirmation and uncertainty; color supplements those labels.

View arrival animates brightness and 3px vertical movement for .22s with ease-out. Reduced-motion preference removes that animation. Motion, focus and depth details are also recorded in `.impeccable/design.json`.

## Do's and Don'ts

- Do reuse the actual palette, type and control styles for additional views.
- Do preserve the exact referral string in storage and generated content; wrapping is presentation only.
- Do keep preview/simulated data visibly identified and publishing outcomes explicit.
- Do preserve keyboard focus and accessible names when changing views or dialogs.
- Don't imply real AI/Facebook integration has been verified through local preview screenshots.
- Don't present this extracted implementation direction as a user-approved visual identity.
