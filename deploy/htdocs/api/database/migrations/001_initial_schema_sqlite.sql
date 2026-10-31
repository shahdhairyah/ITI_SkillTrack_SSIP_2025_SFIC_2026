-- ITI SkillTrack: Initial Database Baseline Schema for SQLite (Local Dev / Fallback)
-- Mirrors 001_initial_schema.sql exactly

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS institutes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institute_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institute_id INTEGER NOT NULL,
    department_id INTEGER NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    nsqf_level INTEGER NOT NULL DEFAULT 4,
    duration_years INTEGER NOT NULL DEFAULT 2,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institute_id, code),
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS academic_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institute_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id INTEGER NOT NULL,
    academic_period_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    section TEXT NOT NULL DEFAULT 'A',
    shift TEXT NOT NULL DEFAULT 'Morning',
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE RESTRICT,
    FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institute_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institute_id, email),
    UNIQUE (institute_id, username),
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    scope_type TEXT NOT NULL DEFAULT 'institute',
    scope_id INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    institute_id INTEGER NOT NULL,
    admission_no TEXT NOT NULL,
    name TEXT NOT NULL,
    gender TEXT NOT NULL DEFAULT 'other',
    category TEXT NOT NULL DEFAULT 'General',
    phone TEXT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institute_id, admission_no),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS instructors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    institute_id INTEGER NOT NULL,
    employee_code TEXT NOT NULL,
    name TEXT NOT NULL,
    qualification TEXT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institute_id, employee_code),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    batch_id INTEGER NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, batch_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS instructor_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instructor_id INTEGER NOT NULL,
    batch_id INTEGER NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (instructor_id, batch_id),
    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE RESTRICT,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    sequence_no INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS practical_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    instructions TEXT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS competency_criteria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    is_safety_critical INTEGER NOT NULL DEFAULT 0,
    weight REAL NOT NULL DEFAULT 25.0,
    max_points INTEGER NOT NULL DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES practical_activities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS training_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    instructor_id INTEGER NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    topic TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT,
    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    marked_by INTEGER NOT NULL,
    marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME NULL,
    correction_reason TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (session_id, student_id),
    FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS activity_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    activity_id INTEGER NOT NULL,
    attempt_no INTEGER NOT NULL DEFAULT 1,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'in_progress',
    notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, activity_id, attempt_no),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES practical_activities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL UNIQUE,
    assessor_id INTEGER NOT NULL,
    assessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    outcome TEXT NOT NULL,
    overall_percentage REAL NOT NULL DEFAULT 0.0,
    feedback TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES activity_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (assessor_id) REFERENCES instructors(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS assessment_criterion_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id INTEGER NOT NULL,
    criterion_id INTEGER NOT NULL,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    meets_safety INTEGER NOT NULL DEFAULT 1,
    notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (assessment_id, criterion_id),
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (criterion_id) REFERENCES competency_criteria(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS remedial_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    activity_id INTEGER NOT NULL,
    assigned_by INTEGER NOT NULL,
    reason TEXT NOT NULL,
    instructions TEXT NOT NULL,
    due_on DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'assigned',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    FOREIGN KEY (activity_id) REFERENCES practical_activities(id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS remedial_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remedial_assignment_id INTEGER NOT NULL,
    reviewed_by INTEGER NOT NULL,
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    outcome TEXT NOT NULL,
    notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (remedial_assignment_id) REFERENCES remedial_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_user_id INTEGER NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    request_id TEXT NOT NULL,
    before_json TEXT NULL,
    after_json TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institute_id INTEGER NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institute_id, setting_key),
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
);

PRAGMA foreign_keys = ON;
