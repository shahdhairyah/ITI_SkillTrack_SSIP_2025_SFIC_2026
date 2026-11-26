import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  Layers,
  Presentation,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { roleHome } from '../../lib/format';

const STATS_DATA = [
  { value: '100%', title: 'Session-Wise Rosters', desc: 'Authoritative enrollment verification per date' },
  { value: '≥ 80%', title: 'Statutory Exam Gate', desc: 'Direct eligibility check before final practical exams' },
  { value: 'DEC-05', title: 'Competency Rubrics', desc: 'Mandatory safety benchmarks (≥4/5) and 75% aggregate' },
  { value: '48h', title: 'Audit-Controlled Edits', desc: 'Submitted records require reason & log to audit table' },
];

const MODULE_WORKFLOW = [
  {
    step: '1',
    title: 'Trades & Batch Rosters',
    desc: 'Institute sets up Electrician trade, academic period, section shifts, and enrolls trainees with admission numbers.',
    icon: BookOpen,
  },
  {
    step: '2',
    title: 'Training Sessions & Labs',
    desc: 'Instructors schedule workshop sessions, take digital attendance draft, and review counts before locking register.',
    icon: CalendarCheck2,
  },
  {
    step: '3',
    title: 'Hands-on Rubric Assessment',
    desc: 'Trainees perform practical exercises evaluated across 0-5 criteria with strict zero-tolerance for safety misses.',
    icon: Award,
  },
  {
    step: '4',
    title: 'Remedial Support & Portfolio',
    desc: 'Automated remedial follow-up for trainees needing extra practice, with instructor outcome verification.',
    icon: UserCheck,
  },
];

const ROLE_TABS = {
  student: {
    label: 'Student Trainee',
    headline: 'Follow your training journey with full transparency',
    sub: 'Trainees can verify attendance marks, view instructor assessment comments, and practice remedial tasks.',
    icon: GraduationCap,
    points: [
      'Live practical attendance percentage with exam eligibility warning',
      'Detailed criterion scores and safety feedback for every practical attempt',
      'Clear remedial practice guidelines and deadlines assigned by trainer',
      'Verified digital competency record ready for apprenticeship applications',
    ],
    demoAccount: 'amit.kumar@student.iti.org',
    demoRole: 'Amit Kumar · Roll ADM-2026-001 (Electrician EL-2026-A)',
    linkText: 'Open Student Portal',
  },
  instructor: {
    label: 'Vocational Trainer',
    headline: 'Manage workshops and evaluate practical skills efficiently',
    sub: 'Vocational instructors manage session rosters, enter draft marks, submit registers, and assess rubrics.',
    icon: Users,
    points: [
      'Auto-populated rosters dynamically generated as of session date',
      'Draft saving with missing-mark verification before official lock',
      'Batch competency matrix showing practical progress across all students',
      'One-click remedial assignment for safety gaps with resolution review',
    ],
    demoAccount: 'rajesh.sharma@itiskilltrack.org',
    demoRole: 'Rajesh Sharma · Lead Instructor (Electrical Engg + CITS)',
    linkText: 'Open Instructor Hub',
  },
  admin: {
    label: 'Institute Administrator',
    headline: 'Oversee institutional compliance and academic master data',
    sub: 'Administrators configure trades, batches, roles, and export sanitized reports for directorate audits.',
    icon: ShieldCheck,
    points: [
      'Manage trades, departments, academic periods, batches, and users',
      'Server-scoped access preventing cross-batch and cross-institute leaks',
      'Immutable audit trail recording every attendance correction with reasons',
      'Standardized CSV exports with formula injection protection',
    ],
    demoAccount: 'admin@itiskilltrack.org',
    demoRole: 'Administrator · Model Industrial Training Institute',
    linkText: 'Open Admin Console',
  },
};

