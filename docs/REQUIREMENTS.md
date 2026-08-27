# Pickleball Club Manager — Requirements (v0.1 draft)

> Status: **Living document.** Written from the initial interview on 2026-08-27.
> Everything here is refinable. Open questions are tracked in the last section.

---

## 1. Overview

A platform to manage **pickleball club membership, events, scheduling, and payments**.
Multiple independent clubs run on the same platform, each isolated from the others
(multi-tenant). End users (club admins and members) are **not** expected to operate or
host the application — the platform operator does that.

**Approach:** crawl → walk → run. This starts as a personal/academic build. If it proves
out, real clubs get scoped in later (which introduces data migration in/out — deferred).

---

## 2. Architecture & Stack Decision

**One codebase for web + iOS + Android.** The app is fundamentally CRUD over members,
events, schedules, and payments — the sweet spot for a shared codebase. No camera/AR/
Bluetooth/game needs that would justify separate native codebases.

| Layer | Choice | Why |
|---|---|---|
| App (web + iOS + Android) | **Expo (React Native + TypeScript)** | ~95% shared code, native-quality apps, live preview on a real phone, web build from the same source |
| Backend / DB / Auth | **Supabase** (Postgres + Auth + Row-Level Security) | Managed multi-tenant data, magic-link auth built in, fast to stand up |
| Payments | **Stripe** | Subscriptions for dues + one-off event/tournament fees; club dues & event fees are real-world services, generally allowed via external processor on iOS/Android |

**Pivot policy:** if this stack makes us jump through hoops, we stop and reconsider early
(user is explicitly open to a restart). First prototype targets **web first** (fastest to
click and share), then the iOS Simulator for the phone experience.

---

## 3. Personas & Roles (v1)

Two roles in v1 (kept intentionally simple; an "event organizer" mid-tier role is a likely
phase-2 addition):

- **Club Admin** — superuser for a single club: manage roster, events, schedules, dues
  config, and billing. Provisioned by the platform operator.
- **Member** — self-serve: view events, book/cancel slots, join waitlists, pay dues and
  fees, manage own profile.

**Platform Operator** (you) — provisions clubs and their first admin. Not an in-app role
yet; handled out-of-band for now.

---

## 4. Multi-Tenancy

- Each **club** is an isolated tenant. All members, events, schedules, and payments belong
  to exactly one club.
- Clubs are **provisioned by the platform operator** in v1 (no self-serve club signup).
- Data isolation enforced at the database layer (Supabase Row-Level Security keyed on club).
- **Deferred:** club self-serve onboarding; data migration import/export for clubs coming
  from an existing system.

---

## 5. Functional Requirements

### 5.1 Membership
- Roster of members per club.
- **Membership types** with per-club configuration:
  - *Administrative* (maps to Club Admin role / superuser privileges)
  - *Generic member*
  - *Family plan* — **optional / phase 2.** Flat rate covering up to N linked people under
    one payer (e.g., "$50/mo per person OR $150/mo per family of 4"). Modeled as a billing
    group: one payer, linked members who each still book their own slots. Included in the
    data model from the start so it can switch on later without a rebuild.
- Member profile: name, contact, skill rating, membership type, dues status.
- Members **self-register**; admins can also **manually add** members and override anything.

### 5.2 Dues & Payments (Stripe)
- **Per-club configurable** pricing and cadence.
- **Monthly** billing is the typical default; **annual** offered at a discount.
- **Auto-renewing** subscriptions supported (with renewal + failed-payment handling).
- Members pay their own dues; admins can see/adjust status.
- **Event fees** — per-event or per-session charges (drop-ins, clinics, lessons).
- **Tournament fees** — entry fees (tournament feature itself is stubbed in v1).
- v1 prototype may use **Stripe test mode**; real money is a later toggle.

### 5.3 Events (templates)
An event is a reusable definition:
- Title
- Duration
- Skill level — **standard pickleball rating bands 2.0–5.0**, plus **"Any"**
- Instructor — optional, supports **"None"**

