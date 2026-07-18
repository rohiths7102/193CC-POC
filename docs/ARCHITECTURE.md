# ARCHITECTURE — Membership Management Platform

**The single source of truth for this project.** Client source: "Membership Platform - Project Proposal.docx" (v1.0, 12 July 2026). Benchmark: iod.co. Open client questions live in `Client-Clarification-Questionnaire.docx`; their provisional defaults are in §6 below and are built in as **configuration, never code**.

---

## 1. What the client asked for (digest)

A manually-run UK professional membership body goes fully online:

- **4 products** — Individual £500 · Enterprise Standard £3,500 · Enterprise Investor Ready £9,000 · Temporary £1,500 (one Summit slot, event-linked). All fees/thresholds/capacities configurable, never hard-coded.
- **E-signed contract BEFORE activation** — account stays pending until contract signed AND payment/DD-mandate confirmed; signed contract stored on the record forever.
- **Payments** — one-time card + Direct Debit instalments; per-member append-only ledger; failed-collection retry + at-risk visibility.
- **Credit wallet** — cumulative credited payments ≥ **£2,600** auto-unlock the Major Event (House of Lords) benefit; admin override with logged reason; threshold + qualifying products are config.
- **6 roles** — Member, Administrator, Sales Rep, Mentor, Investor, Consultant — permission-scoped, **enforced at the API layer, not hidden in UI**. Multiple memberships = union of entitlements.
- **Summit module** — per Summit: 3 categories (Business Opportunity Presentation / Brand Launch / Business Award) × 15 slots; online intent-letter upload; hard deadline auto-close; waitlist auto-promotion on cancellation; time-limited login for Temporary members.
- **Mentoring** — 2 hrs/mo (Individual) / 5 hrs/mo (Enterprise); assignment, booking, logging, allowance tracking.
- **Content** — enterprise article (≤1,400 words + 2 HD images) with review→approve→publish workflow; branding video as a production pipeline (brief→shoot→deliver→publish).
- **Deal-flow** — consented enterprise pitches visible to Investors pre-Summit; interest recorded.
- **Admin/Sales CRM** — search/filter, manual enrolment (same contract+payment gates), discounts, reports (revenue, DD health, eligibility pipeline, slot fill, mentoring utilisation), full audit trail.
- **NFRs** — UK GDPR, PCI via tokenisation (no raw card data), audit logging, daily backups, UK data residency, scale without re-architecture.

---

## 2. Architecture (one-shot build)

**A single Next.js 15 full-stack application + PostgreSQL.** One codebase, one server, one command to run. Domain logic lives in a server-only core (`src/server/`), and every mutation passes through guard functions there — the API layer *is* the enforcement point, satisfying the client's RBAC NFR. This supersedes the earlier two-app (NestJS+Next) plan: same design, collapsed into one deployable for speed, fewer files, and zero orchestration overhead. If a mobile app or partner API arrives later, `src/server/` lifts out into a standalone API unchanged.

```
Browser ──► Next.js App Router (SSR + Server Actions + Route Handlers)
              │  middleware: session gate per portal segment
              ▼
          src/server/  ← THE enforcement boundary
              auth (session, bcrypt) · rbac (role×permission matrix)
              entitlements (union resolver) · wallet (ledger + threshold rules)
              enrolment (state machine) · summit (capacity + waitlist, tx-locked)
              mentoring · content · dealflow · crm · audit · outbox(email)
              providers/  payment + e-sign behind interfaces
                          → MOCK adapters (in-app simulators, default)
                          → real Stripe/GoCardless/Dropbox Sign via env keys later
              ▼
          PostgreSQL 16 (Docker, 127.0.0.1:5433) · uploads on local disk (S3 later)
```

**Provider strategy (honest demo):** no external accounts exist yet, so payment, Direct Debit and e-signature run through **mock adapters with in-app simulator screens** — the client can click the entire journey (enrol → sign → pay → active) end-to-end today. Interfaces are identical to the real providers'; going live = adding API keys + one adapter file each. **No fake "integrated" claims** — the UI labels simulation clearly.

**Email:** all outbound mail is written to an `EmailOutbox` table and viewable in the Admin portal (demo-perfect, zero infrastructure). Swap to Postmark later behind the same `sendMail()`.

**Background rules:** threshold evaluation runs inline on every ledger credit (event-driven). Deadline auto-close, membership lapse and waitlist offer expiry run on a 60-second server tick (`instrumentation.ts`) — correct at this scale, upgradeable to pg-boss later.

