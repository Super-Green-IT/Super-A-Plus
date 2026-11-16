---
name: Super A Plus Cooperative Finance
description: A restrained member-focused workspace for lending, collections, and branch administration.
colors:
  cooperative-ink: "#274B38"
  cooperative-green: "#396349"
  paper: "#EEECDF"
  record-white: "#FFFEFA"
  rule: "#E2DFD4"
  body-ink: "#27372E"
  secondary-ink: "#626D63"
  caution: "#9B6B32"
  arrears: "#9B5C46"
typography:
  display:
    fontFamily: "Segoe UI, Arial, Helvetica, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Segoe UI, Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Segoe UI, Arial, Helvetica, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.1em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.cooperative-ink}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.record-white}"
    textColor: "{colors.body-ink}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  field:
    backgroundColor: "{colors.record-white}"
    textColor: "{colors.body-ink}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "44px"
  status-chip:
    rounded: "999px"
    padding: "2px 8px"
  record-surface:
    backgroundColor: "{colors.record-white}"
    textColor: "{colors.body-ink}"
    rounded: "{rounded.sm}"
    padding: "16px"
---

# Design System: Super A Plus Cooperative Finance

## Overview

**Creative North Star: "Cooperative Member Book"**

A formal, restrained cooperative finance workspace built around clear member identity and traceable account activity. Deep green anchors branch navigation and important actions; paper-toned space and clean white records keep dense operational information calm and legible.

The interface uses standard web tables, forms, and navigation. Fine rules organize data, and member numbers travel beside names wherever the current records provide them. The visual language is precise without pretending the screen is a physical ledger. A persistent sidebar control switches between the paper-toned light palette and a deep green charcoal dark palette; the choice is saved on the device.

**Key Characteristics:**
- Deep green navigation with quiet ivory and white work surfaces.
- Member and receipt references remain easy to recognize.
- LKR values align consistently and use tabular numerals.

## Colors

A restrained full palette uses cooperative green for navigation and action, warm neutrals for records, and muted amber or terracotta for exceptions.

### Primary
- **Cooperative Ink** (`#274B38`): Shared navigation rail and primary actions.
- **Cooperative Green** (`#396349`): Supporting action and interaction color.

### Secondary
- **Caution Ochre** (`#9B6B32`): Warnings and attention states.
- **Arrears Terracotta** (`#9B5C46`): Overdue and exception states.

### Neutral
- **Member Book Paper** (`#EEECDF`): Workspace ground.
- **Record White** (`#FFFEFA`): Tables, forms, and record surfaces.
- **Statement Rule** (`#E2DFD4`): Fine dividers and table structure.
- **Body Ink** (`#27372E`): Primary text.
- **Quiet Ink** (`#626D63`): Secondary labels and supporting text.

### Named Rules
**The Reference Travels Rule.** Keep the member number or receipt reference close to the name or transaction it identifies.

**The Amounts Stay Comparable Rule.** Use tabular numerals and right alignment for financial columns; never invent a missing amount.

## Typography

**Display Font:** Segoe UI (with Arial and Helvetica fallbacks)
**Body Font:** Segoe UI (with Arial and Helvetica fallbacks)
**Label/Mono Font:** System sans with tabular numerals for identifiers and financial data.

**Character:** Practical, familiar sans-serif lettering keeps the workspace readable across office screens and staff devices. Typography is differentiated through size, weight, and spacing rather than a decorative display face.

### Hierarchy
- **Display** (600, 24–28px, 1.2): Page titles and sign-in heading.
- **Title** (600, 14–16px, 1.35): Register and work-area headings.
- **Body** (400, 14px, 1.5): Record details, actions, and supporting copy.
- **Label** (600, 10–11px, 1.4, tracked uppercase when tabular): Column labels and compact summary labels.

### Named Rules
**The Workhorse Type Rule.** Use system sans for interface copy and reserve tabular numerals for values that staff compare.

## Layout

The staff workspace uses a persistent desktop navigation rail, a compact branch-aware top bar, and a constrained content region. The dashboard opens with a ruled four-column portfolio summary, then a broad approvals register beside links to collections, arrears, and reporting. Wide tables keep their columns intact and scroll horizontally on narrow screens. Mobile navigation becomes a drawer; touch controls target at least 44px.

## Elevation & Depth

The workspace is flat at rest. Fine warm-gray rules, white record surfaces against the paper ground, and a restrained drawer shadow establish depth. Avoid decorative gradients and persistent card shadows.

### Named Rules
**The Rule Before the Shadow Rule.** Group financial records with alignment and dividers; reserve shadows for overlays that sit above page content.

## Shapes

Use modest corners (6–10px) on controls and record groupings. Status chips are fully rounded so state reads separately from a table cell. Borders remain thin and warm rather than high-contrast black.

## Components

### Buttons
- **Shape:** Modest corners (6px).
- **Primary:** Cooperative ink with white text; minimum height 44px.
- **Hover / Focus:** Shift to deeper green on hover and show a visible 2px green focus outline.
- **Secondary:** White surface, fine neutral border, dark text.

### Chips
- **Style:** Small pill with a distinct semantic background, readable text, and an optional status dot.
- **State:** Green for active/paid, ochre for pending/warning, terracotta for overdue or rejected.

### Cards / Containers
- **Corner Style:** Modest (6–10px).
- **Background:** White record surfaces on paper workspace.
- **Shadow Strategy:** Flat, divided by fine rules; elevated shadow reserved for the mobile drawer.
- **Internal Padding:** Commonly 16–24px.

### Inputs / Fields
- **Style:** White fill, warm-gray border, dark text, 6px corners.
- **Focus:** Visible green border and 2px focus ring.
- **Mobile:** 16px text and 44px minimum height on coarse pointers.

### Navigation
- **Style:** Deep green rail with white labels, role-filtered links, and a quiet bordered active state. Mobile uses the same rail in a touch-friendly drawer.

### Member Reference
Member numbers are shown below member names in a compact tabular treatment where available. The reference remains secondary to the member name but easy to scan and carry into loan activity.

## Do's and Don'ts

### Do:
- **Do** keep member and receipt references beside the records they identify.
- **Do** use tabular numerals and right-aligned LKR values.
- **Do** use rules and spacing to organize dense records.
- **Do** preserve a visible keyboard focus and reduced-motion behavior.

### Don't:
- **Don't** fabricate financial values when report data is absent.
- **Don't** make a physical-ledger costume from textures, faux stamps, or ornamental lines.
- **Don't** use decorative gradients or card grids as the page structure.

