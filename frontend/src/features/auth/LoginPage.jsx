import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  CalendarCheck2,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { roleHome } from '../../lib/format';

const PRECONFIGURED_USERS = [
  {
    role: 'administrator',
    badge: 'Admin',
    name: 'Administrator',
    email: 'admin@itiskilltrack.org',
    scope: 'Institute Scope',
    icon: ShieldCheck,
  },
  {
    role: 'instructor',
    badge: 'Instructor',
    name: 'Rajesh Sharma',
    email: 'rajesh.sharma@itiskilltrack.org',
    scope: 'Batch Scope',
    icon: Users,
  },
  {
    role: 'student',
    badge: 'Trainee',
    name: 'Amit Kumar',
    email: 'amit.kumar@student.iti.org',
    scope: 'Roll 001',
    icon: GraduationCap,
  },
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
  const [activePreset, setActivePreset] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  if (isAuthenticated) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  async function handleSubmit(event) {
    event?.preventDefault();
    if (submitting) return;

    if (!identity.trim()) {
      setError('Please enter your email or username.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const session = await login(identity.trim(), password);
      const target = location.state?.from;
      navigate(target && target !== '/login' ? target : roleHome(session.role), { replace: true });
    } catch (caught) {
      setPassword('');
      setError(caught?.message || 'Invalid username or password. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  function pickPreset(preset) {
    setIdentity(preset.email);
    setPassword('Password@123');
    setActivePreset(preset.role);
    setError('');
  }

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f8fafc',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      {/* Centered Institutional Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)',
          padding: 'clamp(28px, 4.2vh, 40px) clamp(24px, 4vw, 36px)',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Top Header: Brand Icon, Title, Subtitle */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(18px, 2.5vh, 26px)' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: '#2563eb',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.15rem',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
            }}
          >
            ST
          </div>

          <h1
            style={{
              margin: '0 0 4px 0',
              fontSize: '1.45rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.03em',
            }}
          >
            ITI SkillTrack
          </h1>

          <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
            Vocational Attendance & Competency Tracking
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '0.8rem',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label
              htmlFor="user-identity"
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Email Address or Username
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '8px',
                border: focusedField === 'identity' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                background: '#ffffff',
                boxShadow: focusedField === 'identity' ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
                padding: '0 12px',
                transition: 'all 0.15s ease',
              }}
            >
              <Mail size={16} color={focusedField === 'identity' ? '#2563eb' : '#94a3b8'} />
              <input
                id="user-identity"
                type="text"
                autoComplete="username"
                placeholder="name@itiskilltrack.org"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                onFocus={() => setFocusedField('identity')}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  background: 'transparent',
                }}
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label
                htmlFor="user-password"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#334155',
                }}
              >
                Password
              </label>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Default: <strong>Password@123</strong>
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '8px',
                border: focusedField === 'password' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                background: '#ffffff',
                boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
                padding: '0 12px',
                transition: 'all 0.15s ease',
              }}
            >
              <Lock size={16} color={focusedField === 'password' ? '#2563eb' : '#94a3b8'} />
              <input
                id="user-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  background: 'transparent',
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '11px',
              fontSize: '0.9rem',
              fontWeight: 700,
              borderRadius: '8px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              cursor: submitting ? 'wait' : 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '4px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => !submitting && (e.currentTarget.style.background = '#1d4ed8')}
            onMouseLeave={(e) => !submitting && (e.currentTarget.style.background = '#2563eb')}
          >
            {submitting ? 'Signing in...' : 'Sign In to Workspace'}
            {!submitting && <ArrowRight size={16} />}
          </button>
        </form>

        {/* 1-Click Fast Demo Switcher */}
        <div style={{ marginTop: 'clamp(18px, 2.5vh, 24px)', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Instant Demo Access
            </span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Click to autofill</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {PRECONFIGURED_USERS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = activePreset === preset.role;

              return (
                <button
                  key={preset.email}
                  type="button"
                  onClick={() => pickPreset(preset)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  title={preset.email}
                >
                  <Icon size={16} color={isSelected ? '#2563eb' : '#64748b'} style={{ marginBottom: '3px' }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{preset.badge}</span>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{preset.scope}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Back to Home Link */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Link
            to="/"
            style={{
              fontSize: '0.8rem',
              color: '#64748b',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#2563eb')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            <ArrowLeft size={13} />
            <span>Back to Portal Overview</span>
          </Link>
        </div>
      </div>

      {/* Subdued Bottom System Note */}
      <div style={{ marginTop: '14px', fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center' }}>
        <span>Model Industrial Training Institute · ITI-MODEL-01 · Craftsmen Training Scheme</span>
      </div>
    </div>
  );
}