**Ports:** app `127.0.0.1:3000` · Postgres `127.0.0.1:5433` (5433 avoids clashing with other local stacks; always 127.0.0.1, never `localhost`).

---

## 3. Data model (Prisma / PostgreSQL)

- **User**(role: MEMBER|ADMIN|SALES_REP|MENTOR|INVESTOR|CONSULTANT, email, passwordHash, status)
- **Product**(code, name, priceMinor, billing ANNUAL|ONE_TIME, allowsDirectDebit, active, config)
- **ProductEntitlement**(productId, key, params) — benefit grants as data (e.g. Individual → `main_event_delegate`; Enterprise → `summit_slot`, `article`, `branding_video`, `mentoring_hours{5}`)
- **Membership**(userId, productId, status: DRAFT→AWAITING_SIGNATURE→AWAITING_PAYMENT→ACTIVE→LAPSED/CANCELLED/EXPIRED, periodStart/End, createdVia, salesRepId?, discountId?)
- **Contract**(membershipId, status, signerName, signedAt, signatureRef, docHtml) — stored, retrievable forever
- **LedgerEntry — APPEND-ONLY** (userId, type CHARGE|INSTALMENT|REFUND|ADJUSTMENT|MIGRATION_CREDIT, amountMinor, provider, providerRef unique, walletEligible, reason?, createdById?) · DB trigger blocks UPDATE/DELETE
- **PaymentPlan**(membershipId, months, instalmentMinor, collected, nextCollectionAt, status) — DD instalments
- **ThresholdRule**(benefitKey, thresholdMinor, qualifyingProductIds, active) — seed: `major_event_booking` @ £2,600, Enterprise products
- **BenefitUnlock**(userId, benefitKey, source RULE|MANUAL, ruleId?, ledgerEntryId?, adminId?, reason?, revokedAt?)
- **Event / Summit / SummitCategory**(kind, capacity 15) / **SlotApplication**(status: INVITED→INTENT_SUBMITTED→CONFIRMED | WAITLISTED→OFFERED(48h)→CONFIRMED, intentLetterPath, waitlistPos) — confirmation takes a row lock; capacity is enforced in the transaction
- **MentorAssignment / MentoringSession**(durationMin, status, notes) — allowance = entitlement param, usage summed per month
- **Article**(status: DRAFT→SUBMITTED→IN_REVIEW→CHANGES_REQUESTED→APPROVED→PUBLISHED, wordCount ≤1400 server-enforced, images ≤2) / **VideoTask**(BRIEF_SUBMITTED→SCHEDULED→IN_PRODUCTION→DELIVERED→PUBLISHED)
- **Pitch**(visibilityConsent, materials) / **InvestorInterest**(unique per investor×pitch)
- **Lead**(salesRepId, stage) / **Discount**(code, kind, value, approvedById)
- **Setting**(key, value) — `mentoring.rollover_enabled`, `summit.waitlist_offer_hours`, `renewal.grace_days`, `wallet.threshold_minor`…
- **AuditLog — APPEND-ONLY** (actorId, action, entityType/Id, before/after, reason?) — written in-transaction for contracts, payments, permissions, overrides, slot decisions, publishing
- **EmailOutbox**(to, subject, body, createdAt)

Money = integer pence. Time = UTC, displayed Europe/London.

---

## 4. Portal ↔ module sync map (every portal, what it reads/writes)

| Portal | Sees / does | Server modules |
|---|---|---|
| **Public** | landing, tier cards, enrolment wizard, contract signing, payment, application status | enrolment, contracts, providers, wallet |
| **Member** | dashboard (entitlement-driven widgets), wallet ring (£x/£2,600), contract PDF, mentoring booking + balance, summit invitations + intent upload, article editor, video brief, pitch consent toggle | entitlements, wallet, mentoring, summit, content, dealflow |
| **Admin** | member 360°, payments ledger, manual credit/refund (reason), unlock override (reason), summit console (slot grid, waitlist, deadline), approvals (article/video), reports, audit browser, email log, settings, user/role management | ALL + audit, outbox, settings |
| **Sales** | leads pipeline, manual enrolment (same state machine), discounts, renewals at-risk | crm, enrolment, wallet |
| **Mentor** | assigned members only, log sessions vs allowance, notes | mentoring (row-scoped) |
| **Investor** | consented pitches only, express interest | dealflow (consent-scoped) |
| **Consultant** | mentor scope + article co-draft + video brief (publish stays admin-gated) | mentoring, content |