export default function HomePage() {
  const { user } = useAuth();
  const dashboardPath = user ? roleHome(user.role) : '/login';
  const primaryLabel = user ? 'Open My Workspace' : 'Sign In to Workspace';

  const [activeTabKey, setActiveTabKey] = useState('student');
  const activeRole = ROLE_TABS[activeTabKey];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        color: '#0f172a',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* 1. CLEAN NAVIGATION BAR */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '14px 28px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '7px',
                background: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.95rem',
              }}
            >
              ST
            </div>
            <div>
              <strong style={{ fontSize: '1.05rem', color: '#0f172a', display: 'block', lineHeight: 1.15 }}>
                ITI SkillTrack
              </strong>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                Vocational Training & Attendance
              </span>
            </div>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <a href="#overview" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', textDecoration: 'none' }}>
              Overview
            </a>
            <a href="#rubrics" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', textDecoration: 'none' }}>
              Rubric Policy
            </a>
            <a href="#roles" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', textDecoration: 'none' }}>
              Role Workspaces
            </a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user ? (
              <Link to={dashboardPath} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Open Dashboard <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#334155',
                    textDecoration: 'none',
                    padding: '8px 12px',
                  }}
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  Open Pilot <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* 2. HERO: Institutional, Clean, High Contrast (No floating futuristic glow or fake sci-fi elements) */}
        <section
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '64px 28px 72px',
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
              gap: '48px',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #dbeafe',
                  marginBottom: '16px',
                }}
              >
                <span>National Skills Qualification Framework (NSQF Level 4/5)</span>
              </div>

              <h1
                style={{
                  fontSize: 'clamp(2.1rem, 3.8vw, 3.1rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.18,
                  color: '#0f172a',
                  margin: '0 0 16px 0',
                }}
              >
                Digital Attendance & Practical Competency Tracking for ITIs
              </h1>

              <p
                style={{
                  fontSize: '1rem',
                  color: '#475569',
                  lineHeight: 1.65,
                  maxWidth: '540px',
                  margin: '0 0 28px 0',
                }}
              >
                Replace fragmented paper registers and spreadsheets with an institutional record system designed for industrial training institutes. Built to enforce attendance thresholds, safety-critical rubrics, and remedial follow-ups.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
                <Link
                  to={dashboardPath}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    padding: '12px 22px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {primaryLabel} <ArrowRight size={16} />
                </Link>
                <a
                  href="#rubrics"
                  style={{
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '12px 20px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  View Competency Policy
                </a>
              </div>

              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748b' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="#2563eb" /> Server-Enforced RBAC
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} color="#059669" /> Zero Docker Dependencies
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarCheck2 size={16} color="#2563eb" /> 80% Practical Gate
                </span>
              </div>
            </div>

            {/* Practical Register Preview Card (Clean Product UI, no fake 3D tilts) */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 8px 30px -8px rgba(15, 23, 42, 0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 18px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.82rem', color: '#0f172a', display: 'block' }}>
                    Electrician Trade · Batch EL-2026-A
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Instructor: Rajesh Sharma · Morning Shift
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: '#ecfdf5',
                    color: '#065f46',
                  }}
                >
                  Active Register
                </span>
              </div>

              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>ATTENDANCE</span>
                    <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>92.5%</strong>
                    <span style={{ fontSize: '0.68rem', color: '#059669', display: 'block' }}>Eligible (≥80%)</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>PRACTICALS</span>
                    <strong style={{ fontSize: '1.1rem', color: '#059669' }}>4 / 5</strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Competent</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>SAFETY CHECK</span>
                    <strong style={{ fontSize: '1.1rem', color: '#2563eb' }}>100%</strong>
                    <span style={{ fontSize: '0.68rem', color: '#2563eb', display: 'block' }}>PPE Adherence</span>
                  </div>
                </div>

                <div style={{ padding: '10px 12px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>ACT-ELE-101: Hand Tools & PPE Safety</strong>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669' }}>COMPETENT (90%)</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                    PPE Adherence: 5/5 · Tool Rating: 4/5 · Passed Safety Benchmark
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <div>
                      <strong style={{ fontSize: '0.78rem', display: 'block' }}>Amit Kumar</strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>ADM-2026-001</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669' }}>COMPETENT · 90%</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <div>
                      <strong style={{ fontSize: '0.78rem', display: 'block' }}>Rahul Singh</strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>ADM-2026-003</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309' }}>REMEDIAL ASSIGNED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. POLICY DATA RIBBON */}
        <section style={{ background: '#0f172a', color: '#ffffff', padding: '32px 28px' }}>
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '24px',
              textAlign: 'center',
            }}
          >
            {STATS_DATA.map((item, idx) => (
              <div key={idx} style={{ padding: '6px 10px' }}>
                <strong style={{ fontSize: '2rem', fontWeight: 800, color: '#60a5fa', display: 'block', letterSpacing: '-0.02em' }}>
                  {item.value}
                </strong>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', display: 'block', marginTop: '4px' }}>
                  {item.title}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                  {item.desc}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 4. WORKFLOW: Human & Practical 4-Step Breakdown */}
        <section id="overview" style={{ padding: '72px 28px', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 48px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Operational Workflow
              </span>
              <h2 style={{ fontSize: '1.95rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '8px 0 12px', color: '#0f172a' }}>
                How ITI Training Is Structured
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.94rem', lineHeight: 1.6, margin: 0 }}>
                A step-by-step model designed around standard government ITI curriculum delivery.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              {MODULE_WORKFLOW.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    style={{
                      padding: '24px 20px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '6px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#cbd5e1' }}>0{item.step}</span>
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>{item.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.55, margin: 0 }}>{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. DEC-05 RUBRIC SPOTLIGHT: Clear Criteria & Safety Gates */}
        <section id="rubrics" style={{ padding: '72px 28px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr)',
              gap: '48px',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Competency Assessment Policy
              </span>
              <h2 style={{ fontSize: '1.95rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '8px 0 16px', color: '#0f172a' }}>
                DEC-05 Objective Practical Rubrics
              </h2>
              <p style={{ color: '#475569', fontSize: '0.94rem', lineHeight: 1.6, marginBottom: '20px' }}>
                Subjective pass marks are prohibited. ITI SkillTrack applies institutional completion logic directly in the assessment engine:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', padding: '12px 16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <ShieldAlert size={18} color="#dc2626" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>1. Mandatory Safety Benchmark (≥ 4/5)</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                      Failing any safety criterion (e.g. PPE inspection, Lockout/Tagout, de-energization) prohibits a Competent rating.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', padding: '12px 16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <Award size={18} color="#2563eb" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>2. 75% Overall Benchmark</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                      The weighted aggregate across all criteria must achieve ≥ 75% of maximum points to earn Competent (C) status.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', padding: '12px 16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <UserCheck size={18} color="#b45309" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>3. Remedial Assignment Trigger</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                      Trainees receiving Needs Practice (NP) have remedial tasks recorded with clear instructions and deadlines.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Practical Rubric Example Table */}
            <div
              style={{
                background: '#ffffff',
                padding: '24px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 4px 20px -6px rgba(15, 23, 42, 0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Practical Activity Rubric
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8' }}>
                  ACT-ELE-101
                </span>
              </div>

              <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 700 }}>Identification & Handling of Hand Tools & PPE</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
                Module 1: Safety & Tools · Evaluator: Rajesh Sharma
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>CRIT-101-1: PPE Inspection & Adherence</span>
                    <span style={{ display: 'block', fontSize: '0.68rem', color: '#dc2626', fontWeight: 700 }}>MANDATORY SAFETY (≥4)</span>
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: '#059669' }}>5 / 5 pts</strong>
                </div>

                <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>CRIT-101-2: Tool Selection & 1000V Rating</span>
                    <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b' }}>Standard Technical Standard</span>
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>4 / 5 pts</strong>
                </div>

                <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>CRIT-101-3: Wire Stripping Technique</span>
                    <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b' }}>Precision & Core Integrity</span>
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>4 / 5 pts</strong>
                </div>

                <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>CRIT-101-4: Workshop Housekeeping & Return</span>
                    <span style={{ display: 'block', fontSize: '0.68rem', color: '#dc2626', fontWeight: 700 }}>MANDATORY SAFETY (≥4)</span>
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: '#059669' }}>5 / 5 pts</strong>
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#065f46', fontWeight: 700 }}>AGGREGATE RESULT</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#065f46' }}>18 / 20 (90%)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', background: '#059669', color: '#ffffff' }}>
                    COMPETENT (C)
                  </span>
                  <span style={{ display: 'block', fontSize: '0.66rem', color: '#065f46', marginTop: '2px' }}>Safety Criteria Passed</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. ROLE WORKSPACES: Tabs & Real User Perspectives */}
        <section id="roles" style={{ padding: '72px 28px', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 36px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Role Workspaces
              </span>
              <h2 style={{ fontSize: '1.95rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '8px 0 10px', color: '#0f172a' }}>
                Tailored for Trainees, Trainers & Admins
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>
                Select a role to preview its workflow and pre-configured test credentials.
              </p>

              <div
                style={{
                  display: 'inline-flex',
                  padding: '3px',
                  background: '#f1f5f9',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  marginTop: '18px',
                }}
              >
                {Object.keys(ROLE_TABS).map((key) => {
                  const isActive = activeTabKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTabKey(key)}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '6px',
                        border: 'none',
                        background: isActive ? '#2563eb' : 'transparent',
                        color: isActive ? '#ffffff' : '#64748b',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {ROLE_TABS[key].label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role Card */}
            <div
              style={{
                padding: '32px',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.75fr)',
                gap: '36px',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.45rem', fontWeight: 800 }}>{activeRole.headline}</h3>
                <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '20px' }}>{activeRole.sub}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activeRole.points.map((pt, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem' }}>
                      <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                      <span style={{ color: '#334155' }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Demo Account Box */}
              <div
                style={{
                  padding: '22px',
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                }}
              >
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>
                  Pre-Seeded Pilot Account
                </span>
                <div style={{ margin: '10px 0 2px', fontWeight: 700, fontSize: '0.94rem', color: '#0f172a' }}>
                  {activeRole.demoAccount}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '14px' }}>
                  {activeRole.demoRole}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '18px' }}>
                  Password: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0f172a' }}>Password@123</code>
                </div>

                <Link
                  to="/login"
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    width: '100%',
                    padding: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    textDecoration: 'none',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {activeRole.linkText} &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 7. BOTTOM BANNER */}
        <section
          style={{
            padding: '54px 28px',
            background: '#0f172a',
            color: '#ffffff',
          }}
        >
          <div
            style={{
              maxWidth: '1080px',
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 6px', color: '#ffffff' }}>
                Open the ITI SkillTrack Workspace
              </h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>
                Sign in with an administrator, instructor, or student account to view live records.
              </p>
            </div>
            <Link
              to={dashboardPath}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                padding: '12px 24px',
                fontSize: '0.9rem',
                fontWeight: 700,
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {primaryLabel} &rarr;
            </Link>
          </div>
        </section>
      </main>

      {/* 8. FOOTER */}
      <footer style={{ padding: '36px 28px', background: '#0b1120', color: '#94a3b8', borderTop: '1px solid #1e293b' }}>
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>ITI SkillTrack</strong>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0' }}>
              Digital Skill Training, Attendance, and Competency Tracking for Industrial Training Institutes
            </p>
          </div>

          <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem' }}>
            <a href="#overview" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Overview</a>
            <a href="#rubrics" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Rubrics</a>
            <a href="#roles" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Workspaces</a>
            <Link to="/login" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
          </div>
        </div>

        <div
          style={{
            maxWidth: '1200px',
            margin: '20px auto 0',
            paddingTop: '16px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: '#64748b',
          }}
        >
          <span>© 2026 ITI SkillTrack · Model Industrial Training Institute (ITI-MODEL-01)</span>
          <span>PHP 8.3 REST API · React 19 SPA · MySQL 8.x / SQLite PDO</span>
        </div>
      </footer>
    </div>
  );
}
