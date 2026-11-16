---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

SCOPE / MODE: Redesign the shared staff workspace, using the dashboard as the first surface and carrying the system through current operational routes. Operate mode. Keep all existing route and action behavior. The planned `/field` route is not present; do not invent it in this pass.

AUDIENCE / JOB: Administrators, branch managers, and accountants scan member, loan, collection, and arrears records from the back office. Staff need to find a member, understand the latest payment state, and act with few clicks. Field work is planned for mobile, so current screens must remain usable at narrow widths.

CONTENT / CONSTRAINTS: Preserve the current API-backed metrics, approvals, receipt list, member records, and role filtering. Do not fabricate financial values or imply a collection sheet the API does not provide. Show LKR values consistently with clear paid, due, and overdue states. Keep branch/centre and member/receipt references legible. Hide development-only navigation and the component sandbox banner from the staff workspace.

THESIS: Make the workspace feel like a carefully maintained cooperative member book: every member and payment can be followed from a clear reference, with daily staff tasks remaining familiar and fast.

OWN-WORLD: Use deep cooperative green for the shared navigation rail, quiet paper and white surfaces for records, fine statement rules, tabular financial numbers, and one persistent member or receipt reference treatment. Keep the tone formal and restrained; do not imitate a physical ledger or sacrifice standard web navigation, forms, and tables.

STORY: Staff arrive at a readable portfolio and pending-work overview, then move naturally into a member's record, loan schedule, or receipt. The signature moment is the member reference carried from the member summary through loan and payment rows.

FIRST VIEWPORT: Keep the familiar shell and branch context. Replace dashboard metric tiles with a compact, ruled portfolio summary. Put pending loan approvals in the main work area with member name and number, centre, requested LKR, term, and state. Keep collection, arrears, and report links nearby. In current data, do not label approvals as payments due today.

FORM: Cooperative Member Book, the top-ranked grounded direction (1 of 7), selected by the user; seed:588651e59c591af4.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
