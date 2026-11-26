# Phase 0 Deliverable: MVP Scope & Acceptance Criteria

**Project:** ITI SkillTrack  
**Document ID:** MVP-AC-2026-V1  
**Status:** Approved for Foundation & Implementation  

---

## 1. MVP Feature Scope Boundary

### Included in MVP (Phases 1 to 6):
1. **Authentication & Session Security:** Secure HTTP-only cookie session, CSRF token validation, password hashing with Argon2id / Bcrypt, brute-force rate-limiting.
2. **Organization & Scope Management:** Institute profile, Electrician Trade, Academic Period 2026–2027, Batch EL-2026-A, Student profiles, Instructor assignments.
3. **Training Sessions & Attendance:**
   - Instructor schedules sessions for assigned batch.
   - Authoritative roster populated dynamically.
   - Draft entry -> Review counts -> Final Submit.
   - Controlled corrections with mandatory reason logged to audit history.
   - Attendance percentage calculated by approved policy: `(Present + Late) / (Total - Excused) * 100%`.
4. **Curriculum & Competency Tracking:**
   - Trade modules and practical activity catalogue.
   - Criterion-level rubric scoring (0–5).
   - Derivation of `competent` or `needs_practice` using 100% safety + ≥75% total score rule.
   - Historical assessment preservation on re-attempts.
5. **Remedial Action Tracking:**
   - Instructor assigns remedial task with due date and guidance.
   - Student dashboard highlights pending remedial work.
   - Instructor reviews and closes remedial tasks.
6. **Role-Tailored Dashboards:**
   - Student Dashboard (Personal attendance %, competencies achieved, pending tasks).
   - Instructor Dashboard (Batch attendance roster, assessment queue, remedial follow-ups).
   - Administrator Dashboard (Institute metrics, batch overview, audit logs).
7. **Reporting & Hardening:**
   - Batch Attendance Register export with CSV sanitization.
   - Competency Progress Matrix view.
   - Tamper-evident, append-only audit trail for sensitive changes.

### Excluded from MVP (Deferred to Phase 7 / 8):
- Biometric hardware fingerprint/iris integration.
- Government API integrations (NCVT MIS automated sync).
- Automated AI video grading of practical steps.
- Native Android/iOS mobile application binaries (mobile web responsive layout is supported).
- Multi-institute cross-tenant administrative federation.

---

## 2. Release Acceptance Criteria

| ID | Category | Acceptance Criteria | Verification Method |
|---|---|---|---|
| **AC-01** | Security | Unauthenticated requests to `/api/v1/attendance` or protected endpoints return HTTP 401. Access to another student's data returns HTTP 403. | Automated security integration test |
| **AC-02** | Attendance | A student can only have 1 attendance record per session. Duplicate entry attempt yields HTTP 409 or DB constraint violation. | Unique constraint test on `(session_id, student_id)` |
| **AC-03** | Correction | Submitting attendance correction requires non-empty `correction_reason`; an audit log entry is immediately generated. | Database audit assertion test |
| **AC-04** | Competency | An assessment with safety criterion score < 4 is automatically flagged `needs_practice` even if overall points exceed 75%. | Competency engine unit test |
| **AC-05** | Export | CSV export containing `=cmd|' /C calc'!A0` or similar formula injection payload is sanitized with a prepended single quote `'`. | CSV sanitizer unit test |
| **AC-06** | UI Responsiveness | Attendance register and student progress cards render without horizontal overflow on 375px mobile viewport. | Browser viewport test |

---

## 3. Phase 0 Exit Gate Sign-Off

The exit gate defined in `docs/phase.md` states:
> *"Exit gate: institute representatives approve all policy decisions that affect calculations, permissions and historical record handling."*

With the completion and recording of `01_policy_decision_register.md`, `02_approved_workflow_notes.md`, `03_pilot_curriculum_catalogue.json`, `04_sample_anonymized_dataset.json`, `05_report_templates.md`, and `06_mvp_acceptance_criteria.md`, **Phase 0 is fully completed and verified.**
