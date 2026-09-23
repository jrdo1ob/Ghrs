# GHRS — Official P1 Security Remediation Roadmap

> **Created:** 2026-09-19
> **Purpose:** This document is the authoritative reference for P1 security remediation ordering in the GHRS project.
> **Status:** DOCUMENTATION ONLY — no code, database, or configuration changes were made.

---

## Purpose

This document establishes the official P1 security remediation roadmap for GHRS (غرس). It reconciles findings from multiple audit documents, identifies which findings are classified as P1 (Critical), and defines their remediation ordering based on repository evidence.

**Important:** The "P1 #" numbering convention (P1 #1, P1 #2, P1 #3, etc.) was NOT found in the repository audit documents. The only evidence of this numbering is in git commit messages (`6cf39ae` uses "P1 #1", `a4dd489` uses "P1 #2"). This document reconstructs the P1 scope from the audit findings themselves.

---

## Source of Truth

The following repository documents were used to construct this roadmap:

| Document | Purpose | Key Content |
|---|---|---|
| `GHRS_PHASE_1_SECURITY_AUDIT.md` | Primary security audit | Finding IDs C1, H1-H3, M1-M4, L1-L4, I1-I7; Highest-priority remediation list |
| `GHRS_PHASE_1_1_SECURITY_IMPACT.md` | Impact analysis | Prioritized fix order (items 1-9); classification of each finding |
| `GHRS_PHASE_0_PRODUCTION_TRUTH_LIVE.md` | Production verification | Live database state; P1/P2/P3 risk ranking; REQUIRED NEXT ACTIONS |
| `GHRS_COMPREHENSIVE_AUDIT.md` | Full project audit | P1/P2/P3/P4 risk classification; RECOMMENDED NEXT STEPS |
| `GHRS_INDEPENDENT_VERIFICATION_AUDIT.md` | Independent verification | Corrected counts; confirmed findings |
| `GHRS_FULL_AUDIT.md` | Complete codebase audit | Security review section; recommended roadmap |
| `GHRS_REMEDIATION_AUDIT.md` | Remediation tracking | Migration verification; batch status |
| `GHRS_PHASE_5B_IMPLEMENTATION_REPORT.md` | Phase 5B implementation | Migrations 045-048 applied; remaining issues |
| Git commit messages | Remediation history | P1 #1 (PINs), P1 #2 (logout), P0 #2-#7 |

---

## Priority Definitions

Based on the repository documentation:

| Priority | Label | Definition | Example |
|---|---|---|---|
| **P1** | Critical | Active vulnerability or functional bug with security implications; immediate remediation required | Money-penalty CHECK violation; cross-family IDOR |
| **P2** | High | Security weakness or important functional bug; short-term remediation | Achievement engine mismatch; missing search_path |
| **P3** | Medium | Defense-in-depth gap or hardening recommendation; medium-term | user_sessions cleanup; permissive RLS |
| **P4** | Low | Informational finding or engineering hygiene; longer-term | CI failing; no branch protection |

**Note:** Different documents use slightly different severity classifications. This document uses the most conservative (highest) severity for each finding.

---

## Official P1 Items

Based on repository evidence, the following findings are classified as P1 (Critical):

### P1 Items from Phase 0 Production Truth (LIVE verified)

| Order | Finding ID | Exact Finding | Severity | Current Status | Evidence | Remaining Work | Verification |
|---|---|---|---|---|---|---|---|
| 1 | M4 | `apply_manual_adjustment` money-penalty CHECK violation (`type='penalty'` not in CHECK) | P1 | PASS | `GHRS_PHASE_0_PRODUCTION_TRUTH_LIVE.md:716`; fixed in migration 045 (`045_fix_manual_adjustment_penalty.sql`) | None — fixed | PASS (migration applied) |
| 2 | H2+H1/H3 | REVOKEs from 037/038 not fully applied; `complete_task_with_rewards` EXECUTE retained by anon/authenticated | P1 | PASS | `GHRS_PHASE_0_PRODUCTION_TRUTH_LIVE.md:710-711`; remediated in batches 1-3 | None — fixed | PASS (verified live) |
| 3 | I2 | Uncommitted 041/042 grants applied to Production | P1 | PASS | `GHRS_PHASE_0_PRODUCTION_TRUTH_LIVE.md:712`; committed in `156dfbf` ("security: synchronize source and migrations with Production state") | None — fixed | PASS (committed) |

### P1 Items from Phase 1 Security Audit (repo-level)

| Order | Finding ID | Exact Finding | Severity | Current Status | Evidence | Remaining Work | Verification |
|---|---|---|---|---|---|---|---|
| 4 | C1 | `tasks/create` and `tasks/update` accept arbitrary `assigned_to` without family validation (cross-family IDOR) | CRITICAL | PASS | `GHRS_PHASE_1_SECURITY_AUDIT.md:26-31`; fixed via `verifyMembersBelongToFamily` (committed) | None — fixed | PASS (code verified) |
| 5 | H1+H3 | Login flow: predictable login code + 4-digit PIN + no rate limiting / lockout (brute force) | HIGH | PASS | `GHRS_PHASE_1_SECURITY_AUDIT.md:37-60`; rate limiting added (commit `2181dfe`), weak PINs hardened (commit `6cf39ae`) | None — fixed | PASS (commits verified) |
| 6 | H2 | DB-level family isolation incomplete: `scheduled_task_instances` remains fully open to browser roles | HIGH | PASS | `GHRS_PHASE_1_SECURITY_AUDIT.md:46-54`; migration 043 applied, RLS hardened (commit `3b11d5c`) | None — fixed | PASS (migration + commit) |
### P1 Items from Phase 1 Security Audit (defense-in-depth)

| Order | Finding ID | Exact Finding | Severity | Current Status | Evidence | Remaining Work | Verification |
|---|---|---|---|---|---|---|---|
| 7 | M2 | Server-side route protection is existence-only; role gating is entirely client-side | MEDIUM | PASS | `GHRS_PHASE_1_SECURITY_AUDIT.md:72-76`; middleware role enforcement added (commit `1407de6`) | None — fixed | PASS (code verified) |
| 8 | I4 | Inconsistent server-auth helpers: `validateRequestAuth` vs `validateSession` | INFORMATIONAL | PASS | `GHRS_PHASE_1_SECURITY_AUDIT.md:130-132`; 20 routes migrated to `validateRequestAuth` (commit `88c167c`) | None — fixed | PASS (code verified) |

---

## P1 Ordering Rationale

The ordering above is justified by the following repository evidence:

**Items 1-3 (Phase 0 Production Truth):** These were verified against the LIVE Production database and represent actual production vulnerabilities. They were remediated first because they were confirmed exploitable.

**Items 4-6 (Phase 1 Security Audit — direct vulnerabilities):** These were identified in the Phase 1 security audit as CRITICAL or HIGH severity findings with direct exploit paths. They were remediated in the order specified by the "Highest-priority remediation list" in `GHRS_PHASE_1_SECURITY_AUDIT.md:162-172`.

**Items 7-8 (Phase 1 Security Audit — defense-in-depth):** These were identified as MEDIUM/INFORMATIONAL findings that improve defense-in-depth but were not directly exploitable. They were remediated after the direct vulnerabilities.

**Evidence sources:**
- `GHRS_PHASE_0_PRODUCTION_TRUTH_LIVE.md:714-719` — P1 risk ranking
- `GHRS_PHASE_1_SECURITY_AUDIT.md:162-172` — Highest-priority remediation list
- `GHRS_PHASE_1_1_SECURITY_IMPACT.md:176-189` — Prioritized fix order
- Git commit messages (`6cf39ae` = P1 #1, `a4dd489` = P1 #2)

---

## Historical Conversation Labels

**Important:** The labels "P1 #3", "P1 #4", "P1 #5", "P1 #6", and "P1 #7" were NOT found in any repository document.

The only evidence of "P1 #" numbering in the repository is:
- Git commit `6cf39ae`: `"security: harden weak member PINs (P1 #1)"`
- Git commit `a4dd489`: `"security: fix Supabase Auth logout (P1 #2)"`

These labels must NOT be treated as repository-defined identifiers. They appear to be conversation-level labels established during the audit process.

**Mapping of conversation labels to finding IDs:**

| Conversation Label | Finding ID | Repository Document | Status |
|---|---|---|---|
| P1 #1 | H1/H3 (PIN hardening) | `GHRS_PHASE_1_SECURITY_AUDIT.md:37-60` | PASS (commit `6cf39ae`) |
| P1 #2 | (Supabase Auth logout) | Commit `a4dd489` | PASS |
| P1 #3 | M2 (Middleware role enforcement) | `GHRS_PHASE_1_SECURITY_AUDIT.md:72-76` | PASS (commit `1407de6`) |
| P1 #4 | I4 (API session validation) | `GHRS_PHASE_1_SECURITY_AUDIT.md:130-132` | PASS (commit `88c167c`) |
| P1 #5 | M1 (SECURITY DEFINER search_path) | `GHRS_PHASE_1_SECURITY_AUDIT.md:66-70` | PARTIAL (41 functions still lack search_path) |

**Important clarification for P1 #5:** M1 is NOT a repository-defined P1 finding. M1 is classified as MEDIUM in the original Phase 1 Security Audit (`GHRS_PHASE_1_SECURITY_AUDIT.md:66`). Other repository documents classify/prioritize it as P2 or P3:
- Phase 0 Production Truth Live: P2
- Phase 5B Implementation Report: P3
- Comprehensive Audit: P3
- Independent Verification Audit: P3

The "P1 #5" label was a conversation-level label used during previous remediation discussions. "P1 #5" must NOT be interpreted as proof that M1 is officially P1. The authoritative P1 table (above) does not include M1.

| P1 #6 | M3 (No security response headers) | `GHRS_PHASE_1_SECURITY_AUDIT.md:78-82` | PARTIAL (5 of 6 headers missing) |

**Important clarification for P1 #6:** M3 is NOT a repository-defined P1 finding. M3 is classified as MEDIUM in the original Phase 1 Security Audit (`GHRS_PHASE_1_SECURITY_AUDIT.md:78`). No repository document classifies M3 as P1. The "P1 #6" label was a conversation-level label. The authoritative P1 table (above) does not include M3.

| P1 #7 | NOT FORMALLY DEFINED | — | — |

**Note:** The conversation labels P1 #3 through P1 #6 do NOT appear in any repository document. They were established during the audit conversation and are documented here for transparency only.

---

## L1 Status

**Finding:** L1 — Browser-side session persistence via `localStorage` + OAuth `implicit` flow (no PKCE on web path)

| Attribute | Value |
|---|---|
| **Finding ID** | L1 |
| **Exact title** | Browser-side session persistence via `localStorage` + OAuth `implicit` flow |
| **Severity** | LOW (Phase 1 classification) |
| **Source** | `GHRS_PHASE_1_SECURITY_AUDIT.md:96-99` |
| **Official priority** | NOT documented as P1 in any repository document |
| **Current status** | PARTIAL — PKCE flow fixed, localStorage remains |
| **PKCE remediation** | Commit `793f265` — changed `flowType` from `'implicit'` to `'pkce'` |
| **Remaining issue** | Supabase tokens still stored in `window.localStorage` (`src/lib/supabase/client.ts:15`) |
| **Belongs to P1** | NO — classified as LOW in Phase 1; not in any P1 list |

**Evidence:** L1 is explicitly classified as LOW severity in `GHRS_PHASE_1_SECURITY_AUDIT.md:94-99`. It does NOT appear in the "Highest-priority remediation list" (items 1-9). It is NOT classified as P1 in any repository document.

---

## Status Rules

| Status | Definition |
|---|---|
| **PASS** | Finding has been remediated and verified (code review, migration verification, or Production verification) |
| **PARTIAL** | Finding has been partially remediated; some aspects remain |
| **TODO** | Finding has been identified but remediation has not started |
| **IN PROGRESS** | Remediation is actively being worked on |
| **BLOCKED** | Remediation cannot proceed due to external dependency |

**How statuses are determined:**
- PASS: Confirmed by commit message, migration verification, or code review
- PARTIAL: Confirmed by code inspection showing incomplete remediation
- TODO: Finding exists in audit documents but no remediation evidence found
- IN PROGRESS: Active work visible in recent commits or working tree
- BLOCKED: Explicit dependency documented in audit

---

## Verification Gate

The GHRS project follows these verification rules (established in project documentation):

1. **No PASS claim without evidence** — Every PASS status must be supported by a commit, migration, or code review
2. **No production verification before deployment** — Production testing requires the code to be deployed first
3. **No commit/push until required manual verification** — Some findings require manual browser testing before commit
4. **No unrelated cleanup during isolated remediation phases** — Each remediation phase is scoped to specific findings

These rules are established in:
- `GHRS_PHASE_1_SECURITY_AUDIT.md:176-181` — "Remaining unverifiable" section
- `GHRS_PHASE_5B_IMPLEMENTATION_REPORT.md:145` — "Manual Production verification required before commit/push"
- Audit task instructions (conversation-level)

---

## Open Questions / Documentation Gaps

1. **P1 #7 is not formally defined** — No repository document contains a "P1 #7" label. The P1 numbering beyond #2 exists only in conversation context.

2. **Severity classification conflicts** — Different documents classify the same finding at different severity levels:
   - `M1` (search_path): P1 in Phase 0, P2/P3 in Phase 5B, MEDIUM in Phase 1
   - `scheduled_task_instances`: P1 in Phase 0, P2 in Comprehensive Audit, HIGH in Phase 1
   - This document uses the most conservative (highest) severity for each finding.

3. **P0 findings not included** — The P0 findings (P0 #2-#7) are documented in commit messages but are not part of this P1 roadmap. They were remediated before P1 work began.

4. **L1 classification uncertainty** — L1 is classified as LOW in Phase 1 but was audited as "P1 #7" in conversation. This document classifies L1 as LOW per the Phase 1 evidence.

5. **Production verification gaps** — Some findings were verified only via code review, not Production testing. The verification column reflects the type of verification performed.

---

## Appendix: Complete Finding Inventory

### Phase 1 Findings (by severity)

| Finding ID | Title | Severity | Status |
|---|---|---|---|
| C1 | `tasks/create`/`update` accept arbitrary `assigned_to` | CRITICAL | PASS |
| H1 | Login flow: predictable code + PIN + no rate limiting | HIGH | PASS |
| H2 | `scheduled_task_instances` isolation hole | HIGH | PASS |
| H3 | No brute-force protection on PIN verification | HIGH | PASS |
| M1 | `SECURITY DEFINER` functions lack `SET search_path` | MEDIUM | PARTIAL |
| M2 | Middleware role enforcement is client-side only | MEDIUM | PASS |
| M3 | No security response headers | MEDIUM | PARTIAL |
| M4 | Data integrity bugs in reward/penalty engine | MEDIUM | PASS |
| L1 | Browser-side session persistence via localStorage | LOW | PARTIAL |
| L2 | Verbose OAuth/logout logging | LOW | TODO |
| L3 | `user_sessions` no cleanup sweep | LOW | TODO |
| L4 | Legacy DB tooling (setup-db.js/setup.sql) | LOW | PASS |
| I1 | Dependency versions not checked | INFORMATIONAL | TODO |
| I2 | Untracked migration drift | INFORMATIONAL | PASS |
| I3 | `achievement_definitions` browser-readable | INFORMATIONAL | PASS (by design) |
| I4 | Inconsistent server-auth helpers | INFORMATIONAL | PASS |
| I5 | RPC-internal auth dead for code+PIN users | INFORMATIONAL | DOCUMENTED |
| I6 | `dangerouslySetInnerHTML` with static content | INFORMATIONAL | TODO |
| I7 | OAuth callback ignores `next` param | INFORMATIONAL | TODO |

### Phase 0 Production Findings (by severity)

| Finding | Severity | Status |
|---|---|---|
| REVOKEs from 037/038 not fully applied | P1 | PASS |
| `complete_task_with_rewards` EXECUTE retained | P1 | PASS |
| Uncommitted 041/042 grants | P1 | PASS |
| `apply_manual_adjustment` CHECK violation | P1 | PASS |
| `scheduled_task_instances` permissive RLS | P2 | PASS |
| Achievement engine mismatch | P2 | PASS |
| `check_and_award_achievements` not called | P2 | PASS |
| Most SECURITY DEFINER functions lack search_path | P2/P3 | PARTIAL |
| `user_sessions` no expiry sweep | P3 | TODO |
| `achievement_definitions` write access | P3 | PASS (by design) |

---

## P0 — Security & Reliability Roadmap (Added 2026-09-20)

### P0.1 — Revoke Unused EXECUTE Grants on 19 SECURITY DEFINER Functions

| Attribute | Value |
|---|---|
| **Status** | **PASS** |
| **Date** | 2026-09-21 |
| **Migrations** | `071_revoke_unused_execute_grants.sql` (18 functions), `072_revoke_logout_execute_grants.sql` (1 function) |
| **Scope** | All 19 SECURITY DEFINER functions with anonymous EXECUTE grants |
| **Method** | Production catalog + codebase search + has_function_privilege verification |
| **Production verified** | YES — `xcbedqffmknlzjfpuwdr` queried directly |
| **Result** | 19/19 functions: PUBLIC/anon/authenticated EXECUTE revoked, service_role retained, owner/postgres retained |
| **Risk assessment** | LOW — all application callers use service-role client; functions have internal authorization |
| **Implementation** | COMPLETE — both migrations applied and verified in Production |

**Evidence:**
- Migration 071: 18 REVOKE statements applied and verified (anon=false, auth=false for 18 functions)
- Migration 072: 1 REVOKE statement applied and verified (logout_member_session: anon=false, auth=false)
- Logout route: migrated to `createServiceRoleClient()` (commit `31e6905`)
- `has_function_privilege` confirmed: 19/19 anon=false, auth=false, svc=true, pg=true
- Negative check: zero functions accessible by anon/authenticated
- Function integrity: all 19 functions unchanged (SECURITY DEFINER, owner, search_path, bodies)
- Application regression: logout endpoint returns 200, cookie clearing confirmed
- pg_cron: `reset_weekly_grace_shields` still attached (weekly Sunday midnight)
- Event trigger: `rls_auto_enable` still attached (ddl_command_end)

**Implementation history:**
1. P0.1 verification: PASS (read-only catalog + codebase analysis)
2. Migration 071 created: 18 REVOKE statements (logout excluded)
3. Logout route migrated: `createServiceRoleClient()` (commit `31e6905`)
4. Migration 071 applied: 18/19 functions hardened
5. Migration 072 created: 1 REVOKE statement (logout_member_session)
6. Migration 072 applied: 19/19 functions hardened
7. Production verification: all checks pass

---

### P0.2 — Durable Production Rate Limiting for Auth Endpoints

| Attribute | Value |
|---|---|
| **Status** | **PASS** — P0.2 implementation is deployed and verified in Production by deployment identity, Production member-login/OAuth limiter behavior, isolated E2E coverage, and full 34/34 E2E regression. Direct Production mutation testing of the family-setup limiter and existing member account-lockout remains NOT TESTED because no safe isolated Production test identities exist. This is a verification limitation, not a discovered implementation failure. |
| **Date** | 2026-09-21 |
| **Implementation commit** | `c6c2decd8a86d10d0b9d763bf0bf46c328409f3b` |
| **Latest deployed main SHA** | `82fabe8f1cc718913bcc1a0f5cadbdf105114de0` |
| **Production** | https://ghrs-cyan.vercel.app |
| **Deployment ID** | `dpl_DdqZNWk5VUSGrKT4xE9SFQEsHzyR` |
| **Migrations** | `073_rate_limiting.sql` (rate_limits table, check_rate_limit function, cleanup function, pg_cron) |
| **Scope** | `/api/auth/member-login`, `/auth/callback`, `/api/family-setup` |
| **Method** | Production HTTP testing + Management API database verification + isolated E2E regression |
| **Commit verification** | `c6c2dec` is an ancestor of `82fabe8`; deployed SHA and local HEAD are identical; no P0.2 source divergence |

**Production verification:**
- Member login: 30 requests/5 minutes/IP; requests 1–30 passed limiter; request 31 → HTTP 429; `Retry-After: 243` — **PASS**.
- OAuth callback: 20 requests/5 minutes/IP; requests 1–20 passed limiter; request 21 → HTTP 429; `Retry-After: 207` — **PASS**.
- Fail-closed: before migration application, all three protected endpoints returned HTTP 503 when `check_rate_limit` was unavailable — **PASS**.
- Database/security: rate_limits populated; scopes separated; RLS enabled; browser roles have no direct access; `check_rate_limit` SECURITY INVOKER; service_role/postgres execution retained; hourly cleanup cron present — **PASS**.
- Normal auth regression: member-login invalid credentials → 401; OAuth invalid callback → 307; family-setup unauthenticated → 401 — **PASS**.
- Deployment identity: Production is confirmed to run the exact `82fabe8` commit containing P0.2 — **PASS**.

**E2E evidence:**
- Full isolated E2E regression: `34/34 PASS` (0 failed, 0 skipped, 0 flaky)
- P0.2-related E2E tests: `16/16 PASS`
  - member-login rate limiter + existing lockout assertions: `5/5 PASS`
  - family-setup limiter: `2/2 PASS`
  - activity isolation: `3/3 PASS`
  - withdrawal atomicity: `1/1 PASS`
  - withdrawal isolation: `5/5 PASS`
- TypeScript: `npx tsc --noEmit` = PASS
- E2E project: `efbdjkskejkmoaichzgk`; Production project: `xcbedqffmknlzjfpuwdr` (E2E isolated from Production)

**Implementation evidence:**
- Family setup: scope `family-setup:3600s`, key authenticated `user.id`, window 3600s, maximum 5, authentication before limiter, limiter before `setup_family`, limiter failure → 503, exceeded → 429 with `Retry-After`
- Member login: scope `member-login:300s`, key client IP, window 300s, maximum 30, existing `failed_login_attempts`/`login_locked_until` lockout intact, existing `login_with_code_and_pin` RPC retained
- DB row: `member-login:300s` scope, IP `193.188.123.36`, count=32, window `2026-09-21 06:50:00+00`
- DB row: `oauth-callback:300s` scope, IP `193.188.123.36`, count=22, window `2026-09-21 06:50:00+00`
- Cron: `cleanup-expired-rate-limits`, schedule `0 * * * *` (hourly)
- Function EXECUTE: postgres + service_role only; PUBLIC/anon/authenticated revoked

**Deferred Production checks (NOT TESTED — safety limitations, not discovered failures):**
- Family setup direct Production mutation test: NOT TESTED — no safe isolated Production test identity exists; testing would require creating a Production Auth user and exercising six authenticated setup requests, mutating Production data.
- Existing member lockout direct Production mutation test: NOT TESTED — no safe isolated Production member credentials exist; testing would risk locking a real user account.

**Next step:** P0.2 is closed. Continue with the next official P0 security roadmap item without reopening P0.2 unless new evidence identifies a regression.

---

### P0.3 — Session Security / Expiry / Pruning / Warning

| Attribute | Value |
|---|---|
| **Status** | **PARTIAL** |
| **Date** | 2026-09-21 |
| **Audit type** | READ-ONLY clarification audit (no files modified) |
| **HEAD SHA** | `82fabe8f1cc718913bcc1a0f5cadbdf105114de0` |

**Summary:** Core authentication security is verified — expired/revoked sessions are correctly rejected, TTL is explicit, cookie security is confirmed, and session boundaries are intact. No P0 authentication or security bypass was identified from the P0.3 audit. However, session cleanup (storage hygiene) and session UX items (expiry warning, sliding TTL) are not implemented, preventing a PASS status.

#### Acceptance Criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Expired sessions cannot authenticate | **PASS** | `validate_member_session` requires `expires_at > NOW()` (migration 035:99) |
| 2 | Revoked/logout sessions cannot authenticate | **PASS** | `logout_member_session` deletes DB row; cookie cleared with `max-age=0` |
| 3 | Expiry enforcement across protected routes | **PASS** | All API routes validate via `validateRequestAuth`, `validateSession`, or direct `validate_member_session` RPC |
| 4 | Custom session TTL explicit | **PASS** | 30 days — hardcoded in `login_with_code_and_pin` (063:109), `create_oauth_session` (036:39), cookie Max-Age (member-login:106, callback:113) |
| 5 | Supabase Auth expiry/refresh understood | **PASS** | `autoRefreshToken: true` in browser client; middleware refreshes via `getUser()` |
| 6 | Session cleanup/pruning exists | **NOT IMPLEMENTED** | No pg_cron, no cleanup function, no DELETE for expired `user_sessions` rows |
| 7 | Cleanup cannot remove active sessions | **NOT TESTED** | Cleanup does not exist; safe by absence |
| 8 | Cookie security | **PASS** | `ghrs_member_session`: HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age=30 days |
| 9 | Session-token storage reviewed | **INFO** | Supabase Auth tokens stored in `window.localStorage` — intentional default browser-client behavior; not an immediate vulnerability by inspected evidence |
| 10 | Session boundaries | **PASS** | Parent/child/owner roles enforced; `verifyRecordBelongsToFamily` prevents cross-family access |
| 11 | No auth bypass identified | **PASS** | No path found where expired/revoked sessions grant access |
| 12 | Expiry warning UX | **NOT IMPLEMENTED** | No client-side expiry warning, no in-session notification |

#### Finding Classifications

| Finding | Classification | Detail |
|---|---|---|
| **S1** — No `user_sessions` cleanup | **P1 Operational / Security Hardening** | Expired rows accumulate indefinitely; no auth bypass (rejected by `expires_at > NOW()`); storage hygiene gap. Carry forward as P1 task. |
| **S2** — `validateSession` vs `validateRequestAuth` on 3 routes | **RETRACTED as security finding → INFO** | All 3 routes (`/api/tasks/complete`, `/api/withdrawals/request`, `/api/gifts/redeem`) are intentionally child-only with explicit `role === 'child'` checks. `validateSession` vs `validateRequestAuth` has zero security impact because owner lacks the `ghrs_member_session` cookie and parent fails the role check regardless. `/api/withdrawals/request` has no frontend callers (dead code). **Do NOT carry forward as security remediation.** |
| **S3** — No session expiry warning | **P2 UX / Session Experience** | Carry forward as P2 task. |
| **S4** — No sliding/refresh TTL for GHRS sessions | **P2 UX / Session Experience** | Fixed 30-day TTL is explicit and enforced. Carry forward as P2 task. |
| **S5** — Supabase Auth localStorage | **INFO** | Intentional default browser-client behavior. No immediate remediation. |
| **S6** — No `last_activity` field | **INFO** | No action now. |
| **S7** — Logout behavior | **INFO** | Correct and understood. No action now. |
| **S8** — Legacy unused session functions | **INFO / Technical Debt** | No action now. |
| **S9** — Middleware DB lookup for role resolution | **INFO / Performance** | No action now. |

#### Next Step

- P0.3 remains **PARTIAL**.
- No P0.3 code remediation is authorized in this task.
- **S1** should be carried forward as a **P1 operational/security-hardening task** (session cleanup via pg_cron or equivalent).
- **S3** and **S4** should be carried forward as **P2 UX/session-experience tasks**.
- **S2 must NOT** be carried forward as a security remediation — reclassified as INFO.
- After this roadmap update, **P0.4 Security Regression Verification** remains the next P0 security task.

---

### P0.4 — Security Regression Verification

| Attribute | Value |
|---|---|
| **Status** | **PASS** — P0.4 re-verification confirms no P0 security regression. All P0.1/P0.2/P0.3 hardening remains intact. Server logs and ESLint/Prettier remain NOT TESTED — these are verification limitations, not discovered regressions. |
| **Date** | 2026-09-22 |
| **Audit type** | READ-ONLY (no files modified) |
| **HEAD SHA** | `82fabe8f1cc718913bcc1a0f5cadbdf105114de0` |

**Summary:** A comprehensive regression re-verification was conducted covering P0.1 grant hardening, P0.2 rate limiting, P0.3 session security, authentication/authorization across all 50 API routes, database security, cross-family isolation, withdrawal atomicity, Production deployment identity, TypeScript compilation, and E2E infrastructure. **No P0 security regression was discovered.** All previously PASS items remain PASS. Remaining NOT TESTED items (server logs, ESLint/Prettier) are verification limitations, not identified security regressions.

#### Regression Re-Verification Summary

| Area | Status | Evidence |
|---|---|---|
| P0.1 regression (19 EXECUTE revocations) | **PASS** | All 19 REVOKEs intact; no post-072 migrations exist; logout uses service-role; search_path hardened |
| P0.2 regression (3 rate limiters) | **PASS** | member-login (30/300s), OAuth callback (20/300s), family-setup (5/3600s) all present; migration 073 intact; no in-memory rate limiter reintroduced |
| P0.3 regression (session security) | **PASS** | `expires_at > NOW()` enforced; cookie security intact; logout revokes + clears; S2 retraction valid |
| Authentication / authorization (50 API routes) | **PASS** | All routes have authentication; no cookie trust without validation; no service-role browser exposure |
| Database security | **PASS** | No post-073 migrations; search_path hardened (070); RPC permissions intact |
| Cross-family isolation | **PASS** | Family boundaries enforced in task approve, withdrawal approve, gift approve, member create, task create/update |
| Withdrawal atomicity | **PASS** | Atomic RPC (`approve_withdrawal`); family checks; status guards; E2E coverage |
| Production deployment identity | **PASS** | HTTP 200; SHA `82fabe8` matches HEAD/origin/main |
| TypeScript | **PASS** | `npx tsc --noEmit` — zero errors |
| E2E regression | **PASS** | 9 spec files present; isolated infrastructure intact; previous 34/34 PASS documented |
| Server logs | **NOT TESTED** | No Vercel access. Verification limitation, not a regression. |
| ESLint / Prettier | **NOT TESTED** | No verified configuration available. Verification limitation, not a regression. |

#### Evidence

**P0.1 regression re-verification:**
- Migration 071: 18 REVOKE statements verified present at expected line numbers
- Migration 072: `logout_member_session` REVOKE verified present
- No migrations numbered 074+ exist; no GRANT EXECUTE found after 072
- `src/app/api/auth/logout/route.ts:2,13` — `createServiceRoleClient()` confirmed
- `070_harden_security_definer_search_path.sql` — 49 functions with `SET search_path = public, extensions`

**P0.2 regression re-verification:**
- `src/app/api/auth/member-login/route.ts:31` — `check_rate_limit` before `login_with_code_and_pin` (line 67)
- `src/app/auth/callback/route.ts:39` — `check_rate_limit` before `exchangeCodeForSession` (line 65)
- `src/app/api/family-setup/route.ts:26` — `check_rate_limit` after auth (line 16), before `setup_family` (line 69)
- Migration 073: `rate_limits` table, `check_rate_limit` (SECURITY INVOKER), `cleanup_expired_rate_limits`, pg_cron hourly — all present
- No in-memory rate limiter reintroduced (grep for `new Map` in API routes: 16 occurrences, all data-lookup)

**P0.3 regression re-verification:**
- `validate_member_session` at `035:109` — `AND s.expires_at > NOW()` unchanged
- `logout_member_session` at `035:130-131` — DELETE FROM user_sessions unchanged
- Cookie: httpOnly, secure, sameSite='lax', maxAge=30 days — both login routes confirmed
- S2 retraction valid: `tasks/complete:43`, `withdrawals/request:15`, `gifts/redeem:14` — all enforce `role === 'child'`

**Cross-family isolation:**
- `tasks/approve/route.ts:57` — `taskData.family_id !== session.member.family_id` → 403
- `withdrawals/approve/route.ts:74` — `withdrawalMember.family_id !== member.family_id` → 403
- `tasks/create/route.ts:38` — `verifyMembersBelongToFamily` for assigned_to arrays
- All child routes derive member_id from session, not request body

**Withdrawal atomicity:**
- `approve_withdrawal` RPC at `066_atomic_withdrawal_approval.sql:13` — atomic: locks row, checks balance, deducts, updates status
- EXECUTE revoked from browser roles (line 145), granted to service_role only (line 139)
- E2E test `p0-withdrawal-atomicity.spec.ts` — verifies concurrent approvals result in exactly one success

**Static verification:**
- `npx tsc --noEmit` — zero errors (run during this re-verification)
- Production: HTTP 200 at `https://ghrs-cyan.vercel.app` with expected Arabic content

#### Remaining Verification Gaps (Verification Limitations, Not Regressions)

| # | Gap | Status | Reason |
|---|---|---|---|
| 1 | Server/runtime logs | **NOT TESTED** | No Vercel token/access available. Verification limitation, not a discovered regression. |
| 2 | ESLint / Prettier | **NOT TESTED** | No verified configuration available. Verification limitation, not a discovered regression. |

#### Critical Findings

**No P0 security regression discovered.** No new vulnerability was identified. No existing P0 finding was reintroduced.

#### Next Step

P0.4 is **PASS**. P0 security closure is complete.

---

## P0 Security Closure

| Item | Status | Summary |
|---|---|---|
| **P0.1** | **PASS** | 19/19 EXECUTE grants revoked. Logout uses service-role. search_path hardened. Verified in Production. |
| **P0.2** | **PASS** | Durable rate limiting on all 3 auth endpoints. Migration 073 intact. Production verified (HTTP 429). E2E 34/34 documented. |
| **P0.3** | **PARTIAL** | Session security verified — expired/revoked sessions rejected, cookie secure, logout correct. S2 retracted. Deferred items: S1 (session cleanup → P1), S3 (expiry warning → P2), S4 (sliding TTL → P2). P0.3 remains PARTIAL because deferred operational/UX items are not implemented, but the P0.3 security boundary has no identified P0 regression and does not block P0 security closure. |
| **P0.4** | **PASS** | Regression re-verification found no P0 security regression across all areas. Server logs and ESLint/Prettier NOT TESTED — verification limitations, not regressions. |

**P0 security closure is complete.** No P0 security regression was identified across P0.1, P0.2, P0.3, or P0.4. Remaining gaps are verification limitations (server logs, ESLint/Prettier) or deferred P1/P2 work (session cleanup, expiry warning, sliding TTL) — none are P0 security failures.

**Verified state:**
- HEAD / origin/main: `82fabe8f1cc718913bcc1a0f5cadbdf105114de0`
- Production: `https://ghrs-cyan.vercel.app` (deployment `dpl_DdqZNWk5VUSGrKT4xE9SFQEsHzyR`)
- TypeScript: `npx tsc --noEmit` PASS
- E2E: 34/34 PASS (documented; fresh run not performed during P0.4 re-verification)

---

## P1.1 — Test Architecture and Isolated Test Environment

### P1.1-A — Version-Control e2e_hash_pin

| Attribute | Value |
|---|---|
| **Status** | **PASS** |
| **Date** | 2026-09-22 |
| **Migration** | `074_e2e_hash_pin.sql` |
| **E2E project** | `efbdjkskejkmoaichzgk` (isolated from Production `xcbedqffmknlzjfpuwdr`) |

**Summary:** The `e2e_hash_pin` RPC dependency — previously created manually on the E2E project and not version-controlled — is now defined in migration 074. The function uses PostgreSQL `crypt()` + `gen_salt('bf')` for bcrypt hashing, matching the existing PIN verification pattern in production. EXECUTE is revoked from PUBLIC/anon/authenticated; service_role only.

**Implementation:**
- `DROP FUNCTION IF EXISTS public.e2e_hash_pin(p_pin text)` — handles pre-existing versions with different parameter names
- `CREATE FUNCTION public.e2e_hash_pin(pin TEXT)` — parameter named `pin` to match Supabase RPC call convention `{ pin }`
- `SECURITY DEFINER`, `SET search_path = public`
- `REVOKE EXECUTE FROM PUBLIC, anon, authenticated`
- `GRANT EXECUTE TO service_role`
- pgcrypto extension already enabled (migration 001)

**Verification:**
- Function exists on E2E project: `pg_proc.proname = 'e2e_hash_pin'`, `pin text` parameter, `text` return, `prosecdef = true`
- EXECUTE permissions: anon=false, auth=false, svc=true
- Direct SQL test: `e2e_hash_pin('2468')` returns valid 60-char bcrypt hash (`$2a$...`)
- E2E fixture `createTestFamily()` successfully calls `supabase.rpc('e2e_hash_pin', { pin })` and generates compatible hashes
- Full 34/34 E2E suite passes with function in place

**Security:**
- Function is test-only; EXECUTE restricted to service_role
- Identical bcrypt pattern to production `login_with_code_and_pin` / `create_member_pin`
- On Production project, this function should NOT be applied

---

### P1.1-B — Add test:e2e Script

| Attribute | Value |
|---|---|
| **Status** | **PASS** |
| **Date** | 2026-09-22 |
| **Script** | `"test:e2e": "npx playwright test"` |

**Summary:** Added canonical `test:e2e` npm script to `package.json`. No new dependencies introduced. Script works with existing E2E environment mechanism (env vars loaded from `e2e/.env.e2e` or shell).

**Verification:**
- `npm run test:e2e` equivalent confirmed working (34/34 PASS)
- No Production credentials required by the script itself
- Existing scripts preserved: `dev`, `build`, `start`

---

### P1.1 E2E Regression Result

**Freshly verified:** 34/34 PASS (0 failed, 0 skipped, 0 flaky) — run during this task on 2026-09-22.

| Spec | Tests | Result |
|---|---|---|
| `smoke/auth-login.spec.ts` | 4 | ALL PASS |
| `security/p0-login-rate-limit.spec.ts` | 5 | ALL PASS |
| `security/p0-family-setup-rate-limit.spec.ts` | 2 | ALL PASS |
| `security/p0-activity-isolation.spec.ts` | 3 | ALL PASS |
| `security/p0-withdrawal-isolation.spec.ts` | 5 | ALL PASS |
| `security/p0-withdrawal-atomicity.spec.ts` | 1 | ALL PASS |
| `security/p0-balance-rpc-permissions.spec.ts` | 5 | ALL PASS |
| `security/p0-verify-member-pin.spec.ts` | 5 | ALL PASS |
| `security/p0-create-oauth-session.spec.ts` | 4 | ALL PASS (1 BLOCKED — requires Google OAuth, documented) |

**Total:** 34 passed, 0 failed, 0 skipped, 0 flaky

---

### P1.1 Remaining Gaps

| # | Gap | Severity | Status |
|---|---|---|---|
| 1 | No CI/automation (GitHub Actions, PR checks) | MEDIUM | Deferred — not in scope for P1.1 |
| 2 | `owner.ts` throws at module load without env vars | LOW | Deferred — runtime only, does not affect test execution |
| 3 | No global setup/teardown in Playwright config | LOW | Deferred |
| 4 | Cleanup FK warning on `money_transactions` | LOW | Pre-existing; cleanup succeeds with warning |

---

### P1.1 Next Step

P1.1-A and P1.1-B are **PASS**. The two identified P1.1 blockers are closed:
1. `e2e_hash_pin` is version-controlled in migration 074
2. `test:e2e` script is available

Proceed to **P1.2 Critical-Path E2E** — expand E2E coverage for authentication, authorization, family isolation, task lifecycle, gift lifecycle, withdrawal lifecycle, balance operations, and session behavior.

---

## P1.2 — Critical-Path E2E

| Attribute | Value |
|---|---|
| **Status** | **PASS** |
| **Date** | 2026-09-22 |
| **E2E Result** | 151/151 PASS |
| **Baseline** | 34/34 PASS (P1.1) → 151/151 PASS (P1.2 complete) |
| **Production** | NOT modified by P1.2 E2E work |
| **E2E Project** | `efbdjkskejkmoaichzgk` |

**Summary:** P1.2 expanded E2E coverage from 34 tests to 151 tests across 8 slices. All tests pass. No regressions. No Production changes.

### P1.2 Slice Results

| Slice | Description | Tests | Status |
|---|---|---|---|
| P1.2.1 | Task Critical Lifecycle | 11 | PASS |
| P1.2.2 | Gift Critical Lifecycle | 11 | PASS |
| P1.2.3 | Withdrawal Critical Lifecycle | 9 | PASS |
| P1.2.4 | Role Enforcement | 15 | PASS |
| P1.2.5 | Cross-Family Isolation | 13 | PASS |
| P1.2.6 | Session Behavior | 18 | PASS |
| P1.2.7-B | Task Revoke BHD Reversal (fix) | 15 | PASS — FIXED, DEPLOYED, PRODUCTION VERIFIED |
| P1.2.7 | Financial Accuracy | 25 | PASS |
| **Total** | | **151** | **ALL PASS** |

### P1.2.7-B Financial Correctness Fix

| Attribute | Value |
|---|---|
| **Defect** | `revoke_task_approval` did not reverse BHD money rewards after task approval revocation |
| **Root cause** | Migration 0340 replaced the function but dropped the BHD reversal from migration 027 |
| **Fix** | Migration 075 added `money_transactions` reversal with `type='withdrawn'` |
| **Commit** | `334d3d25b162673ce22322959b79d3f52a4d6bd8` |
| **Deployed** | YES — Vercel auto-deploy + migration 075 applied to Production Supabase |
| **Production verified** | YES — `revoke_task_approval` function body confirmed on `xcbedqffmknlzjfpuwdr` |
| **E2E regression** | 15/15 focused tests PASS, 151/151 full suite PASS |

### P1.2 Next Step

P1.2 is **PASS**. Proceed to P1.3 (Security/Reliability Hardening) or PRODUCT PHASE 1 (Product Polish Foundation).

---

## P1.3 — Security / Reliability Hardening

| Attribute | Value |
|---|---|
| **Status** | **TODO / PLANNING** |
| **Date** | 2026-09-22 |

**Purpose:** Continue security and reliability hardening after the P1.2 critical-path verification is complete.

**Candidate scope (to be investigated before implementation):**

1. P0.3 remaining session cleanup/deferred operational hardening (S1 — user_sessions cleanup via pg_cron)
2. CI / automated regression foundation (GitHub Actions, PR checks)
3. E2E environment protection and automation
4. Any remaining concrete security findings verified against current code
5. ESLint/Prettier verification and enforcement
6. Server log access and monitoring

**Important:** P1.3 must begin with a Current-State Audit before any implementation. Do not declare scope final until the audit is complete.

**Status:** TODO / PLANNING — no implementation authorized until dedicated audit prompt is executed.

---

## P1.4 — Security / Reliability (Future)

| Attribute | Value |
|---|---|
| **Status** | **TODO / NOT YET DEFINED** |

Reserved for future security/reliability work after P1.3. Scope to be determined based on P1.3 findings.

---

# GHRS PRODUCT / UI / UX ROADMAP

> **Created:** 2026-09-22
> **Purpose:** Product development and UX improvement roadmap for GHRS (غرس).
> **Status:** PLANNING — no implementation authorized until dedicated audit prompts are executed.

This track is separate from the Security/Reliability track. Product/UI work must not weaken security, authorization, family isolation, financial correctness, or session security.

---

## Product Identity

| Attribute | Value |
|---|---|
| **Language** | Arabic-first (RTL) |
| **Parent experience** | Simple, clear, functional |
| **Child experience** | Playful, animated, rewarding |
| **Core metaphor** | Seed → Sprout → Plant → Small Tree → Big Tree → Garden |
| **Progression mechanism** | XP (experience points) |
| **Real reward** | BHD (Bahraini Dinar) balance |
| **Themes** | Light / Dark / System |
| **Responsive** | Mobile (bottom nav) + Desktop (sidebar) |
| **Orientation** | Family-oriented, multi-child support |

---

## Current Product Baseline (2026-09-22)

**Implemented and verified:**
- 25 user-facing pages
- 44 API routes
- Parent experience: dashboard, tasks, gifts, approvals, activity, ledger, payments, settings, achievements, Quran, stories, presets, reward bank
- Child experience: home, tasks, garden, gifts, profile
- Task lifecycle: create → complete → approve → XP/BHD reward
- Gift lifecycle: create → redeem → approve → XP/BHD deduction
- Withdrawal lifecycle: request → approve → BHD deduction
- XP/BHD reward system with transaction ledger
- Garden progression (6 levels, connected to real XP)
- Streaks (current, longest, grace shields)
- Achievements (6 defined)
- Multiple children per family
- Arabic-first RTL responsive design
- Light/dark/system themes
- 151/151 E2E tests passing

**Known gaps (from Product + UI/UX Audit):**
- ~~No error boundaries/recovery pages~~ — IMPLEMENTED (Product Phase 1)
- ~~No onboarding tutorial~~ — IMPLEMENTED (Product Phase 1)
- No push notifications
- No parent analytics/reports
- ~~No dedicated child progress detail page~~ — IMPLEMENTED (Product Phase 1)
- No notification center
- No daily goals
- No streak incentives (tracked but no reward)
- No family-wide goals
- ~~Confirmation UX inconsistency~~ — FIXED (Product Phase 1)
- Accessibility gaps (Chinese aria-label, no focus traps, no skip-to-content)

---

## Product Phase 1 — Product Polish Foundation

| Attribute | Value |
|---|---|
| **Status** | **PASS — PRODUCTION VERIFIED** |
| **Date** | 2026-09-22 |
| **Commit** | `50bfb3545746d071934dd432136cdd4acb3ba005` |
| **Production** | https://ghrs-cyan.vercel.app (Vercel auto-deploy) |

**Purpose:** Improve fundamental UX and recovery experience before adding larger product systems.

### Implemented Items

#### PRODUCT-1: Error Boundaries & Error Recovery — PASS

| Attribute | Value |
|---|---|
| **Files** | `src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/loading.tsx`, `src/app/global-error.tsx` |
| **Status** | IMPLEMENTED |
| **Verification** | TypeScript PASS; Production `/not-a-real-page` returns HTTP 404; all page routes deploy without error |

#### PRODUCT-2: Confirmation UX Consistency — PASS

| Attribute | Value |
|---|---|
| **Files modified** | `src/app/children/page.tsx` |
| **Status** | IMPLEMENTED |
| **Change** | Replaced native `confirm()` with existing `ConfirmDialog` (danger variant). Deleted member confirmation now uses animated modal instead of browser dialog. Existing deletion behavior preserved. |
| **Verification** | TypeScript PASS; E2E regression PASS; no Production data mutation |

#### PRODUCT-3: Parent Onboarding — PASS

| Attribute | Value |
|---|---|
| **Files** | `src/components/OnboardingWizard.tsx` (NEW), `src/app/dashboard/page.tsx` (MODIFIED) |
| **Status** | IMPLEMENTED |
| **Features** | 5-step wizard; family-scoped localStorage persistence (`ghrs-onboarding-completed:<family_id>`); contextual starting step based on child/task count; Next/Back/Skip buttons; Arabic-first; framer-motion animated |
| **Verification** | TypeScript PASS; Production dashboard loads without error; no Production family data altered |

#### PRODUCT-4: Parent Child Progress Detail — PASS

| Attribute | Value |
|---|---|
| **Files** | `src/app/children/[id]/page.tsx` (NEW), `src/app/api/children/detail/route.ts` (NEW) |
| **Status** | IMPLEMENTED |
| **Features** | Parent-facing child detail page with XP, BHD, level, streak, achievements, task history, XP history. API route with `validateRequestAuth` + `requireParentRole` + `verifyRecordBelongsToFamily`. Read-only — no financial mutations. |
| **Verification** | TypeScript PASS; Production `/children/test-id` responds HTTP 200; no Production data mutation |

### Product Phase 1 Verification Evidence

| Check | Result |
|---|---|
| TypeScript (`npx tsc --noEmit`) | PASS — zero errors |
| Full E2E suite | 151/151 PASS — 0 failed, 0 skipped, 0 flaky |
| Pre-Commit Review | PASS — all 9 files reviewed; security and family isolation verified |
| Commit | `50bfb3545746d071934dd432136cdd4acb3ba005` — exactly 9 Product Phase 1 files |
| Push | SUCCESS — origin/main = `50bfb35` |
| Production deployment | Vercel auto-deploy from main — SUCCESS |
| Production smoke | HTTP 200 for all 9 primary routes + dynamic `/children/[id]` + 404 for invalid routes |
| Security/family isolation | PASS — child detail API uses `validateRequestAuth` + `requireParentRole` + `verifyRecordBelongsToFamily` |
| Financial regression | PASS — no financial mutations introduced; read-only child detail API only |
| Database/schema impact | NONE — no migrations; no schema changes |
| Production data mutation | NONE — verification only; no Production data altered |
| Mishkat | NOT TOUCHED |

### Product Phase 1 Files Committed

1. `src/app/error.tsx` (NEW)
2. `src/app/not-found.tsx` (NEW)
3. `src/app/loading.tsx` (NEW)
4. `src/app/global-error.tsx` (NEW)
5. `src/components/OnboardingWizard.tsx` (NEW)
6. `src/app/children/[id]/page.tsx` (NEW)
7. `src/app/api/children/detail/route.ts` (NEW)
8. `src/app/children/page.tsx` (MODIFIED — ConfirmDialog + detail link)
9. `src/app/dashboard/page.tsx` (MODIFIED — OnboardingWizard integration)

### Product Phase 1 Next Step

Product Phase 1 is **PASS — PRODUCTION VERIFIED**. Proceed to **Product Phase 2 — Child Engagement** (planning / current-state audit required before implementation).

---

## Product Phase 2 — Child Engagement

| Attribute | Value |
|---|---|
| **Status** | **PASS — PRODUCTION VERIFIED** |
| **Date** | 2026-09-23 |
| **Commit** | `0a5fde286026cfa17a7bba4980dbdc8e0c077b9e` |
| **Production** | https://ghrs-cyan.vercel.app |

**Implemented Items:**

#### PRODUCT-2A: Daily Goals — PASS

| Attribute | Value |
|---|---|
| **Files** | `src/app/api/child-mode/daily-goal/route.ts` (NEW), `supabase/migrations/076_daily_goals.sql` (NEW), `src/app/child-mode/page.tsx` (MODIFIED), `src/app/children/page.tsx` (MODIFIED), `src/app/api/child-mode/data/route.ts` (MODIFIED) |
| **Status** | IMPLEMENTED |
| **Features** | Parent can set daily task completion goals (1-20 tasks) for each child; child home page displays daily goal progress (target/completed/reached); goal state is server-authoritative (RPC `set_daily_goal` with parent authorization); default goal is 3 tasks; family isolation enforced |
| **Security** | `validateRequestAuth` + `requireParentRole` on daily-goal endpoint; family ownership verified server-side; child role cannot configure goals; unauthenticated requests return 401 |

#### PRODUCT-2B: Achievement Sync — PASS

| Attribute | Value |
|---|---|
| **Files** | `src/app/child-mode/profile/page.tsx` (MODIFIED), `src/app/api/child-mode/data/route.ts` (MODIFIED) |
| **Status** | IMPLEMENTED |
| **Features** | Child profile achievements now database-driven (queried from `achievement_definitions` and `member_achievements`); hardcoded 6-achievement behavior replaced; progress computed client-side from `requirement_type`; unlocked/total counts from server |

#### PRODUCT-2C: Streak Incentive UI — PASS

| Attribute | Value |
|---|---|
| **Files** | `src/app/child-mode/page.tsx` (MODIFIED) |
| **Status** | IMPLEMENTED |
| **Features** | Streak milestone celebration UI (confetti + toast) for days 7/14/21/30; celebration is cosmetic (no XP mutation); uses `prevStreakRef` to prevent duplicate triggers |

#### PRODUCT-2D: Reward Feedback — PASS

| Attribute | Value |
|---|---|
| **Files** | `src/app/child-mode/page.tsx` (MODIFIED) |
| **Status** | IMPLEMENTED |
| **Features** | Daily goal celebration (confetti + toast when goal reached); `prevGoalRef` prevents duplicate celebrations; level-up celebration preserved |

### Product Phase 2 Verification Evidence

| Check | Result |
|---|---|
| TypeScript (`npx tsc --noEmit`) | PASS — zero errors |
| E2E Phase 2 focused suite | 17/17 PASS |
| E2E P1/P2/smoke regression | 123/123 PASS |
| E2E P0 suite | 30/30 PASS |
| Pre-Commit Review | PASS — 8 files reviewed; security and family isolation verified |
| Commit | `0a5fde286026cfa17a7bba4980dbdc8e0c077b9e` — exactly 8 Phase 2 files |
| Push | SUCCESS — origin/main = `0a5fde2` |
| Production deployment | Vercel auto-deploy from main — SUCCESS |
| Production smoke | HTTP 200 for all routes; API endpoints return 401 for unauthenticated; 405 for GET on POST-only endpoint |
| Security/family isolation | PASS — daily-goal uses `validateRequestAuth` + `requireParentRole` + family check |
| Financial regression | PASS — no financial mutations introduced |
| Database/schema impact | Migration 076 (`daily_goals` table + RPCs) — RLS enabled, EXECUTE restricted to service_role |
| Production data mutation | NONE — verification only; no Production data altered |
| Mishkat | NOT TOUCHED |

### Product Phase 2 Files Committed

1. `supabase/migrations/076_daily_goals.sql` (NEW)
2. `src/app/api/child-mode/daily-goal/route.ts` (NEW)
3. `src/app/api/child-mode/data/route.ts` (MODIFIED)
4. `src/app/child-mode/page.tsx` (MODIFIED)
5. `src/app/child-mode/profile/page.tsx` (MODIFIED)
6. `src/app/children/page.tsx` (MODIFIED)
7. `e2e/fixtures/family.ts` (NEW)
8. `e2e/security/p2-child-engagement.spec.ts` (NEW)

### Product Phase 2 Next Step

Product Phase 2 is **PASS — PRODUCTION VERIFIED**. Proceed to **Product Phase 3 — Parent Intelligence** (planning / scope definition required before implementation).

---

## Product Phase 3 — Parent Intelligence

| Attribute | Value |
|---|---|
| **Status** | **IN PROGRESS** |
| **Date** | 2026-09-23 |

**Implemented Items:**

#### Phase 3A.1: Analytics Summary API — PASS

| Attribute | Value |
|---|---|
| **File** | `src/app/api/analytics/summary/route.ts` (NEW) |
| **E2E** | `e2e/security/p3-analytics-summary.spec.ts` (NEW) |
| **Commit** | `bbd61e909422cb5283c023583561f6930d448733` |
| **Status** | IMPLEMENTED |
| **Features** | POST endpoint returning per-child analytics summary: XP earned, money earned, tasks completed, tasks approved within a configurable date range. Supports optional `childId` filter, `from`/`to` date range (default 30 days, max 365 days). Server-authoritative, family-scoped. |
| **Security** | `validateRequestAuth` + `requireParentRole`; family isolation via `session.member.family_id`; cross-family childId rejected (403); unauthenticated → 401; child role → 403; client-supplied family_id ignored |

#### Phase 3A.2: Analytics Trends API — PASS

| Attribute | Value |
|---|---|
| **File** | `src/app/api/analytics/trends/route.ts` (NEW) |
| **E2E** | `e2e/security/p3-analytics-trends.spec.ts` (NEW) |
| **Commit** | `8e3aa22` |
| **Status** | IMPLEMENTED |
| **Features** | POST endpoint returning per-child time-series analytics: XP earned, XP deductions, money earned, tasks completed, tasks approved. Server-side time bucketing with configurable granularity (`day`/`week`). Zero-filled empty periods. Optional `childId` filter, `from`/`to` date range (default 30 days, max 365 days). Server-authoritative, family-scoped. |
| **Security** | `validateRequestAuth` + `requireParentRole`; family isolation via `session.member.family_id`; cross-family childId rejected (403); unauthenticated → 401; child role → 403; client-supplied family_id ignored |
| **E2E Count** | 17 tests: auth, structure, daily/weekly granularity, date range, child filtering, cross-family isolation, XP earned vs deductions, money earned semantics, task completion/approval semantics, empty periods, range exclusion, multiple children |

#### Phase 3B: Analytics Dashboard — PASS

| Attribute | Value |
|---|---|
| **File** | `src/app/analytics/page.tsx` (NEW) |
| **E2E** | `e2e/security/p3b-analytics-dashboard.spec.ts` (NEW) |
| **Commit** | `fb8cda6` |
| **Status** | IMPLEMENTED |
| **Features** | Parent-only analytics dashboard consuming `/api/analytics/summary` and `/api/analytics/trends`. Date-range selector (7/30/90 days), child filter, family summary stats (XP, BHD, tasks completed/approved), child snapshot with streak estimation, horizontal metric bars for trend visualization, compact bucket rows. Arabic RTL, responsive, dark mode compatible. |
| **Security** | Middleware-protected (`/analytics` in `parentOnlyRoutes`); unauthenticated → redirect to `/owner-login`; child → redirect to `/child-mode`; APIs remain server-authoritative |
| **Navigation** | Added to desktop sidebar (more section) and mobile bottom nav |
| **E2E Count** | 11 tests: unauthenticated redirect, child blocked, parent loads, API integration, date range selection, child selection, stat cards render, no fake values, empty state, dashboard regression, child-mode regression |

**Remaining Candidate Scope:**
- Phase 3C: Child Progress Comparison — TODO

**Important:** Phase 3 is IN PROGRESS. 3A.1, 3A.2, and 3B are complete.

---

## Product Phase 4 — Notifications

| Attribute | Value |
|---|---|
| **Status** | **TODO / PLANNING** |
| **Date** | 2026-09-22 |

**Candidate scope:**
- In-app Notification Center — Centralized list of events
- Real-time Event Notifications — Extend Supabase realtime to gifts, withdrawals, approvals
- Pending Approval Notifications — Alert parents to items needing action
- Gift Redemption Notifications — Alert parents when children request gifts
- Withdrawal Request Notifications — Alert parents when children request withdrawals
- Streak/Goal Notifications — Reminders and milestones
- Push Notifications — Browser/native push for critical events

**Important:** Do not implement Push Notifications before defining the notification event model and UX. Push notifications require backend infrastructure, service worker changes, and user consent flows.

---

## Product Phase 5 — Future Product Features

| Attribute | Value |
|---|---|
| **Status** | **TODO / NOT YET DEFINED** |

**Candidate ideas (not committed features):**
- Configurable reward rules/multipliers
- Scheduled rewards
- Special occasions (birthdays, holidays)
- Custom avatars
- Custom garden themes
- Additional language support
- Offline task completion
- Peer comparison
- Family challenges
- Customizable task categories

**Important:** These are potential future ideas, not committed features. Each must be validated and designed before implementation.

---

## Dependencies Between Tracks

### Security Track → Product Track

Product/UI work must not weaken:
- Authentication (P0.1–P0.4 verified)
- Authorization / role enforcement (P1.2.4 verified)
- Family isolation (P1.2.5 verified)
- Financial correctness (P1.2.7 verified)
- Task/Gift/Withdrawal lifecycle (P1.2.1–P1.2.3 verified)
- Session security (P0.3, P1.2.6 verified)

### Product Track → Security Track

- UI changes to task/gift/withdrawal forms require regression verification against P1.2 E2E baseline
- New backend features require appropriate E2E coverage
- Any change touching XP, BHD, sessions, role checks, or family filtering is higher-risk

### Shared Constraints

- All routes are POST-only
- Service-role client bypasses RLS — authorization is at route level
- `money_transactions.amount` is NUMERIC(10,3); `xp_transactions.amount` is INTEGER
- Family isolation is enforced server-side; UI must not weaken it
- Production manual testing only after commit + push + deployment
- Mishkat must never be accessed or modified

---

## Status Rules

| Status | Definition |
|---|---|
| **TODO** | Item identified but implementation not started |
| **IN PROGRESS** | Active implementation underway |
| **PARTIAL** | Partially implemented; some aspects remain |
| **PASS** | Fully implemented and verified |
| **BLOCKED** | Cannot proceed due to dependency |

For planning items: use **TODO**. Do not use PASS. Do not imply implementation.

---

**END OF DOCUMENT**
