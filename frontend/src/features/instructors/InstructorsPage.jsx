import { useMemo, useState } from 'react';
import { Eye, Link2, Pencil, Plus, Power, Unlink, Users } from 'lucide-react';
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
import { formatDate } from '../../lib/format';

const EMPTY_FORM = {
  employee_code: '',
  name: '',
  qualification: '',
  email: '',
  username: '',
  password: '',
  batch_id: '',
};

export default function InstructorsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [detailTarget, setDetailTarget] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignBatchId, setAssignBatchId] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [endTarget, setEndTarget] = useState(null);
  const [endLoading, setEndLoading] = useState(false);

  const { data, loading, error, reload } = useApiResource(async () => {
    const [instructors, batches] = await Promise.all([
      api.get('/instructors'),
      api.get('/batches'),
    ]);
    return { instructors, batches };
  }, []);

  const instructors = data?.instructors || [];
  const batches = data?.batches || [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return instructors.filter((instructor) => {
      const matchesStatus = !statusFilter || instructor.status === statusFilter;
      const matchesTerm =
        !term ||
        instructor.name?.toLowerCase().includes(term) ||
        instructor.employee_code?.toLowerCase().includes(term) ||
        instructor.email?.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [instructors, search, statusFilter]);

  function openCreate() {
    const activeBatches = batches.filter((batch) => batch.status === 'active');
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      batch_id: activeBatches[0]?.id ? String(activeBatches[0].id) : '',
    });
    setModalOpen(true);
  }

  function openEdit(instructor) {
    setEditing(instructor);
    setForm({
      ...EMPTY_FORM,
      employee_code: instructor.employee_code,
      name: instructor.name,
      qualification: instructor.qualification || '',
      email: instructor.email || '',
      username: instructor.username || '',
      batch_id: '',
    });
    setModalOpen(true);
  }

  function updateField(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (!editing && key === 'employee_code') {
        if (!current.username) next.username = value.toLowerCase();
        if (!current.email) next.email = value ? `${value.toLowerCase()}@itiskilltrack.org` : '';
      }
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/instructors/${editing.id}`, {
          name: form.name.trim(),
          qualification: form.qualification.trim(),
        });
        toast.success('Instructor profile updated.');
      } else {
        await api.post('/instructors', {
          employee_code: form.employee_code.trim(),
          name: form.name.trim(),
          qualification: form.qualification.trim(),
          email: form.email.trim() || undefined,
          username: form.username.trim() || undefined,
          password: form.password || undefined,
          batch_id: form.batch_id ? Number(form.batch_id) : undefined,
        });
        toast.success('Instructor onboarded successfully.');
      }
      setModalOpen(false);
      await reload();
    } catch (caught) {
      toast.error(caught?.message || 'Unable to save instructor.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    const nextStatus = confirmTarget.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/instructors/${confirmTarget.id}/status`, { status: nextStatus });
      toast.success(`Instructor marked ${nextStatus}.`);
      setConfirmTarget(null);
      await reload();
    } catch (caught) {
      toast.error(caught?.message || 'Unable to update instructor status.');
    } finally {
      setConfirmLoading(false);
    }
  }

  function openAssign(instructor) {
    setAssignTarget(instructor);
    const activeAssignments = instructor.active_assignments || [];
    const assignedIds = new Set(activeAssignments.map((assignment) => String(assignment.batch_id)));
    const candidate = batches.find((batch) => batch.status === 'active' && !assignedIds.has(String(batch.id)));
    setAssignBatchId(candidate ? String(candidate.id) : '');
  }

  async function handleAssign(event) {
    event.preventDefault();
    if (!assignTarget || !assignBatchId) return;
    setAssignSaving(true);
    try {
      await api.post('/instructor-assignments', {
        instructor_id: assignTarget.id,
        batch_id: Number(assignBatchId),
      });
      toast.success('Batch assigned to instructor.');
      setAssignTarget(null);
      await reload();
    } catch (caught) {
      toast.error(caught?.message || 'Unable to assign batch.');
    } finally {
      setAssignSaving(false);
    }
  }

  async function endAssignment() {
    if (!endTarget) return;
    setEndLoading(true);
    try {
      await api.delete(`/instructor-assignments/${endTarget.assignment_id}`);
      toast.success('Assignment ended. History has been preserved.');
      setEndTarget(null);
      setAssignTarget(null);
      await reload();
    } catch (caught) {
      toast.error(caught?.message || 'Unable to end assignment.');
    } finally {
      setEndLoading(false);
    }
  }

  if (loading) return <Loader label="Loading instructor directory…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const assignableBatches = assignTarget
    ? batches.filter((batch) => {
        if (batch.status !== 'active') return false;
        return !(assignTarget.active_assignments || []).some((assignment) => String(assignment.batch_id) === String(batch.id));
      })
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="Trainer management"
        title="Instructors"
        description="Onboard vocational instructors and manage active batch assignments while retaining assignment history."
        actions={
          isAdmin ? (
            <Button onClick={openCreate}>
              <Plus size={16} />
              Add instructor
            </Button>
          ) : null
        }
      />

      <div className="toolbar card">
        <div className="toolbar-filters">
          <input
            type="search"
            className="input-search"
            placeholder="Search instructor name, employee code or email…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <span className="toolbar-count">{filtered.length} of {instructors.length} instructors</span>
      </div>

      <div className="card table-card">
        {filtered.length === 0 ? (
          <EmptyState
            title={instructors.length === 0 ? 'No instructors onboarded' : 'No instructors match your filters'}
            message={instructors.length === 0 ? 'Add an instructor and assign them to a batch.' : 'Try a different search or status.'}
            action={isAdmin && instructors.length === 0 ? <Button onClick={openCreate}><Plus size={15} />Add instructor</Button> : null}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Instructor</th>
                  <th>Employee code</th>
                  <th>Qualification</th>
                  <th>Batches</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((instructor) => (
                  <tr key={instructor.id}>
                    <td>
                      <div className="cell-primary">
                        <span className="cell-avatar"><Users size={15} /></span>
                        <div>
                          <strong>{instructor.name}</strong>
                          <span className="cell-muted">Instructor #{String(instructor.id).padStart(3, '0')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="cell-mono">{instructor.employee_code}</td>
                    <td>{instructor.qualification || <span className="cell-muted">—</span>}</td>
                    <td>
                      {instructor.active_assignments?.length ? (
                        <div className="badge-stack">
                          {instructor.active_assignments.slice(0, 2).map((assignment) => (
                            <span key={assignment.assignment_id} className="mini-chip">{assignment.batch_name} · {assignment.batch_section}</span>
                          ))}
                          {instructor.active_assignments.length > 2 ? <span className="cell-muted">+{instructor.active_assignments.length - 2} more</span> : null}
                        </div>
                      ) : (
                        <span className="cell-muted">Unassigned</span>
                      )}
                    </td>
                    <td>{instructor.email}</td>
                    <td><Badge>{instructor.status}</Badge></td>
                    <td className="align-right">
                      <div className="row-actions">
                        <button type="button" className="icon-btn" onClick={() => setDetailTarget(instructor)} aria-label={`View ${instructor.name}`}>
                          <Eye size={15} />
                        </button>
                        {isAdmin ? (
                          <>
                            <button type="button" className="icon-btn" onClick={() => openEdit(instructor)} aria-label={`Edit ${instructor.name}`}>
                              <Pencil size={15} />
                            </button>
                            <button type="button" className="icon-btn" onClick={() => openAssign(instructor)} aria-label={`Manage batches for ${instructor.name}`}>
                              <Link2 size={15} />
                            </button>
                            <button type="button" className="icon-btn" onClick={() => setConfirmTarget(instructor)} aria-label={`${instructor.status === 'active' ? 'Deactivate' : 'Activate'} ${instructor.name}`}>
                              <Power size={15} />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit instructor profile' : 'Add instructor'}
        description={editing ? 'Account identity and batch assignments are managed separately.' : 'A linked instructor login is created automatically.'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <Field label="Employee code" htmlFor="instructor-code" required>
            <input
              id="instructor-code"
              value={form.employee_code}
              onChange={(event) => updateField('employee_code', event.target.value)}
              placeholder="INST-014"
              required
              disabled={Boolean(editing)}
            />
          </Field>
          <Field label="Full name" htmlFor="instructor-name" required>
            <input id="instructor-name" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Rajesh Sharma" required />
          </Field>
          <Field label="Qualification" htmlFor="instructor-qualification" className="span-2">
            <input id="instructor-qualification" value={form.qualification} onChange={(event) => updateField('qualification', event.target.value)} placeholder="B.Tech Electrical, NSQF Level 5 Assessor" />
          </Field>
          {!editing ? (
            <>
              <Field label="Email" htmlFor="instructor-email" required>
                <input id="instructor-email" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="instructor@itiskilltrack.org" required />
              </Field>
              <Field label="Username" htmlFor="instructor-username" required>
                <input id="instructor-username" value={form.username} onChange={(event) => updateField('username', event.target.value)} placeholder="INST-014" required />
              </Field>
              <Field label="Initial password" htmlFor="instructor-password" hint="Leave blank to use Password@123 for the pilot.">
                <input id="instructor-password" type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder="Password@123" />
              </Field>
              <Field label="Initial batch" htmlFor="instructor-batch">
                <select id="instructor-batch" value={form.batch_id} onChange={(event) => updateField('batch_id', event.target.value)}>
                  <option value="">Assign later</option>
                  {batches.filter((batch) => batch.status === 'active').map((batch) => (
                    <option key={batch.id} value={batch.id}>{batch.name} · Section {batch.section} · {batch.trade_name}</option>
                  ))}
                </select>
              </Field>
            </>
          ) : (
            <div className="form-note span-2">
              Credentials and employee code are protected. Use “Manage batches” to update teaching assignments.
            </div>
          )}
          <div className="form-actions span-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? 'Save profile' : 'Create instructor'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(detailTarget)}
        title={detailTarget?.name || 'Instructor profile'}
        description={detailTarget ? `${detailTarget.employee_code} · ${detailTarget.email}` : ''}
        onClose={() => setDetailTarget(null)}
        size="lg"
      >
        <div className="detail-columns">
          <div>
            <div className="detail-section-title"><Users size={16} />Profile</div>
            <div className="detail-list detail-list-tight">
              <div className="detail-row"><span>Status</span><Badge>{detailTarget?.status}</Badge></div>
              <div className="detail-row"><span>Qualification</span><strong>{detailTarget?.qualification || '—'}</strong></div>
              <div className="detail-row"><span>Username</span><strong>{detailTarget?.username}</strong></div>
              <div className="detail-row"><span>Active batches</span><strong>{detailTarget?.active_assignments?.length || 0}</strong></div>
            </div>
          </div>
          <div>
            <div className="detail-section-title"><Link2 size={16} />Assignment history</div>
            {detailTarget?.assigned_batches?.length ? (
              <div className="compact-list">
                {detailTarget.assigned_batches.map((assignment) => (
                  <div key={assignment.assignment_id} className="compact-row">
                    <div>
                      <strong>{assignment.batch_name} · Section {assignment.batch_section}</strong>
                      <span>{assignment.trade_name} · {formatDate(assignment.starts_on)} → {assignment.ends_on ? formatDate(assignment.ends_on) : 'Present'}</span>
                    </div>
                    <Badge tone={assignment.ends_on ? 'info' : 'success'}>{assignment.ends_on ? 'ended' : 'active'}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-text">No batch assignments yet.</p>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(assignTarget)}
        title="Manage batch assignments"
        description={assignTarget ? `${assignTarget.name} · ${assignTarget.employee_code}` : ''}
        onClose={() => setAssignTarget(null)}
        size="md"
      >
        <div className="detail-section-title"><Link2 size={16} />Active assignments</div>
        {assignTarget?.active_assignments?.length ? (
          <div className="compact-list">
            {assignTarget.active_assignments.map((assignment) => (
              <div key={assignment.assignment_id} className="compact-row">
                <div>
                  <strong>{assignment.batch_name} · Section {assignment.batch_section}</strong>
                  <span>{assignment.trade_name} · since {formatDate(assignment.starts_on)}</span>
                </div>
                <Button variant="ghost-danger" size="sm" onClick={() => setEndTarget(assignment)}>
                  <Unlink size={14} />
                  End
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted-text">No active batch assignments.</p>
        )}

        <form onSubmit={handleAssign} className="assign-form">
          <div className="detail-section-title"><Plus size={16} />Assign another batch</div>
          {assignableBatches.length === 0 ? (
            <p className="muted-text">No additional active batches are available.</p>
          ) : (
            <>
              <Field label="Batch" htmlFor="assign-batch" required>
                <select id="assign-batch" value={assignBatchId} onChange={(event) => setAssignBatchId(event.target.value)} required>
                  <option value="">Select batch</option>
                  {assignableBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>{batch.name} · Section {batch.section} · {batch.trade_name}</option>
                  ))}
                </select>
              </Field>
              <Button type="submit" loading={assignSaving} disabled={!assignBatchId}>
                <Link2 size={15} />
                Assign batch
              </Button>
            </>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(endTarget)}
        title="End batch assignment?"
        message={`This will end the assignment for ${endTarget?.batch_name || 'this batch'} today. The historical assignment record is retained.`}
        confirmLabel="End assignment"
        variant="danger"
        loading={endLoading}
        onConfirm={endAssignment}
        onClose={() => setEndTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={`${confirmTarget?.status === 'active' ? 'Deactivate' : 'Reactivate'} instructor?`}
        message={
          confirmTarget?.status === 'active'
            ? `Deactivating ${confirmTarget?.name} also disables their linked login. Batch assignment history is preserved.`
            : `Reactivating ${confirmTarget?.name} restores the linked instructor login.`
        }
        confirmLabel={confirmTarget?.status === 'active' ? 'Deactivate instructor' : 'Reactivate instructor'}
        variant={confirmTarget?.status === 'active' ? 'danger' : 'primary'}
        loading={confirmLoading}
        onConfirm={toggleStatus}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}
