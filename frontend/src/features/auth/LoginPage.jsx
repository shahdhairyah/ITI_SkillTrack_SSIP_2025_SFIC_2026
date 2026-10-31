import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import Button from '../../components/common/Button';
import Field from '../../components/common/Field';
import { roleHome } from '../../lib/format';

const DEMO_ACCOUNTS = [
  { label: 'Administrator', identity: 'admin@itiskilltrack.org', role: 'Institute setup & access' },
  { label: 'Instructor', identity: 'rajesh.sharma@itiskilltrack.org', role: 'Assigned batch scope' },
  { label: 'Student', identity: 'amit.kumar@student.iti.org', role: 'Own records only' },
];

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setError('');
    setSubmitting(true);
    try {
      const session = await login(identity.trim(), password);
      const target = location.state?.from;
      navigate(target && target !== '/login' ? target : roleHome(session.role), { replace: true });
    } catch (caught) {
      setPassword('');
      setError(caught?.message || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(account) {
    setIdentity(account);
    setPassword('Password@123');
    setError('');
  }

  return (
    <div className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand-top">
          <div className="logo-badge logo-badge-lg">ST</div>
          <div>
            <h1>ITI SkillTrack</h1>
            <p>Digital Skill Training, Attendance & Competency Tracking</p>
          </div>
        </div>

        <div className="login-brand-copy">
          <span className="login-kicker">Phase 2 · Secure institute setup</span>
          <h2>One role-aware workspace for trainees, trainers and administrators.</h2>
          <p>
            Authentication, session security, institute master data and server-enforced record scope —
            built with React, PHP and MySQL without any container dependency.
          </p>
          <ul className="login-feature-list">
            <li>
              <ShieldCheck size={17} />
              Server-side RBAC and CSRF-protected sessions
            </li>
            <li>
              <BookOpen size={17} />
              Trades, departments, academic periods and batches
            </li>
            <li>
              <UserRound size={17} />
              Student enrollment and instructor assignment history
            </li>
          </ul>
        </div>

        <div className="login-brand-footer">
          <div className="login-inst-chip">
            <span className="status-dot" />
            Model Industrial Training Institute · ITI-MODEL-01
          </div>
          <p>Pilot trade: Electrician (ELE-01) · Batch EL-2026-A · 2026–2027 session</p>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <Link to="/" className="login-back-link">
            <ArrowLeft size={14} />
            Back to home
          </Link>

          <div className="login-form-heading">
            <span className="page-eyebrow">Secure sign in</span>
            <h2>Welcome back</h2>
            <p>Use your institute account to continue.</p>
          </div>

          {error ? (
            <div className="alert alert-error" role="alert">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <Field label="Email or username" htmlFor="identity" required>
              <div className="input-with-icon">
                <UserRound size={17} />
                <input
                  id="identity"
                  name="identity"
                  type="text"
                  autoComplete="username"
                  placeholder="you@institute.org"
                  value={identity}
                  onChange={(event) => setIdentity(event.target.value)}
                  required
                  autoFocus
                />
              </div>
            </Field>

            <Field label="Password" htmlFor="password" required>
              <div className="input-with-icon">
                <LockKeyhole size={17} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-icon-button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>

            <Button type="submit" className="btn-block btn-login" loading={submitting}>
              Sign in securely
              {!submitting ? <ArrowRight size={17} /> : null}
            </Button>
          </form>

          <div className="login-demo">
            <div className="login-demo-heading">
              <span>Pilot test accounts</span>
              <span className="login-demo-password">Password@123</span>
            </div>
            <div className="login-demo-grid">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.identity}
                  type="button"
                  className="demo-account"
                  onClick={() => fillDemo(account.identity)}
                >
                  <span className="demo-account-label">
                    <CheckCircle2 size={13} />
                    {account.label}
                  </span>
                  <span className="demo-account-role">{account.role}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="login-footnote">
            Sessions use HttpOnly cookies. Sign-in is rate-limited by institute policy in production deployments.
          </p>
        </div>
      </section>
    </div>
  );
}
