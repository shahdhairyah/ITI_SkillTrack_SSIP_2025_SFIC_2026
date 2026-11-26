import { useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Save, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useApiResource } from '../../hooks/useApiResource';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Field from '../../components/common/Field';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';

const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Kathmandu',
  'Asia/Dhaka',
  'Asia/Colombo',
  'UTC',
];

export default function InstituteSettingsPage() {
  const { refresh } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useApiResource(async () => {
    const [institute, departments] = await Promise.all([
      api.get('/institute'),
      api.get('/departments'),
    ]);
    return { institute, departments };
  }, []);

  const [form, setForm] = useState({ name: '', code: '', timezone: 'Asia/Kolkata', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [departmentModal, setDepartmentModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentForm, setDepartmentForm] = useState({ name: '', code: '' });
  const [departmentSaving, setDepartmentSaving] = useState(false);

  useEffect(() => {
    if (data?.institute) {
      setForm({
        name: data.institute.name || '',
        code: data.institute.code || '',
        timezone: data.institute.timezone || 'Asia/Kolkata',
        status: data.institute.status || 'active',
      });
    }
  }, [data]);

  async function saveInstitute(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put('/institute', form);
      await Promise.all([reload(), refresh()]);
      toast.success('Institute profile updated.');
    } catch (caught) {
      toast.error(caught?.message || 'Unable to update institute profile.');
    } finally {
      setSaving(false);
    }
  }

  function openDepartmentCreate() {
    setEditingDepartment(null);
    setDepartmentForm({ name: '', code: '' });
    setDepartmentModal(true);
  }

  function openDepartmentEdit(department) {
    setEditingDepartment(department);
    setDepartmentForm({ name: department.name, code: department.code });
    setDepartmentModal(true);
  }

  async function saveDepartment(event) {
    event.preventDefault();
    setDepartmentSaving(true);
    try {
      if (editingDepartment) {
        await api.put(`/departments/${editingDepartment.id}`, { name: departmentForm.name.trim() });
        toast.success('Department updated.');
      } else {
        await api.post('/departments', {
          name: departmentForm.name.trim(),
          code: departmentForm.code.trim(),
        });
        toast.success('Department created.');
      }
      setDepartmentModal(false);
      await reload();
    } catch (caught) {
      toast.error(caught?.message || 'Unable to save department.');
    } finally {
      setDepartmentSaving(false);
    }
  }

  if (loading) return <Loader label="Loading institute settings…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const institute = data?.institute;
  const departments = data?.departments || [];

  return (
    <div>
      <PageHeader
        eyebrow="Institute administration"
        title="Institute settings"
        description="Configure the institute identity, timezone and academic departments used by all downstream records."
      />

      <div className="stat-grid stat-grid-3">
        <div className="card stat-card">
          <div>
            <div className="stat-label">Departments</div>
            <div className="stat-val">{institute?.department_count ?? departments.length}</div>
            <div className="stat-sub">Academic departments</div>
          </div>
          <div className="stat-icon stat-icon-blue"><Building2 size={22} /></div>
        </div>
        <div className="card stat-card">
          <div>
            <div className="stat-label">Trades</div>
            <div className="stat-val">{institute?.trade_count ?? 0}</div>
            <div className="stat-sub">Vocational programmes</div>
          </div>
          <div className="stat-icon stat-icon-green"><Building2 size={22} /></div>
        </div>
        <div className="card stat-card">
          <div>
            <div className="stat-label">User accounts</div>
            <div className="stat-val">{institute?.user_count ?? 0}</div>
            <div className="stat-sub">Across all roles</div>
          </div>
          <div className="stat-icon stat-icon-violet"><Users size={22} /></div>
        </div>
      </div>

      <div className="settings-grid">
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Institute profile</h2>
              <p>The institute code is displayed across the workspace.</p>
            </div>
          </div>

          <form onSubmit={saveInstitute} className="form-grid form-grid-single">
            <Field label="Institute name" htmlFor="institute-name" required>
              <input
                id="institute-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </Field>
            <Field label="Institute code" htmlFor="institute-code" required>
              <input
                id="institute-code"
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                required
              />
            </Field>
            <Field label="Timezone" htmlFor="institute-timezone">
              <select
                id="institute-timezone"
                value={form.timezone}
                onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
              >
                {TIMEZONES.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
              </select>
            </Field>
            <Field label="Status" htmlFor="institute-status">
              <select
                id="institute-status"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <div className="form-actions">
              <Button type="submit" loading={saving}>
                <Save size={16} />
                Save institute profile
              </Button>
            </div>
          </form>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Departments</h2>
              <p>Departments group related trades and training programmes.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={openDepartmentCreate}>
              <Plus size={15} />
              Add
            </Button>
          </div>

          {departments.length === 0 ? (
            <EmptyState
              title="No departments"
              message="Add the first academic department before creating trades."
              action={<Button size="sm" onClick={openDepartmentCreate}><Plus size={15} />Add department</Button>}
            />
          ) : (
            <div className="stack-list">
              {departments.map((department) => (
                <div key={department.id} className="stack-item">
                  <div className="stack-avatar">{department.code?.slice(0, 2)}</div>
                  <div className="stack-copy">
                    <strong>{department.name}</strong>
                    <span>{department.code} · {department.trade_count} trade{department.trade_count === 1 ? '' : 's'}</span>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => openDepartmentEdit(department)}
                    aria-label={`Edit ${department.name}`}
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={departmentModal}
        title={editingDepartment ? 'Edit department' : 'Add department'}
        onClose={() => setDepartmentModal(false)}
      >
        <form onSubmit={saveDepartment} className="form-grid">
          <Field label="Department name" htmlFor="dept-name" required className="span-2">
            <input
              id="dept-name"
              value={departmentForm.name}
              onChange={(event) => setDepartmentForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Engineering & Technology"
              required
            />
          </Field>
          <Field label="Department code" htmlFor="dept-code" required className="span-2" hint={editingDepartment ? 'Department codes are immutable after creation.' : 'Short unique code, for example ENG-01.'}>
            <input
              id="dept-code"
              value={departmentForm.code}
              onChange={(event) => setDepartmentForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="ENG-01"
              required
              disabled={Boolean(editingDepartment)}
            />
          </Field>
          <div className="form-actions span-2">
            <Button variant="secondary" onClick={() => setDepartmentModal(false)} disabled={departmentSaving}>Cancel</Button>
            <Button type="submit" loading={departmentSaving}>{editingDepartment ? 'Save department' : 'Create department'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
