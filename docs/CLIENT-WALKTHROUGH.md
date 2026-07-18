# Client Walkthrough Brief — everything inside, how it works, how to present it

Your presenter's manual: what exists, how the admin panel works, how data flows, and the exact demo script. All logins use password `Demo123!`.

---

## 1. The 30-second pitch

> "Your entire membership operation — enrolment, contracts, payments, the £2,600 Major-Event rule, Summit slot allocation, mentoring hours, publishing, investor introductions — now runs itself on one platform, under your own brand. Members sign and pay online and their benefits switch on automatically. Your team gets six permission-scoped consoles. Every action is recorded in an audit trail. Nothing publishes, unlocks, or books without the rules you configure."

---

## 2. What's inside — the map

**One public website + six logins**, all one codebase, one database:

| Surface | Who | What they can do |
|---|---|---|
| Public site | Anyone | Marketing pages, tier comparison, self-service enrolment (details → e-sign → pay → active), privacy policy |
| Member portal | Individual/Enterprise/Temporary members | Dashboard, wallet progress, contracts, mentoring booking, Summit intent letters, article/video submission, investor pitch + consent, News |
| Admin console | Administrators | Everything (see §3) |
| Sales console | Sales reps | Own leads pipeline, manual enrolment, own enrolments — cannot see other reps' data |
| Mentor console | Mentors | ONLY assigned members; log delivered hours; book on member's behalf |
| Investor console | Investors | ONLY pitches whose owner gave consent; express interest |
| Consultant console | Consultants | Mentor view + article co-drafts of assigned members |

The sidebar each person sees is generated from their role — but that's cosmetic; the real security is that **every action re-checks permissions on the server** (§5).

---

## 3. The admin panel, screen by screen

1. **Overview** — live counts (members, total credited, waitlist, pending approvals) + latest audit feed. Talking point: "these numbers are computed from the database at page load — there is no fake dashboard data anywhere."
2. **Members** — searchable/filterable register (tier, status, payment health incl. at-risk Direct Debits). Click any member → **Member 360°**: wallet ring with £2,600 progress, every membership with contract link, Direct Debit plan with *Collect next instalment* button, mentor assignment control, manual ledger entry, manual Major-Event unlock (reason box is mandatory — it goes to the audit log), GDPR erasure.
3. **Payments & wallet** — the append-only ledger (every charge/instalment/refund/adjustment ever, nothing can be edited or deleted — enforced by the database itself) + all Direct Debit plans with progress bars.
4. **Summit console** — create a Summit (three 15-slot categories auto-created), invite members per category, view uploaded intent letters, confirm slots (capacity locked at the database level — two admins clicking at once can never oversell), cancel with reason → next waitlisted person is auto-promoted with a 48-hour offer.
5. **Deal-flow** — every pitch + which investors expressed interest — the Summit-day matchmaking sheet.
6. **Approvals** — submitted articles (approve / request changes / publish) and the video production pipeline (brief → schedule shoot date → production → upload final asset → publish). Nothing goes public without an admin decision.
7. **Reports** — revenue by tier, Major-Event eligibility pipeline, Summit fill rates, DD health, mentoring utilisation — all computed live.
8. **Audit log** — who did what, when, to what, and why — searchable. Contracts, money, permissions, overrides, slots, publishing.
9. **Email log** — every notification the platform sent (in production these also deliver via Postmark; this log remains as the audit copy).
10. **Settings** — the business rules as data: £2,600 threshold, membership fees, waitlist offer window, grace days, rollover policy. **Changing a rule is an edit here, not a software change.**

---

## 4. How data is handled in the backend

**Stack:** Next.js 15 (TypeScript) + PostgreSQL 16 via Prisma. ~25 tables. All money in integer pence; all times UTC, shown London.

**The enrolment state machine** (the heart): `AWAITING_SIGNATURE → AWAITING_PAYMENT → ACTIVE`. An account **cannot** become active without BOTH a signed contract AND confirmed payment — the transition is a database transaction, order-independent, no side doors (sales manual enrolment uses the same machine).