One login page; role determines destination. RBAC matrix (client §4.3) is seeded and checked server-side on **every** action — UI only renders what the server already allows.

---

## 5. Design system — "Regal Dynamic"

The brief: *the best they'll find anywhere; crazy dynamic in and out; everything reachable.* Direction: **House-of-Lords prestige × modern motion**.

- **Palette:** deep navy `#080F1F` → midnight `#0D1830`, champagne gold `#C6A15B`, ivory `#F7F3EA`, glass surfaces (blur + 1px gold-tinted borders). Dark-first.
- **Type:** Playfair Display (display serif) + Inter (UI), fluid `clamp()` scale.
- **Motion (framer-motion):** page-load orchestration (staggered reveals), scroll-triggered section entrances, animated number counters (wallet, stats), the **wallet progress ring** drawing to £2,600, magnetic/spring buttons, card hover lift + tilt, aurora gradient field + grain texture on hero, marquee benefit strip, portal sidebar with sliding active indicator, layout-animated tabs, skeleton shimmer, toast slide-ins. `prefers-reduced-motion` respected throughout.
- **Reachability:** persistent command-style sidebar per portal, global search on admin, every entity links to its detail, max 2 clicks from dashboard to any action, keyboard focus states, WCAG-conscious contrast.

---

## 6. Decisions in force (1–3 & 5 CONFIRMED by client voice note, 12 Jul 2026; rest provisional — all config-level)

| # | Topic | Built-in default |
|---|---|---|
| 1 | £2,600 scope — **✅ CONFIRMED** | Client: "£2,600 is not the membership amount, it is a software control." Enterprise (£3,500 DD) membership starts immediately with all benefits; **only the Parliament/Major Event gates at £2,600 cumulative**. Individual £500 members attend as delegates with **no threshold**. Exactly as built: Individual tier grants `main_event_delegate` directly; wallet rule scoped to Enterprise products. |
| 2 | DD for individuals — **✅ CONFIRMED** | Client: individuals pay £500 without Direct Debit. `allowsDirectDebit=false` on Individual — card only. |
| 3 | Renewals — **✅ CONFIRMED (half live)** | Client: renewal automated; non-renewal restricts access. Restriction is live (auto-lapse after period + 14-day grace drops all entitlements). Auto-charge on renewal ships with the Stripe/GoCardless integration. |
| 4 | Migration | `MIGRATION_CREDIT` ledger type ready; import deferred until client data arrives |
| 5 | Mentoring rollover — **✅ CONFIRMED** | Client: no rollover — "every month we need to support", unused hours do not compound. `mentoring.rollover_enabled=false` (already the default; the optional rollover logic stays dormant). |
| 6 | Contracts | Clearly-marked placeholder text per tier; real legal text = content swap before go-live |
| 7 | Instalments | Enterprise tiers only, 3 or 6 months, no deposit |
| 8 | Investor consent | Dashboard toggle, default OFF, per-member |
| 9 | Temp login expiry | Event date + 7 days |
| 10 | Waitlist | 48h offer window (`summit.waitlist_offer_hours`), 0 = instant confirm |
| 11 | Discounts | Wallet credits **amount actually paid**; admin-approved codes |
| 12 | Commissions | OUT of scope |
| 13 | Article publishing | Approved article = export view; no external CMS push in v1 |
| 14–16 | Word cap hard-block server-side · Main Event capacity per event · annual limit resets on membership year |

---

## 7. Run it

```powershell
cd D:\membership-platform
docker compose up -d          # Postgres 16 @ 127.0.0.1:5433
npm install
npx prisma migrate dev        # schema + append-only triggers
npx prisma db seed            # products, matrix, demo data, demo logins
npm run dev                   # http://127.0.0.1:3000
```

**Demo logins** (all password `Demo123!`): `admin@platform.demo` · `sales@platform.demo` · `mentor@platform.demo` · `investor@platform.demo` · `consultant@platform.demo` · members `alice@member.demo` (Individual), `bruno@acme.demo` (Ent. Standard, £1,800 wallet — watch the unlock when he pays an instalment), `chen@nova.demo` (Investor Ready, unlocked).

**No git** — this folder is version-controlled by dated zip snapshots to `D:\membership-platform-backups\` after each verified milestone.

**Go-live swap list (the only things standing between demo and production):** real Stripe/GoCardless keys + adapter, real e-sign adapter, Postmark key, S3 for uploads, real contract legal text, UK-region host + daily backup schedule + restore runbook.
