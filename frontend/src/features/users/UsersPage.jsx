import { useMemo, useState } from 'react';
import { KeyRound, Plus, Power, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { useApiResource } from '../../hooks/useApiResource';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Field from '../../components/common/Field';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { formatDate, toTitleCase } from '../../lib/format';

const EMPTY_FORM = {
  email: '',
  username: '',
  password: '',
  role: 'monitoring_officer',
  status: 'active',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  const { data, loading, error, reload } = useApiResource(() => api.get('/users'), []);
  const users = data || [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((row) => {
      const matchesRole = !roleFilter || row.role === roleFilter;
      const matchesStatus = !statusFilter || row.status === statusFilter;
      const matchesTerm =
        !term ||
        row.email?.toLowerCase().includes(term) ||
        row.username?.toLowerCase().includes(term) ||
        row.student_name?.toLowerCase().includes(term) ||
        row.instructor_name?.toLowerCase().includes(term);
      return matchesRole && matchesStatus && matchesTerm;
    });
  }, [users, search, roleFilter, statusFilter]);

  function displayName(user) {
    return user.student_name || user.instructor_name || user.username;
  }

  function statusOf(user) {
    return user.student_status || user.instructor_status || user.status;
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/users', {
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        status: form.status,
      });
      toast.success('User account created.');
      setModalOpen(false);
      await reload();
    } catch (caught) {
      toast.error(caught?.message || 'Unable to create user.');
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(user, role) {
    try {
      await api.patch(`/users/${user.id}/role`, { role });
      toast.success('User role updated.');
      await reload();
    } catch (caught) {
      toast.error(caught?.message || 'Unable to update role.');
    }
  }

  async function toggleStatus() {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    const nextStatus = confirmTarget.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/users/${confirmTarget.id}/status`, { status: nextStatus });
      toast.success(`Account marked ${nextStatus}.`);
      setConfirmTarget(null);
      await reload();
    } catch (caught) {
      toast.error(caught?.message || 'Unable to update account status.');
    } finally {
      setConfirmLoading(false);
    }
  }

  async function handleReset(event) {
    event.preventDefault();
    setResetSaving(true);
    try {
      await api.post(`/users/${resetTarget.id}/reset-password`, { password: newPassword });
      toast.success('Password reset successfully.');
      setResetTarget(null);
      setNewPassword('');
    } catch (caught) {
      toast.error(caught?.message || 'Unable to reset password.');
    } finally {
      setResetSaving(false);
    }
  }

  if (loading) return <Loader label="Loading user accounts…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        eyebrow="Access control"
        title="User roles & access"
        description="Administrator and monitoring officer accounts are managed here. Student and instructor logins are created from their profile screens."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Add staff account
          </Button>
        }
      />

      <div className="toolbar card">
        <div className="toolbar-filters">
          <input
            type="search"
            className="input-search"
            placeholder="Search email, username or linked profile…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="">All roles</option>
            <option value="administrator">Administrator</option>
            <option value="monitoring_officer">Monitoring officer</option>
            <option value="instructor">Instructor</option>
            <option value="student">Student</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <span className="toolbar-count">{filtered.length} of {users.length} accounts</span>
      </div>

      <div className="card table-card">
        {filtered.length === 0 ? (
          <EmptyState title="No accounts match your filters" message="Try a different search or filter." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Role</th>
                  <th>Linked profile</th>
                  <th>Scope</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const isSelf = row.id === currentUser?.id;
                  const manageable = ['administrator', 'monitoring_officer'].includes(row.role);
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="cell-primary">
                          <span className="cell-avatar"><ShieldCheck size={15} /></span>
                          <div>
                            <strong>{displayName(row)}</strong>
                            <span className="cell-muted">{row.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {manageable ? (
                          <select
                            className="select-inline"
                            value={row.role}
                            onChange={(event) => changeRole(row, event.target.value)}
                            disabled={isSelf}
                            aria-label={`Role for ${displayName(row)}`}
                          >
                            <option value="administrator">Administrator</option>
                            <option value="monitoring_officer">Monitoring officer</option>
                          </select>
                        ) : (
                          <Badge tone="info">{row.role_label}</Badge>
                        )}
                        {isSelf ? <span className="cell-muted cell-block">Current session</span> : null}
                      </td>
                      <td>
                        {row.admission_no ? `Student · ${row.admission_no}` : null}
                        {row.employee_code ? `Instructor · ${row.employee_code}` : null}
                        {!row.admission_no && !row.employee_code ? <span className="cell-muted">Staff account</span> : null}
                      </td>
                      <td>
                        {row.role_assignments?.length ? (
                          <span className="cell-muted">{toTitleCase(row.role_assignments[0].scope_type)} scope</span>
                        ) : (
                          <span className="cell-muted">Unassigned</span>
                        )}
                      </td>
                      <td>{formatDate(row.created_at)}</td>
                      <td><Badge>{statusOf(row)}</Badge></td>
                      <td className="align-right">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => { setResetTarget(row); setNewPassword(''); }}
                            aria-label={`Reset password for ${displayName(row)}`}
                          >
                            <KeyRound size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setConfirmTarget({ ...row, status: statusOf(row) })}
                            disabled={isSelf}
                            aria-label={`${row.status === 'active' ? 'Deactivate' : 'Activate'} ${displayName(row)}`}
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        title="Add staff account"
        description="Create an administrator or monitoring officer login. Training accounts are created from student and instructor screens."
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleCreate} className="form-grid">
          <Field label="Email" htmlFor="user-email" required className="span-2">
            <input id="user-email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="officer@itiskilltrack.org" required />
          </Field>
          <Field label="Username" htmlFor="user-username" required>
            <input id="user-username" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} placeholder="monitor.01" required />
          </Field>
          <Field label="Initial password" htmlFor="user-password" required hint="Minimum 8 characters.">
            <input id="user-password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Set a secure password" required minLength={8} />
          </Field>
          <Field label="Role" htmlFor="user-role" required>
            <select id="user-role" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
              <option value="monitoring_officer">Monitoring officer</option>
              <option value="administrator">Administrator</option>
            </select>
          </Field>
          <Field label="Status" htmlFor="user-status">
            <select id="user-status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <div className="form-note span-2">
            Administrator accounts have full institute scope. Monitoring officers are read-only and cannot modify master data.
          </div>
          <div className="form-actions span-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" loading={saving}>Create account</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(resetTarget)}
        title="Reset account password"
        description={resetTarget ? displayName(resetTarget) : ''}
        onClose={() => setResetTarget(null)}
        size="sm"
      >
        <form onSubmit={handleReset} className="form-grid form-grid-single">
          <Field label="New password" htmlFor="reset-password" required hint="Minimum 8 characters. The user should change it after signing in.">
            <input id="reset-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} autoFocus />
          </Field>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setResetTarget(null)} disabled={resetSaving}>Cancel</Button>
            <Button type="submit" loading={resetSaving}>Reset password</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={`${confirmTarget?.status === 'active' ? 'Deactivate' : 'Reactivate'} account?`}
        message={
          confirmTarget?.status === 'active'
            ? `Deactivating ${displayName(confirmTarget || {})} immediately blocks sign-in. Existing records and history remain intact.`
            : `Reactivating ${displayName(confirmTarget || {})} restores sign-in access.`
        }
        confirmLabel={confirmTarget?.status === 'active' ? 'Deactivate account' : 'Reactivate account'}
        variant={confirmTarget?.status === 'active' ? 'danger' : 'primary'}
        loading={confirmLoading}
        onConfirm={toggleStatus}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}
