import { Link } from 'react-router-dom';
import { Building2, KeyRound, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import PageHeader from '../../components/common/PageHeader';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { initials, roleHome, toTitleCase } from '../../lib/format';

const CAPABILITY_LABELS = {
  manage_institute: 'Manage institute settings',
  manage_departments: 'Manage departments',
  manage_trades: 'Manage trades',
  manage_academic_periods: 'Manage academic periods',
  manage_batches: 'Manage batches',
  manage_students: 'Manage students & enrollment',
  manage_instructors: 'Manage instructors & assignments',
  manage_users: 'Manage user roles & accounts',
  view_all_records: 'View all institute records',
  view_own_profile: 'View own profile',
  view_assigned_batches: 'View assigned batches',
  view_own_batch: 'View own batch',
  record_attendance: 'Record attendance (Phase 3)',
  view_attendance: 'View attendance (Phase 3)',
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const toast = useToast();

  if (!user) return null;

  const profile = user.profile;
  const displayName = profile?.name || user.username;
  const capabilities = Object.entries(user.capabilities || {}).filter(([, allowed]) => allowed);

  async function handleLogout() {
    await logout();
    toast.info('You have been signed out.');
  }

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="My profile & session"
        description="Your role and scope are assigned by the institute administrator and enforced on every API request."
      />

      <div className="profile-grid">
        <section className="card profile-card">
          <div className="profile-hero">
            <div className="profile-avatar">{initials(displayName)}</div>
            <div>
              <h2>{displayName}</h2>
              <p>{user.email}</p>
              <div className="profile-badges">
                <Badge tone="info">{user.role_label}</Badge>
                <Badge>{user.status}</Badge>
              </div>
            </div>
          </div>

          <div className="detail-list">
            <div className="detail-row">
              <span><UserRound size={15} /> Username</span>
              <strong>{user.username}</strong>
            </div>
            <div className="detail-row">
              <span><Mail size={15} /> Email</span>
              <strong>{user.email}</strong>
            </div>
            <div className="detail-row">
              <span><Building2 size={15} /> Institute</span>
              <strong>{user.institute_name} ({user.institute_code})</strong>
            </div>
            {profile?.admission_no ? (
              <div className="detail-row"><span>Admission no</span><strong>{profile.admission_no}</strong></div>
            ) : null}
            {profile?.employee_code ? (
              <div className="detail-row"><span>Employee code</span><strong>{profile.employee_code}</strong></div>
            ) : null}
            {profile?.batch_name ? (
              <div className="detail-row"><span>Batch</span><strong>{profile.batch_name} · Section {profile.batch_section}</strong></div>
            ) : null}
            {profile?.trade_name ? (
              <div className="detail-row"><span>Trade</span><strong>{profile.trade_name}</strong></div>
            ) : null}
            <div className="detail-row">
              <span>Role key</span>
              <strong className="cell-mono">{user.role}</strong>
            </div>
            <div className="detail-row">
              <span><KeyRound size={15} /> Session</span>
              <strong className="cell-mono session-id">{user.session_id?.slice(0, 18) || 'Active'}…</strong>
            </div>
          </div>

          <div className="profile-actions">
            <Button variant="secondary" onClick={handleLogout}>
              <LogOut size={15} />
              Sign out
            </Button>
            <Link to={roleHome(user.role)} className="btn btn-primary">
              Return to dashboard
            </Link>
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Permissions</h2>
              <p>Server-side capabilities attached to the {toTitleCase(user.role)} role.</p>
            </div>
            <span className="stat-icon stat-icon-violet"><ShieldCheck size={20} /></span>
          </div>

          <div className="capability-list">
            {capabilities.map(([capability]) => (
              <div key={capability} className="capability-item">
                <span className="capability-check">✓</span>
                <div>
                  <strong>{CAPABILITY_LABELS[capability] || toTitleCase(capability)}</strong>
                  <span className="cell-mono">{capability}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="detail-list detail-list-tight scope-list">
            <div className="detail-row">
              <span>Scope type</span>
              <strong>{user.scope?.is_all_institute ? 'All institute records' : user.role === 'instructor' ? 'Assigned batches' : user.role === 'student' ? 'Own records' : 'Institutional'}</strong>
            </div>
            {user.scope?.batches?.length ? (
              <div className="detail-row">
                <span>Batch IDs</span>
                <strong>{user.scope.batches.join(', ')}</strong>
              </div>
            ) : null}
            {user.scope?.trades?.length ? (
              <div className="detail-row">
                <span>Trade IDs</span>
                <strong>{user.scope.trades.join(', ')}</strong>
              </div>
            ) : null}
            <div className="detail-row">
              <span>Institute ID</span>
              <strong>{user.institute_id}</strong>
            </div>
          </div>

          <p className="profile-footnote">
            UI controls are convenience only. Every endpoint independently checks authentication, role and record scope.
          </p>
        </section>
      </div>
    </div>
  );
}
