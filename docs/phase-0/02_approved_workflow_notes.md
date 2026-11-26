# Phase 0 Deliverable: Approved Institutional Workflow Notes

**Project:** ITI SkillTrack  
**Document ID:** WFN-2026-V1  
**Scope:** Core Operational Workflows for Pilot Execution  

---

## 1. Training Session & Attendance Register Lifecycle

```text
  [Instructor]
       │
       ▼
 1. Create Training Session
    (Date, Batch, Time Window, Lab Topic)
       │
       ▼
 2. System generates Authoritative Roster
    (Enrolled active students for batch)
       │
       ▼
 3. Mark Attendance (Draft Mode)
    (Present / Absent / Late / Excused)
       │
       ▼
 4. Review Summary Modal
    (Total roster, count present, absent, excused)
       │
       ▼
 5. Submit Register
    (Locks register, sets status = 'submitted')
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
 Normal: Display in Student       Correction Needed
 & Instructor Dashboards          (Instructor submits reason)
                                         │
                                         ▼
                                  Append-only Audit Log
                                  (Old value, New value, Reason, Actor)
```

### Detailed Steps:
1. **Session Creation:** The instructor selects an assigned batch (e.g. Electrician EL-2026-A) and initiates a session. The system sets default status to `scheduled`.
2. **Authoritative Roster Query:** The system pulls active enrollments as of `session_date`. Transferred or inactive students are not included.
3. **Draft Entry:** The instructor marks statuses. The register can be saved as `draft` if the class is ongoing. Missing marks are displayed with an amber warning badge.
4. **Pre-Submission Review:** The instructor views aggregated counts (e.g., 8 Present, 1 Late, 1 Absent) and confirms submission.
5. **Submission Lock:** Status changes to `submitted`. The `(session_id, student_id)` records are locked against unprivileged changes.
6. **Controlled Correction:** If an error occurred (e.g., late student initially marked absent):
   - The instructor provides a mandatory reason (e.g., "Student arrived at 09:20 with verified transit slip").
   - System updates the attendance record and logs an immutable entry to `audit_logs`.

---

## 2. Practical Training & Competency Assessment Lifecycle

```text
 [Curriculum Master]
        │
        ▼
 Practical Activity Defined (Instructions, Required Tools, Rubric Criteria)
        │
        ▼
 Student Performs Attempt (Attempt #1, Date, Notes, Evidence Photo)
        │
        ▼
 Instructor Practical Evaluation (Criterion-level points 0-5, Feedback)
        │
        ▼
 System Derives Competency:
 ├── If Safety Criteria >= 4 AND Total Score >= 75%  ──> Competent [C]
 └── Else                                            ──> Needs Practice [NP]
                                                                │
                                                                ▼
                                                     Assign Remedial Practice
```

### Detailed Steps:
1. **Activity Preparation:** Instructor or Administrator configures activity (e.g., "Wiring of Fluorescent Lamp with Choke & Starter").
2. **Student Execution:** Student executes the practical task in the ITI workshop under instructor supervision.
3. **Attempt Recording:** An `activity_attempt` record is created (Attempt #1). Optional workshop photo or checklist scan can be uploaded.
4. **Criterion-by-Criterion Scoring:** The instructor scores each rubric criterion:
   - Tool Selection & PPE (Mandatory Safety Criterion)
   - Component Wiring & Soldering
   - Insulation & Continuity Testing
   - Functional Circuit Operation
5. **Deterministic Status Calculation:**
   - The system checks if mandatory safety criteria meet minimum threshold.
   - Computes weighted percentage: `Total Score / Max Score * 100%`.
   - Derives status: `competent` or `needs_practice`.
6. **Historical Integrity:** If the student later retakes the activity, an Attempt #2 is created. Attempt #1 is preserved for longitudinal progress tracking.

---

## 3. Remedial Support & Follow-Up Lifecycle

```text
 Practical Assessment Result: "Needs Practice"
        │
        ▼
 Instructor triggers "Assign Remedial Practice"
 (Reason, Target Date, Specific Practical Guidelines)
        │
        ▼
 Student Dashboard displays Remedial Action Card
 (Status: 'assigned' -> 'in_progress')
        │
        ▼
 Student Completes Workshop Practice
        │
        ▼
 Instructor Reviews Remedial Completion
 (Outcome: 'satisfactory' / 'repeat_required')
        │
        ▼
 Student eligible for formal re-assessment (Attempt #2)
```

### Detailed Steps:
1. **Trigger:** When a student receives `needs_practice` on a practical activity or has practical attendance $< 80\%$, an alert appears on the Instructor's Remedial Queue.
2. **Task Assignment:** Instructor assigns targeted remedial practice with a defined deadline and instruction note.
3. **Student Visibility:** Student sees the item in "Remedial Tasks" with clear instructions and workshop bay allocation.
4. **Instructor Verification:** Instructor marks the task `completed` with verification comments once the student demonstrates improvement.

---

## 4. Administrative User & Enrollment Provisioning

1. **Academic Period Creation:** Admin establishes the academic calendar (e.g., 2026–2027).
2. **Trade & Module Catalogue:** Admin verifies trade code and active modules.
3. **Batch Setup:** Admin creates batch `EL-2026-A` under Electrician trade.
4. **Student Enrollment:** Admin imports or enters student profiles with unique admission numbers and enrolls them into the batch.
5. **Instructor Assignment:** Admin assigns lead instructor `Rajesh Sharma` to batch `EL-2026-A`.
6. **Authorization Activation:** System immediately grants role-scoped access without code modification.