**Money = an append-only ledger.** Every payment event is a new row; balance is the sum. Refunds are negative rows. Nothing is ever edited — a database trigger physically rejects UPDATE/DELETE on the ledger and audit tables. On every credit, the threshold engine re-evaluates: cumulative qualifying credits ≥ £2,600 → a benefit-unlock row is created exactly once → member is emailed → Major Event booking appears on their dashboard. Configurable, not hard-coded.

**The Summit machine:** invitation → intent letter (deadline enforced twice: at the API and by a scheduler that auto-closes) → confirmation under a row-lock (capacity mathematically cannot exceed 15) → cancellations auto-promote the waitlist with expiring offers.

**Background housekeeping** runs every 60 seconds: close expired deadlines, expire stale offers, lapse overdue memberships, collect due Direct Debit instalments (failures flag AT_RISK).

**What's simulated today (labelled honestly in the UI):** card charges, Direct Debit mandates, e-signature provider. The *logic* around them is fully real; going live = connecting the client's Stripe/GoCardless/e-sign accounts. **Email is already real** — one API key and every notification actually delivers.

---

## 5. How frontend & backend stay perfectly in sync

This is the strongest architecture point — there is **no separate API layer to drift out of sync**:

1. **Reads:** every page is a *server component* — it queries PostgreSQL directly at request time and renders the result. The screen literally cannot show stale or fabricated data; what you see IS the database at that moment.
2. **Writes:** every button posts to a *server action* — a server-side function that (a) re-authenticates the session, (b) re-checks the role's permission against the matrix, (c) re-checks row-level scope (a mentor can only touch their assigned members, an investor only consented pitches), (d) mutates inside a transaction, (e) writes the audit row, (f) tells Next.js to re-render the affected pages. The UI updates from the database's new truth — no cache to invalidate by hand, no duplicated state.
3. **Entitlements:** the member dashboard renders from a single resolver — union of all active memberships + wallet unlocks. Upgrade, lapse, or unlock → the next page load reflects it automatically. Hiding a button is never the security; the server check is.

One sentence for the client: *"The screens are windows onto the database, and every action is re-verified by the server — the frontend cannot lie and cannot be tricked."*

---

## 6. The 10-minute demo script

1. **Landing page** — scroll slowly: their roundel, italic-serif hero, Companies-House strip, liquid light ribbons riding the scroll, live Summit countdowns, **their real House of Lords footage**, tilt cards.
2. **Self-enrolment** — `/join` → Enterprise Standard → fill details → contract appears *personalised* → type name to sign → pay by simulated card → **ACTIVE, wallet £3,500, Major Event auto-unlocked** (over threshold in one payment).
3. **The £2,600 moment** — log in `admin@platform.demo` → Members → **Bruno Keller** → wallet ring near threshold → *Collect next instalment* → refresh → **UNLOCKED**, and show the congratulations email in Email log + the audit row. This is the requirement they wrote; it happens live.
4. **Summit console** — slot grids, Dora's intent letter, cancel a confirmed slot (type the reason) → waitlisted applicant becomes OFFERED with a 48-hour expiry. "No more chasing cancellations by email."
5. **Approvals** — approve & publish Bruno's article → show it appear in the member **News** feed.
6. **Deny-proofs (30 seconds, most convincing part):** log in `mentor@platform.demo` — only her two members exist. Log in `investor@platform.demo` — only the consented pitch is visible; Bruno's non-consented one is absent.
7. **Settings** — change the threshold £2,600 → £3,000 and back. "Your rules are configuration, not code."
8. Close on **Audit log**: "every step we just did is recorded here, permanently."

## 7. Questions the client will ask — honest answers

- **"Is it live for real payments?"** — The platform is complete and payment-*ready*; card/DD/e-sign run in labelled simulation until we connect your Stripe, GoCardless and e-signature accounts (~1–2 weeks integration + your account credentials). Email already delivers for real.
- **"Where does data live?"** — PostgreSQL, deployable to UK-region hosting (packaged in Docker with automated daily backups). GDPR: privacy policy with lawful bases at `/privacy`, right-to-erasure built into the admin, no card data ever touches the platform (provider tokenisation).
- **"Can we change fees/rules ourselves?"** — Yes: Settings screen, audited.
- **"What do you need from us?"** — Final contract legal wording, answers to the open questionnaire (esp. whether £2,600 applies to individuals), provider accounts, your original event footage, and a UK hosting decision.
