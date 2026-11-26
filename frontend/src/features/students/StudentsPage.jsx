import { useMemo, useState } from 'react';
import { Eye, GraduationCap, Pencil, Plus, Power, Repeat } from 'lucide-react';
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
  admission_no: '',
  name: '',
  gender: 'male',
  category: 'General',
  phone: '',
  email: '',
  username: '',
  password: '',
  batch_id: '',
};

const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS'];

export default function StudentsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState(null);
  const [enrollBatchId, setEnrollBatchId] = useState('');
  const [enrollSaving, setEnrollSaving] = useState(false);

  const { data, loading, error, reload } = useApiResource(async () => {
    const [students, batches] = await Promise.all([
      api.get('/students'),
      api.get('/batches'),
    ]);
    return { students, batches };
  }, []);

  const students = data?.students || [];
  const batches = data?.batches || [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesStatus = !statusFilter || student.status === statusFilter;
      const matchesBatch = !batchFilter || String(student.batch_id) === String(batchFilter);
      const matchesTerm =
        !term ||
        student.name?.toLowerCase().includes(term) ||
        student.admission_no?.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term) ||
        student.batch_name?.toLowerCase().includes(term);
      return matchesStatus && matchesBatch && matchesTerm;
    });
  }, [students, search, statusFilter, batchFilter]);

  function openCreate() {
    const activeBatches = batches.filter((batch) => batch.status === 'active');
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      batch_id: activeBatches[0]?.id ? String(activeBatches[0].id) : '',
    });
    setModalOpen(true);
  }

  function openEdit(student) {
    setEditing(student);
    setForm({
      admission_no: student.admission_no,
      name: student.name,
      gender: student.gender,
      category: student.category,
      phone: student.phone || '',
      email: student.email || '',
      username: student.username || '',
      password: '',
      batch_id: student.batch_id ? String(student.batch_id) : '',
    });
    setModalOpen(true);
  }

  function updateField(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (!editing && key === 'admission_no') {
        if (!current.email) next.email = value ? `${value.toLowerCase()}@student.iti.org` : '';
        if (!current.username) next.username = value;
      }
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/students/${editing.id}`, {
          name: form.name.trim(),
          gender: form.gender,
          category: form.category,
          phone: form.phone.trim(),
        });
        toast.success('Student profile updated.');
      } else {
        await api.post('/students', {
          admission_no: form.admission_no.trim(),
          name: form.name.trim(),
          gender: form.gender,
          category: form.category,
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          username: form.username.trim() || undefined,
          password: form.password || undefined,
          batch_id: Number(form.batch_id),
        });
        toast.success('Student created and enrolled.');
      }
      setModalOpen(false);
      await reload();
    } catch (caught) {
      toast.error(caught?.message || 'Unable to save student.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    const nextStatus = confirmTarget.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/students/${confirmTarget.id}/status`, { status: nextStatus });
      toast.success(`Student marked ${nextStatus}.`);
      setConfirmTarget(null);
      await reload();
    } catch (caught) {
      toast.error(caught?.message || 'Unable to update student status.');
    } finally {
      setConfirmLoading(false);
    }
  }

  async function openDetail(student) {
    setDetail({ student, loading: true });
    setDetailLoading(true);
    try {
      const fullStudent = await api.get(`/students/${student.id}`);
      setDetail({ student: fullStudent, loading: false });
    } catch (caught) {
      toast.error(caught?.message || 'Unable to load student details.');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function openEnroll(student) {
    setEnrollTarget(student);
    setEnrollBatchId(student.batch_id ? String(student.batch_id) : String(batches.find((batch) => batch.status === 'active')?.id || ''));
  }

  async function handleEnroll(event) {
    event.preventDefault();
    if (!enrollTarget || !enrollBatchId) return;
    setEnrollSaving(true);
    try {
      await api.post('/enrollments', {
        student_id: enrollTarget.id,
        batch_id: Number(enrollBatchId),
      });
      toast.success('Student enrollment updated.');
      setEnrollTarget(null);
      await reload();
    } catch (caught) {
      toast.error(caught?.message || 'Unable to update enrollment.');
    } finally {
      setEnrollSaving(false);
    }
  }

  if (loading) return <Loader label="Loading student directory…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        eyebrow="Trainee management"
        title="Students"
        description="Create trainee profiles, enroll them into batches and preserve transfer history."
        actions={
          isAdmin ? (
            <Button onClick={openCreate}>
              <Plus size={16} />
              Add student
            </Button>
          ) : null
        }
      />

      <div className="toolbar card">
        <div className="toolbar-filters">
          <input
            type="search"
            className="input-search"
            placeholder="Search name, admission no, email or batch…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={batchFilter} onChange={(event) => setBatchFilter(event.target.value)}>
            <option value="">All batches</option>
            {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name} · {batch.section}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <span className="toolbar-count">{filtered.length} of {students.length} students</span>
      </div>

      <div className="card table-card">
        {filtered.length === 0 ? (
          <EmptyState
            title={students.length === 0 ? 'No students enrolled' : 'No students match your filters'}
            message={students.length === 0 ? 'Add the first trainee and assign them to an active batch.' : 'Try a different search or filter.'}
            action={isAdmin && students.length === 0 ? <Button onClick={openCreate}><Plus size={15} />Add student</Button> : null}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Admission no</th>
                  <th>Batch</th>
                  <th>Trade</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="cell-primary">
                        <span className="cell-avatar"><GraduationCap size={15} /></span>
                        <div>
                          <strong>{student.name}</strong>
                          <span className="cell-muted">{toTitleCase(student.gender)} · {student.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="cell-mono">{student.admission_no}</td>
                    <td>
                      {student.batch_name ? (
                        <>
                          <strong className="cell-block">{student.batch_name}</strong>
                          <span className="cell-muted">Section {student.batch_section}</span>
                        </>
                      ) : (
                        <span className="cell-muted">Not enrolled</span>
                      )}
                    </td>
                    <td>{student.trade_name || <span className="cell-muted">—</span>}</td>
                    <td>
                      <span className="cell-block">{student.email}</span>
                      <span className="cell-muted">{student.phone || 'No phone'}</span>
                    </td>
                    <td><Badge>{student.status}</Badge></td>
                    <td className="align-right">
                      <div className="row-actions">
                        <button type="button" className="icon-btn" onClick={() => openDetail(student)} aria-label={`View ${student.name}`}>
                          <Eye size={15} />
                        </button>
                        {isAdmin ? (
                          <>
                            <button type="button" className="icon-btn" onClick={() => openEdit(student)} aria-label={`Edit ${student.name}`}>
                              <Pencil size={15} />
                            </button>
                            <button type="button" className="icon-btn" onClick={() => openEnroll(student)} aria-label={`Change batch for ${student.name}`}>
                              <Repeat size={15} />
                            </button>
                            <button type="button" className="icon-btn" onClick={() => setConfirmTarget(student)} aria-label={`${student.status === 'active' ? 'Deactivate' : 'Activate'} ${student.name}`}>
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
        title={editing ? 'Edit student profile' : 'Add student'}
        description={editing ? 'Account identity and batch history are managed separately.' : 'A linked student login is created automatically.'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <Field label="Admission number" htmlFor="student-admission" required>
            <input
              id="student-admission"
              value={form.admission_no}
              onChange={(event) => updateField('admission_no', event.target.value)}
              placeholder="2026-EL-014"
              required
              disabled={Boolean(editing)}
            />
          </Field>
          <Field label="Full name" htmlFor="student-name" required>
            <input id="student-name" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Amit Kumar" required />
          </Field>
          <Field label="Gender" htmlFor="student-gender">
            <select id="student-gender" value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Category" htmlFor="student-category">
            <select id="student-category" value={form.category} onChange={(event) => updateField('category', event.target.value)}>
              {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </Field>
          <Field label="Phone" htmlFor="student-phone">
            <input id="student-phone" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="+91 98765 43210" />
          </Field>
          {!editing ? (
            <>
              <Field label="Email" htmlFor="student-email" required>
                <input id="student-email" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="student@iti.org" required />
              </Field>
              <Field label="Username" htmlFor="student-username" required>
                <input id="student-username" value={form.username} onChange={(event) => updateField('username', event.target.value)} placeholder="2026-EL-014" required />
              </Field>
              <Field label="Initial password" htmlFor="student-password" hint="Leave blank to use Password@123 for the pilot.">
                <input id="student-password" type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder="Password@123" />
              </Field>
              <Field label="Initial batch" htmlFor="student-batch" required className="span-2">
                <select id="student-batch" value={form.batch_id} onChange={(event) => updateField('batch_id', event.target.value)} required>
                  <option value="">Select an active batch</option>
                  {batches.filter((batch) => batch.status === 'active').map((batch) => (
                    <option key={batch.id} value={batch.id}>{batch.name} · Section {batch.section} · {batch.trade_name}</option>
                  ))}
                </select>
              </Field>
            </>
          ) : (
            <div className="form-note span-2">
              Credentials, admission number and active batch are protected. Use “Change batch” from the student row to move this trainee.
            </div>
          )}
          <div className="form-actions span-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? 'Save profile' : 'Create student'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        title={detail?.student?.name || 'Student profile'}
        description={detail?.student ? `${detail.student.admission_no} · ${detail.student.email}` : ''}
        onClose={() => setDetail(null)}
        size="lg"
      >
        {detailLoading || detail?.loading ? (
          <Loader label="Loading student record…" />
        ) : (
          <div className="detail-columns">
            <div>
              <div className="detail-section-title"><GraduationCap size={16} />Profile</div>
              <div className="detail-list detail-list-tight">
                <div className="detail-row"><span>Status</span><Badge>{detail?.student?.status}</Badge></div>
                <div className="detail-row"><span>Gender</span><strong>{toTitleCase(detail?.student?.gender)}</strong></div>
                <div className="detail-row"><span>Category</span><strong>{detail?.student?.category}</strong></div>
                <div className="detail-row"><span>Phone</span><strong>{detail?.student?.phone || '—'}</strong></div>
                <div className="detail-row"><span>Username</span><strong>{detail?.student?.username}</strong></div>
                <div className="detail-row"><span>Current batch</span><strong>{detail?.student?.batch_name || 'Not enrolled'}</strong></div>
                <div className="detail-row"><span>Trade</span><strong>{detail?.student?.trade_name || '—'}</strong></div>
              </div>
            </div>
            <div>
              <div className="detail-section-title"><Repeat size={16} />Enrollment history</div>
              {detail?.student?.enrollments?.length ? (
                <div className="compact-list">
                  {detail.student.enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="compact-row">
                      <div>
                        <strong>{enrollment.batch_name} · Section {enrollment.batch_section}</strong>
                        <span>{enrollment.trade_name} · {formatDate(enrollment.starts_on)} → {enrollment.ends_on ? formatDate(enrollment.ends_on) : 'Present'}</span>
                      </div>
                      <Badge>{enrollment.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-text">No enrollment history.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(enrollTarget)}
        title="Change student batch"
        description={enrollTarget ? `${enrollTarget.name} · ${enrollTarget.admission_no}` : ''}
        onClose={() => setEnrollTarget(null)}
        size="sm"
      >
        <form onSubmit={handleEnroll} className="form-grid form-grid-single">
          <Field label="New batch" htmlFor="enroll-batch" required hint="The previous enrollment is ended and retained in history.">
            <select id="enroll-batch" value={enrollBatchId} onChange={(event) => setEnrollBatchId(event.target.value)} required>
              <option value="">Select batch</option>
              {batches.filter((batch) => batch.status === 'active').map((batch) => (
                <option key={batch.id} value={batch.id}>{batch.name} · Section {batch.section} · {batch.trade_name}</option>
              ))}
            </select>
          </Field>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setEnrollTarget(null)} disabled={enrollSaving}>Cancel</Button>
            <Button type="submit" loading={enrollSaving}>Update enrollment</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={`${confirmTarget?.status === 'active' ? 'Deactivate' : 'Reactivate'} student?`}
        message={
          confirmTarget?.status === 'active'
            ? `Deactivating ${confirmTarget?.name} also disables their linked login. Enrollment history is preserved.`
            : `Reactivating ${confirmTarget?.name} restores the linked student login.`
        }
        confirmLabel={confirmTarget?.status === 'active' ? 'Deactivate student' : 'Reactivate student'}
        variant={confirmTarget?.status === 'active' ? 'danger' : 'primary'}
        loading={confirmLoading}
        onConfirm={toggleStatus}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}
