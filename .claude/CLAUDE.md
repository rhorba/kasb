# Kasb — Claude Code Team Framework

> Read `../CLAUDE.md` for full business rules, data model, and tech stack.
> This file governs HOW the AI team works.

---

## Autonomous Mode (default)

- **Design choices**: Always pick 🟡 **BALANCED**.
- **Specialist handoffs**: Proceed automatically — never ask "ready to continue?"
- **Sprint execution**: Work top-to-bottom without pausing between tasks.
- **Testing**: After ANY code task, auto-invoke Tester — never wait for user.

### When to STOP and ask
1. Blocker (Infobip OTP API creds missing, broken dep, schema can't migrate)
2. Scope question not in `../CLAUDE.md`
3. DB schema change breaking migrations or weakening role isolation
4. Security/financial data risk that can't be resolved
5. Sprint boundary (all tasks done → summary + ask for Sprint N+1 approval)

---

## Sprint System

| Sprint | Goal |
|---|---|
| **Sprint 0** | Scaffold + Phone OTP auth + RBAC + RLS + PWA setup |
| **Sprint 1** | Data model + Business profiles + demo seed |
| **Sprint 2** | Cash book: manual entry + summaries + charts |
| **Sprint 3** | Offline-first PWA + sync engine + voice entry + OCR receipts |
| **Sprint 4** | Customer debt book + WhatsApp receipt sharing |
| **Sprint 5** | Credit score engine + microfinance marketplace + applications |
| **Sprint 6** | AE pathway + stock tracker + notifications |
| **Sprint 7** | Admin/partner dashboards + i18n Darija/FR + a11y + security + deploy → v0.1 |

---

## Auto-Handoff Protocol

| When | Auto-trigger |
|---|---|
| Backend/Frontend task DONE | → Tester |
| DB schema change | → DBA + Security Engineer |
| Offline/PWA/sync work | → PWA Engineer |
| Credit score logic | → Credit Engine Engineer |
| Voice / OCR work | → PWA Engineer + Tester |
| Auth / OTP / PII | → Security Engineer immediately |
| Tests PASS for sprint | → Deployment check |
| Sprint all-green | → Project Monitor: snapshot |

---

## Specialist Skills

| Specialist | Load from | Trigger |
|---|---|---|
| Orchestrator | `skills/orchestrator/SKILL.md` | Session start, routing |
| Project Manager | `skills/project-manager/SKILL.md` | Scope, risks |
| Scrum Master | `skills/scrum-master/SKILL.md` | Sprint planning |
| Tech Lead | `skills/tech-lead/SKILL.md` | ADRs, stack |
| DBA | `skills/dba/SKILL.md` | Schema, RLS, migrations |
| Backend Dev | `skills/backend-dev/SKILL.md` | Server actions, API |
| Frontend Dev | `skills/frontend-dev/SKILL.md` | All pages, PWA UI, RTL |
| Credit Engine | `skills/credit-engine/SKILL.md` | Scoring algorithm, partner matching |
| Payments Engineer | `skills/payments-engineer/SKILL.md` | (v0.1: no payments; stubs for credit application flow) |
| PWA Engineer | `skills/pwa-engineer/SKILL.md` | Service worker, offline, push, voice, OCR |
| Tester | `skills/tester/SKILL.md` | Vitest, Playwright |
| Test Architect | `skills/test-architect/SKILL.md` | Adversarial, offline sync, score edge cases |
| Security Engineer | `skills/security-engineer/SKILL.md` | Auth (OTP), role isolation, PII |
| DevOps/DevSecOps | `skills/devops-devsecops/SKILL.md` | Docker, CI, secrets |
| Deployment | `skills/deployment/SKILL.md` | Vercel + Docker |
| UX Designer | `skills/ux-designer/SKILL.md` | Mobile-first, Darija UX, low-literacy |
| UI Designer | `skills/ui-designer/SKILL.md` | Saffron/indigo tokens, big tap targets |
| Content Editor | `skills/content-editor/SKILL.md` | Darija/FR copy, no jargon |
| Project Monitor | `skills/project-monitor/SKILL.md` | Logs, KPIs |

---

## Kasb-Specific Non-Negotiables

1. **Phone OTP is primary auth** — email is secondary. Never assume user has email. Never require it for core features.
2. **Offline-first is non-negotiable** — cash entries work with zero connectivity. A user recording a sale at a market in Derb Sultan must never lose data because of signal. `offlineId` deduplication is sacred.
3. **Money is integer centimes** — never a float. All computations via `Money` helpers.
4. **Entries are append-only** — no in-place edits to financial records. Corrections create a new correcting entry. Audit trail is always preserved.
5. **Credit score is transparent** — formula disclosed to user. No black box. Each component displayed with explanation.
6. **Kasb never lends** — Kasb generates leads for licensed microfinance partners. No credit extension on-platform. Regulatory boundary.
7. **Partner data sharing requires explicit consent** — user must actively consent at application time. Cash flow data never bulk-shared with partners.
8. **Darija first** — every string exists in Darija. French second. UI decisions favoring Darija over French when they conflict.
9. **Performance on 3G / Tecno Spark 10** — every page must be usable on a mid-range Android on 3G. Target: < 3s TTI on 3G (Lighthouse).
10. **Big tap targets** — ≥ 48px on all interactive elements. No exceptions.

---

## YAGNI Gate

```
"Does Kasb v0.1 need this for the DoD (../CLAUDE.md §12)?"
  YES → Build it
  NO  → v0.2 backlog only
```

## 3-Option Pattern (always pick 🟡 BALANCED)

```
🟢 SIMPLE:        [fastest, maybe limited]
🟡 BALANCED:      [moderate effort, good tradeoffs] ← SELECTED
🔴 COMPREHENSIVE: [most robust, highest effort]
→ "Proceeding with 🟡 BALANCED approach: [description]"
```
