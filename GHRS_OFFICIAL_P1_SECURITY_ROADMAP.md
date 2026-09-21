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

**END OF DOCUMENT**
