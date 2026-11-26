import { useState } from 'react';
import { CalendarDays, Pencil, Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { useApiResource } from '../../hooks/useApiResource';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Field from '../../components/common/Field';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../lib/format';

const EMPTY_FORM = { name: '', starts_on: '', ends_on: '', status: 'active' };

export default function AcademicPeriodsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useApiResource(() => api.get('/academic-periods'), []);
  const periods = data || [];

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(period) {
    setEditing(period);
    setForm({
      name: period.name,
      starts_on: period.starts_on,
      ends_on: period.ends_on,
      status: period.status,
    });
    setModalOpen(true);
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.ends_on < form.starts_on) {
      toast.error('End date cannot be before the start date.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/academic-periods/${editing.id}`, form);
        toast.success('Academic period updated.');
      } else {
        await api.post('/academic-periods', form);
        toast.success('Academic period created.');
      }
      setModalOpen(false);
      await reload();
    } catch (caught) {
      toast.error(caught?.message || 'Unable to save academic period.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader label="Loading academic periods…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        eyebrow="Academic calendar"
        title="Academic periods"
        description="Academic periods bound the session dates used by batches, enrollment history and future attendance."
        actions={
          isAdmin ? (
            <Button onClick={openCreate}>
              <Plus size={16} />
              Add period
            </Button>
          ) : null
        }
      />

      <div className="card table-card">
        {periods.length === 0 ? (
          <EmptyState
            title="No academic periods"
            message="Create a session period before configuring batches."
            action={isAdmin ? <Button onClick={openCreate}><Plus size={15} />Add period</Button> : null}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Academic period</th>
                  <th>Starts</th>
                  <th>Ends</th>
                  <th>Batches</th>
                  <th>Status</th>
                  {isAdmin ? <th className="align-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.id}>
                    <td>
                      <div className="cell-primary">
                        <span className="cell-avatar"><CalendarDays size={15} /></span>
                        <div>
                          <strong>{period.name}</strong>
                          <span className="cell-muted">Session #{period.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>{formatDate(period.starts_on)}</td>
                    <td>{formatDate(period.ends_on)}</td>
                    <td>{period.batch_count}</td>
                    <td><Badge>{period.status}</Badge></td>
                    {isAdmin ? (
                      <td className="align-right">
                        <button type="button" className="icon-btn" onClick={() => openEdit(period)} aria-label={`Edit ${period.name}`}>
                          <Pencil size={15} />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit academic period' : 'Add academic period'}
        description="Periods should not overlap for the same intake in production scheduling."
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <Field label="Period name" htmlFor="period-name" required className="span-2">
            <input
              id="period-name"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="2026–2027 Academic Session"
              required
            />
          </Field>
          <Field label="Start date" htmlFor="period-start" required>
            <input id="period-start" type="date" value={form.starts_on} onChange={(event) => updateField('starts_on', event.target.value)} required />
          </Field>
          <Field label="End date" htmlFor="period-end" required>
            <input id="period-end" type="date" value={form.ends_on} onChange={(event) => updateField('ends_on', event.target.value)} required />
          </Field>
          {editing ? (
            <Field label="Status" htmlFor="period-status" className="span-2">
              <select id="period-status" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          ) : null}
          <div className="form-actions span-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? 'Save period' : 'Create period'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
