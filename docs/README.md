# ITI SkillTrack

**Digital Skill Training, Attendance and Competency Tracking System for ITI Students**  
**Project documentation pack | Technology: React + PHP + MySQL**

## 1. Project overview

ITI SkillTrack is a role-based web application for recording and monitoring the training journey of students in an Industrial Training Institute (ITI). It brings attendance, trade-wise practical activities, competency assessments, remedial support, student progress visibility and institutional reporting into one structured platform.

The system is designed for three primary user groups:

- **Students** — view their own attendance, practical work, competency progress, assessment outcomes and pending actions.
- **Instructors/trainers** — manage assigned batches and trade activities, record attendance, assess practical work and assign follow-up practice.
- **Institute administrators** — configure the institute, academic periods, trades, batches, users and access; monitor consolidated performance; export reports.

Authorized monitoring officers may receive a read-only, institute- or department-scoped view when the institute enables that role.

## 2. Problem being addressed

Training information is often spread across paper registers, spreadsheets and separate records. This can create repeated data entry, inconsistent records, slow consolidation, limited student visibility and delayed identification of learners who need additional practice. SkillTrack creates a consistent digital record linked to the student, batch, trade, training session, practical activity and assessment.

## 3. Product objectives

1. Maintain accurate, traceable attendance records.
2. Track practical activities and competency by trade, batch and student.
3. Give students timely visibility into their own progress and pending requirements.
4. Give instructors useful operational dashboards and follow-up lists.
5. Give administrators consolidated dashboards and downloadable reports.
6. Reduce avoidable manual consolidation while preserving review and correction controls.
7. Protect student information through authentication, role-based authorization and audit trails.

## 4. Technology baseline

| Layer | Selected technology | Responsibility |
|---|---|---|
| Frontend | React (Vite recommended) | Responsive user interface, forms, tables, dashboards and charts |
| Backend | PHP with a REST-style JSON API | Authentication, authorization, validation, business rules and reporting |
| Database | MySQL with InnoDB | Persistent relational records, constraints, transactions and indexes |
| API format | JSON over HTTPS | Frontend/backend communication |
| Database access | PDO with prepared statements | Safe parameterized database access |
| Source control | Git | Version history, review and release management |

Use a supported PHP release available on the target hosting environment and a supported MySQL 8.x-compatible release. Confirm exact versions and extensions before deployment. The documents do not require a particular hosting vendor.

## 5. Suggested repository structure

```text
iti-skilltrack/
├── frontend/                     # React application
│   ├── public/
│   └── src/
│       ├── app/                   # Router, providers, route guards
│       ├── assets/
│       ├── components/            # Reusable UI components
│       ├── features/              # auth, students, attendance, skills, reports
│       ├── hooks/
│       ├── layouts/
│       ├── lib/                   # API client, formatters, validators
│       ├── pages/
│       ├── styles/
│       └── main.jsx
├── backend/                       # PHP API
│   ├── public/                    # Web server document root / index.php
│   ├── routes/
│   ├── src/
│   │   ├── Controllers/
│   │   ├── Middleware/
│   │   ├── Services/
│   │   ├── Repositories/
│   │   ├── Validators/
│   │   └── Support/
│   ├── config/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeds/
│   ├── storage/                   # Private uploads and logs; never web-public
│   ├── tests/
│   ├── composer.json
│   └── .env.example
├── docs/                          # Optional copy of project documentation
├── .gitignore
└── README.md
```

This is a recommended structure, not a claim that these folders already exist. Keep private configuration and uploaded evidence outside the publicly served directory.

## 6. Getting started (development)

The following is an implementation checklist. Adapt paths to the actual repository when it is created.

### Prerequisites

- Git
- Node.js and npm supported by the selected Vite release
- PHP supported by the selected backend dependencies
- Composer, if Composer packages are used
- MySQL server and a database client

### Database

1. Create a development database, for example `iti_skilltrack`.
2. Configure database credentials in the backend environment file.
3. Run versioned migrations in order.
4. Run development seed data only in a non-production environment.
5. Verify foreign keys, unique constraints and indexes before creating the first admin account.

### Backend

1. Open the `backend/` directory.
2. Install dependencies with `composer install` when a `composer.json` is present.
3. Copy `.env.example` to `.env` and enter local values. Never commit `.env`.
4. Configure the PHP web server so `backend/public/` is the document root and all API requests route through `index.php`.
5. Enable required PHP extensions, including PDO MySQL and a secure password-hashing implementation available in the PHP runtime.
6. Start the local PHP server or configured Apache/Nginx virtual host. Use HTTPS in shared or production environments.

### Frontend

1. Open the `frontend/` directory.
2. Install dependencies with `npm install`.
3. Set the API base URL in a frontend environment variable such as `VITE_API_BASE_URL`.
4. Start the Vite development server with `npm run dev`.
5. Build a production bundle with `npm run build` and serve the generated output through the chosen hosting setup.

### Environment variable example

Backend `.env.example` should document names similar to these; actual values must be supplied locally:

```dotenv
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
FRONTEND_ORIGIN=http://localhost:5173
APP_TIMEZONE=Asia/Kolkata

DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=iti_skilltrack
DB_USERNAME=your_local_user
DB_PASSWORD=change_me

SESSION_NAME=iti_skilltrack_session
SESSION_SECURE_COOKIE=false
SESSION_SAMESITE=Lax
UPLOAD_MAX_BYTES=10485760
```

For production, set debug off, use HTTPS, secure cookies, strong secrets and least-privilege database credentials. Do not put database credentials in React/Vite variables; frontend environment variables are visible to browser users.

## 7. Recommended first release (MVP)

The first usable release should include:

- Secure login, logout and role-based route/API protection.
- Institute setup, trade setup, academic period, batch and user management.
- Student profiles and batch enrollment.
- Training session and attendance entry with duplicate prevention and controlled corrections.
- Practical activity catalogue and student activity attempts.
- Configurable competency rubric and instructor assessment.
- Student progress dashboard.
- Instructor dashboard and follow-up list.
- Administrator dashboard and basic CSV/PDF-ready report views.
- Audit log for sensitive record changes.

Advanced forecasting, biometric attendance, native mobile apps, government-system integrations and automated AI grading are not MVP requirements.

## 8. Documentation map

| File | Purpose |
|---|---|
| `prd.md` | Product requirements, users, scope, user stories and acceptance criteria |
| `architectre.md` | Application architecture, data model, API conventions and deployment design |
| `desgin.md` | UX structure, screen specifications, interaction patterns and visual system |
| `rules.md` | Business rules, authorization, security and development conventions |
| `phase.md` | Delivery phases, dependencies and phase exit gates |
| `tasks.md` | Actionable implementation backlog with task IDs |
| `memory.md` | Persistent project context and implementation decisions for the development team/AI coding agent |

## 9. Source-of-truth order

When documents appear to conflict, use this order:

1. The approved problem statement and institute-approved policies.
2. `prd.md` for product scope and requirements.
3. `rules.md` for business and security invariants.
4. `architectre.md` for technical implementation decisions.
5. `desgin.md` for user experience and visual behavior.
6. `phase.md` and `tasks.md` for delivery sequencing.
7. `memory.md` as a concise record of current decisions; update it when approved decisions change.

Any change to attendance policy, competency scale, data retention, role permissions or reporting definitions must be recorded and approved before it is implemented.

## 10. Important implementation note

This pack is a proposed implementation baseline. It is not an official ITI/DGT/NCVT policy document. Confirm the institute's applicable attendance rules, trade curriculum, competency framework, assessment terminology, grading/pass criteria, retention policy and reporting formats with authorized stakeholders before production use.
