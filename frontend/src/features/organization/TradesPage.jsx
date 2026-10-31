import { useMemo, useState } from 'react';
import { BookOpen, Pencil, Plus, Power } from 'lucide-react';
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

const EMPTY_FORM = {
  name: '',
  code: '',
  nsqf_level: '4',
  duration_years: '2',
  department_id: '',
};

export default function TradesPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { data, loading, error, reload } = useApiResource(async () => {
    const [trades, departments] = await Promise.all([
      api.get('/trades'),
      api.get('/departments'),
    ]);
    return { trades, departments };
  }, []);

  const trades = data?.trades || [];
  const departments = data?.departments || [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return trades.filter((trade) => {
      const matchesStatus = !status || trade.status === status;
      const matchesTerm =
        !term ||
        trade.name?.toLowerCase().includes(term) ||
        trade.code?.toLowerCase().includes(term) ||
        trade.department_name?.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [trades, search, status]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, department_id: departments[0]?.id ? String(departments[0].id) : '' });
    setModalOpen(true);
  }

  function openEdit(trade) {
    setEditing(trade);
    setForm({
      name: trade.name,
      code: trade.code,
      nsqf_level: String(trade.nsqf_level ?? 4),
      duration_years: String(trade.duration_years ?? 2),
      department_id: trade.department_id ? String(trade.department_id) : '',
    });
    setModalOpen(true);
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        nsqf_level: Number(form.nsqf_level),
        duration_years: Number(form.duration_years),
        department_id: form.department_id ? Number(form.department_id) : null,
      };
      if (editing) {
        await api.put(`/trades/${editing.id}`, {
          name: payload.name,
          nsqf_level: payload.nsqf_level,
          duration_years: payload.duration_years,
          status: editing.status,
        });
        toast.success('Trade updated successfully.');
      } else {
        await api.post('/trades', payload);
        toast.success('Trade created successfully.');
      }
      setModalOpen(false);
      await reload();
    } catch (caught) {
      toast.error(caught?.message || 'Unable to save trade.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    const nextStatus = confirmTarget.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/trades/${confirmTarget.id}`, { status: nextStatus });
      toast.success(`Trade marked ${nextStatus}.`);
      setConfirmTarget(null);
      await reload();
    } catch (caught) {
      toast.error(caught?.message || 'Unable to update trade status.');
    } finally {
      setConfirmLoading(false);
    }
  }

  if (loading) return <Loader label="Loading trade catalogue…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        eyebrow="Organization master data"
        title="Trades & departments"
        description="Trades define the vocational programmes offered by the institute and roll up under departments."
        actions={
          isAdmin ? (
            <Button onClick={openCreate}>
              <Plus size={16} />
              Add trade
            </Button>
          ) : null
        }
      />

      <div className="toolbar card">
        <div className="toolbar-filters">
          <input
            type="search"
            className="input-search"
            placeholder="Search trades by name, code or department…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <span className="toolbar-count">{filtered.length} of {trades.length} trades</span>
      </div>

      <div className="card table-card">
        {filtered.length === 0 ? (
          <EmptyState
            title={trades.length === 0 ? 'No trades configured' : 'No trades match your filters'}
            message={trades.length === 0 ? 'Define departments and add the first trade offering.' : 'Try a different search term or status.'}
            action={isAdmin && trades.length === 0 ? <Button onClick={openCreate}><Plus size={15} />Add trade</Button> : null}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trade</th>
                  <th>Department</th>
                  <th>NSQF</th>
                  <th>Duration</th>
                  <th>Batches</th>
                  <th>Status</th>
                  {isAdmin ? <th className="align-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((trade) => (
                  <tr key={trade.id}>
                    <td>
                      <div className="cell-primary">
                        <span className="cell-avatar"><BookOpen size={15} /></span>
                        <div>
                          <strong>{trade.name}</strong>
                          <span className="cell-muted">{trade.code}</span>
                        </div>
                      </div>
                    </td>
                    <td>{trade.department_name || <span className="cell-muted">Unassigned</span>}</td>
                    <td>Level {trade.nsqf_level}</td>
                    <td>{trade.duration_years} year{trade.duration_years === 1 ? '' : 's'}</td>
                    <td>{trade.batch_count}</td>
                    <td><Badge>{trade.status}</Badge></td>
                    {isAdmin ? (
                      <td className="align-right">
                        <div className="row-actions">
                          <button type="button" className="icon-btn" onClick={() => openEdit(trade)} aria-label={`Edit ${trade.name}`}>
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setConfirmTarget(trade)}
                            aria-label={`${trade.status === 'active' ? 'Deactivate' : 'Activate'} ${trade.name}`}
                          >
                            <Power size={15} />
                          </button>
                        </div>
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
        title={editing ? 'Edit trade' : 'Add trade'}
        description={editing ? 'Update the trade details. Codes cannot be changed after creation.' : 'Create a vocational trade offering under a department.'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <Field label="Trade name" htmlFor="trade-name" required className="span-2">
            <input id="trade-name" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Electrician" required />
          </Field>
          <Field label="Trade code" htmlFor="trade-code" required>
            <input id="trade-code" value={form.code} onChange={(event) => updateField('code', event.target.value)} placeholder="ELE-01" required disabled={Boolean(editing)} />
          </Field>
          <Field label="Department" htmlFor="trade-dept">
            <select id="trade-dept" value={form.department_id} onChange={(event) => updateField('department_id', event.target.value)}>
              <option value="">Unassigned</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name} ({department.code})</option>
              ))}
            </select>
          </Field>
          <Field label="NSQF level" htmlFor="trade-nsqf">
            <select id="trade-nsqf" value={form.nsqf_level} onChange={(event) => updateField('nsqf_level', event.target.value)}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => <option key={level} value={level}>Level {level}</option>)}
            </select>
          </Field>
          <Field label="Duration (years)" htmlFor="trade-duration">
            <select id="trade-duration" value={form.duration_years} onChange={(event) => updateField('duration_years', event.target.value)}>
              {[1, 2, 3, 4].map((years) => <option key={years} value={years}>{years} year{years === 1 ? '' : 's'}</option>)}
            </select>
          </Field>
          <div className="form-actions span-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? 'Save changes' : 'Create trade'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={`${confirmTarget?.status === 'active' ? 'Deactivate' : 'Activate'} trade?`}
        message={
          confirmTarget?.status === 'active'
            ? `Deactivating ${confirmTarget?.name} hides it from new batch setup. Existing batches and history are preserved.`
            : `Reactivate ${confirmTarget?.name} so it can be used in new batch setup.`
        }
        confirmLabel={confirmTarget?.status === 'active' ? 'Deactivate trade' : 'Activate trade'}
        variant={confirmTarget?.status === 'active' ? 'danger' : 'primary'}
        loading={confirmLoading}
        onConfirm={toggleStatus}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}
