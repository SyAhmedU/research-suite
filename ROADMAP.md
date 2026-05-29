# Throughline — Roadmap to Sellable

Companion to [PITCH.md](./PITCH.md). The pitch says *why* the suite is a product; this says *what stands between the working suite and a product someone pays for*, in priority order.

The suite already works end to end. The gap to "sellable" is not features — it's **identity, persistence, trust, and a price**.

---

## Where we are (honest baseline)

✅ **Done**
- 8 tools live, plus the Throughline hub framing them as one product.
- Cross-tool handoffs wired (ResearchPack: ResearchFlow → Cadence → ToolsScope → JournalTime, with round-trips).
- Catalog grounding on all three legs (449 theories, 174 scales, 98 trend constructs).
- "Generate everywhere" on every tool via one shared AI backend.
- A documented world-class bar across all projects (a11y, SEO, performance, academic credibility).
- `suite-auth.js` exists — a Supabase-backed shared-identity layer (Google + magic-link, per-user RLS), wired as a **pilot on the hub**, defaulting to "preview mode" until config is filled.

⛔ **Blockers before it's truly sellable** (from prior discussion)
1. **No accounts / cloud sync / collaboration** — everything is `localStorage`, single-device. A project started on a laptop doesn't exist on the phone.
2. **No billing model** — nothing to charge, no way to charge it.
3. **AI cost at scale** — every Generate panel hits a shared key; usage is unbounded and unattributed.
4. **Privacy / IRB exposure** — the moment Cadence holds real participant data, we inherit human-subjects obligations we haven't designed for.

---

## Phase 0 — Identity everywhere (unblocks everything)

**Goal:** one sign-in that the whole suite recognises, so a project follows the user across tools and devices.

- Promote `suite-auth.js` from hub-only pilot to **every tool**. Same-origin github.io apps share the session; `*.vercel.app` apps need their own sign-in or a token hand-off (already noted as a `#pack=`-style problem).
- Move the active-project mechanism (`localStorage.active_project_id`) from per-origin to **cloud-backed** (the Supabase `projects` table already exists in `SETUP.md`).
- Keep `localStorage` as the offline/anonymous tier — sign-in *adds* sync, never gates basic use. "Usage-first": you can do real work before you ever make an account.

**Exit criterion:** start a project on the hub, open any tool on a different device signed in as the same user, and the project is there.

---

## Phase 1 — Trust & data governance (gate before real participant data)

**Goal:** make it safe — and honest — to collect real human-subjects data in Cadence.

- **Per-study data ownership**: a study's responses belong to the study owner's account, RLS-enforced, never co-mingled.
- ✅ **Privacy posture, written and visible** — `privacy.html` (linked from the hub footer): local-first default, opt-in cloud + RLS, per-tool storage table, transparent AI handling, the participant-data gate stated plainly, user controls, and an IRB summary. Done 2026-05-30. *Remaining in this bullet: name the Supabase region + a concrete retention window once set.*
- **Consent + anonymisation primitives** in Cadence: a consent gate, participant-code-only identification (already the model), an export-and-purge path.
- **IRB-friendly framing**: a one-page "how Throughline handles participant data" doc an ethics board can read. This is a *sales asset* in the education wedge, not just compliance.
- Data export in standard formats at every stage (already strong: Cadence JSON, ToolsScope .docx/CSV) — never trap the user's data.

**Exit criterion:** an instructor can point their ethics board at a page and get a study approved.

---

## Phase 2 — Metering & billing (turn usage into revenue)

**Goal:** a price, and the plumbing to charge it.

- **Attribute AI cost to accounts.** Route every Generate call through the shared backend *with the user's identity*, so usage is measured per-user. (Consider Vercel AI Gateway for per-call observability + provider fallback.)
- **Tiering** that matches the wedge:
  - *Free / anonymous*: full single-device use, capped AI generations. The suite has to be usable for free — that's the adoption engine.
  - *Student*: cloud sync + higher AI limits + export polish. Priced like a textbook, not like enterprise SaaS.
  - *Cohort / department*: instructor dashboard, seat management, shared exemplar projects.
- **Billing rails**: Stripe (or LemonSqueezy for simpler tax handling). Education pricing + .edu verification.
- Hard cost controls: per-tier generation caps, graceful "you've hit your limit" states (already a pattern — the AI backend 503s cleanly when no key).

**Exit criterion:** a student can pay, and their AI usage stays inside a margin-positive envelope.

---

## Phase 3 — Collaboration (expands beyond the solo researcher)

**Goal:** a project is shareable, because real research is rarely solo.

- Share a project (read / comment / edit) — advisor sees the student's throughline and leaves notes at the stage where the chain breaks.
- Cohort view for instructors: every student's project arc at a glance, gradeable against where the chain holds.
- This is the **multiplayer moment** that turns a tool into an institution-level purchase.

**Exit criterion:** an instructor assigns Throughline to a class and grades the resulting projects inside it.

---

## Phase 4 — The pilot (proof, in priority above polish)

This can start *during Phase 0–1*, not after. The fastest path to "sellable" is evidence it works for someone who isn't the author.

- One methods cohort (or even a handful of grad students), one term, real projects, end to end.
- Instrument where the chain **held** (a handoff saved them time) and where it **broke** (they fell back to copy-paste). That list is the real backlog.
- Write it up. A credible before/after from one cohort is worth more than any feature.

**Exit criterion:** a written account of a real cohort running a project idea → manuscript inside Throughline.

---

## Sequencing logic

```
Phase 0 (identity) ──┬─→ Phase 1 (trust/data) ──→ Phase 2 (billing) ──→ Phase 3 (collab)
                     └─────────────→ Phase 4 (pilot) runs in parallel, informs all of it
```

- **Phase 0 first** because it unblocks 1, 2, and 3 — nothing meters, syncs, or shares without identity.
- **Phase 1 before real data** — never collect participant data we can't govern.
- **Phase 4 throughout** — the pilot is the compass; build what the cohort actually needed, not what the roadmap guessed.

## Explicitly out of scope (for now)
- Phone OTP (paid SMS — already skipped).
- Heavy quant deferred items (CFA/SEM, power analysis, meta-analysis in ToolsScope).
- Mobile-native apps — the suite is mobile-*web* first; native is a later bet.
- Marketplace / third-party tool integration — the value is the *closed* loop first.