### 5.4 Event Scheduling (instances)
A scheduled instance of an event:
- Links to an event template
- Date / time
- Capacity
- Open slots (derived: capacity − confirmed bookings)
- **Waitlist with auto-promote:** when full, members join a waitlist; on a cancellation the
  next person is automatically moved into the open slot and notified.
- Members **self-book and self-cancel**; admins can override.

### 5.5 Administration Functions (Club Admin)
- Create / edit / remove **event templates**.
- Create / edit / remove **scheduled instances**.
- **Manually add** members and manage the roster.
- Configure membership types, dues rates, and cadence.

### 5.6 Tournament Management — **STUBBED in v1**
- Placeholder/entry point only in v1.
- To flesh out later: format (single/double elimination, round-robin, ladder), brackets,
  seeding, scoring, entry fees (fee plumbing already exists via Stripe).

### 5.7 Notifications
- **Eventual set:** booking confirmations, event reminders, waitlist "slot opened" alerts,
  and payment/dues alerts (due, failed).
- **v1 prototype:** in-app confirmations only; no real email/push. Data model built so
  email/push providers drop in cleanly later. *(Revisit if real notifications are wanted in v1.)*

---

## 6. Non-Functional Requirements

- **Platforms:** modern web browsers + iOS + Android from one codebase.
- **Auth:** **email magic link** (passwordless) via Supabase Auth. No passwords to manage.
- **Security/Isolation:** per-club data isolation via Row-Level Security; payment data
  handled by Stripe (no raw card data stored by us).
- **Scale (early):** small — a handful of clubs, prototype-grade. Design cleanly but don't
  over-engineer for scale yet.

---

## 7. Suggested Data Model (first sketch)

- `clubs` — id, name, settings
- `memberships` — id, club_id, user_id, type (admin/generic/family), status, joined_at
- `family_groups` *(phase 2)* — id, club_id, payer_membership_id, plan, max_members
- `dues_plans` — id, club_id, cadence (monthly/annual), price, stripe_price_id
- `events` — id, club_id, title, duration, skill_level, instructor_id (nullable)
- `event_instances` — id, event_id, date, capacity
- `bookings` — id, event_instance_id, membership_id, status (confirmed/waitlisted/cancelled), position
- `payments` — id, club_id, membership_id, type (dues/event/tournament), amount, stripe_ref, status

*(Illustrative — will be refined during implementation.)*

---

## 8. Roadmap / Phasing

**Phase 1 — Working prototype (current focus)**
Web-first. Auth (magic link), club + roster, membership types, event templates, scheduling
with capacity + waitlist/auto-promote, self-serve booking, admin CRUD, Stripe test-mode
dues + event fees, in-app confirmations. Then boot the iOS Simulator to see the phone build.

**Phase 2 — Fill out**
Family plans, real notifications (email/push), event-organizer role, richer admin reporting.

**Phase 3 — Tournaments**
Full tournament management.

**Phase 4 — Productionization**
Club self-serve onboarding, data migration in/out, real payments, app-store publishing
(Apple Developer ~$99/yr, Google Play ~$25 one-time).

---

## 9. Open Questions

1. **Family plan** — is it worth building at all? Decide before phase 2. (Value = a pricing
   hook for multi-person signups.)
2. **Notifications in v1** — confirmed in-app only, or is real email wanted sooner?
3. **Dues proration / mid-cycle joins** — how are partial first months handled?
4. **Cancellation policy** — is there a cutoff window before an event where members can no
   longer cancel for free / at all?
5. **Refunds** — policy for event/tournament fee refunds on cancellation.
6. **Guest / trial players** — can non-members attend/pay for a drop-in? (Common at clubs.)
7. **Time zones** — per-club time zone for schedules.
8. **Instructor as a role** — are instructors just a labeled member, or a distinct entity?
