# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Administrators, accountants, and branch managers use the desktop back office to manage lending operations and review financial activity.
- Field officers use a phone while following collection routes, recording payments, and serving members.

## Product Purpose

Super A Plus supports microfinance operations across member management, loans, collections, arrears, accounting, and reporting. Success means staff can complete frequent operational tasks quickly and keep payment amounts and statuses clear.

## Operating Context

- The product serves branch and centre based workflows in Sri Lanka.
- Staff work with LKR amounts; phone numbers use the +94 country code.
- Back-office work is desktop oriented. Field collection is intended for touch use on mobile devices.

## Capabilities and Constraints

- Current application routes cover the dashboard, members, loans, collections, accounting, arrears, reports, and settings.
- The initial plan describes a separate `/field` experience with offline collection and sync. That route is not present in the current application and remains planned work.
- Navigation is role aware for administrators, branch managers, accountants, and field officers. Server-side authorization remains authoritative.
- Keep paid, due, and overdue amounts distinct; use consistent LKR formatting and right-aligned financial values.
- Preserve keyboard access, visible focus, labelled inputs, WCAG AA contrast, and at least 44px touch targets in field workflows.

## Brand Commitments

- Product name: Super A Plus.
- The user chose a formal, restrained classic-bank direction for the redesign.

## Evidence on Hand

- The repository contains the current application routes and product data models.
- No customer testimonials, external endorsements, or performance claims were supplied; do not invent them.

## Product Principles

- Optimize frequent staff work for speed and few clicks.
- Keep financial values and payment states unambiguous.
- Keep role-specific navigation convenient while relying on server-side enforcement for permissions.
- Make field collection usable with one hand and resilient to unreliable connectivity as that workflow is built.
