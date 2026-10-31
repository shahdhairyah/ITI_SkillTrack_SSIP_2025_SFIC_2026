import { useMemo, useState } from 'react';
import { ClipboardList, Eye, Pencil, Plus, Users } from 'lucide-react';
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
import { formatDate, toTitleCase } from '../../lib/format';

const SHIFTS = [
  'Morning (08:30 - 15:30)',
  'Afternoon (12:00 - 19:00)',
  'Evening (15:30 - 20:30)',
];

const EMPTY_FORM = {
  trade_id: '',
  academic_period_id: '',
  name: '',
  section: 'A',
  shift: SHIFTS[0],
  status: 'active',
};

export default function BatchesPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [tradeFilter, setTradeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const { data, loading, error, reload } = useApiResource(async () => {
    const [batches, trades, periods] = await Promise.all([
      api.get('/batches'),
      api.get('/trades'),
      api.get('/academic-periods'),
    ]);
    return { batches, trades, periods };
  }, []);

  const batches = data?.batches || [];
  const trades = data?.trades || [];
  const periods = data?.periods || [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return batches.filter((batch) => {
      const matchesStatus = !status || batch.status === status;
      const matchesTrade = !tradeFilter || String(batch.trade_id) === String(tradeFilter);
      const matchesTerm =
        !term ||
        batch.name?.toLowerCase().includes(term) ||
        batch.section?.toLowerCase().includes(term) ||
        batch.trade_name?.toLowerCase().includes(term) ||
        batch.academic_period_name?.toLowerCase().includes(term);
      return matchesStatus && matchesTrade && matchesTerm;
    });
  }, [batches, search, status, tradeFilter]);

  function openCreate() {
    const activeTrades = trades.filter((trade) => trade.status === 'active');
    const activePeriods = periods.filter((period) => period.status === 'active');
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      trade_id: activeTrades[0]?.id ? String(activeTrades[0].id) : '',
      academic_period_id: activePeriods[0]?.id ? String(activePeriods[0].id) : '',
    });
    setModalOpen(true);
  }

  function openEdit(batch) {
    setEditing(batch);
    setForm({
      trade_id: String(batch.trade_id),
      academic_period_id: String(batch.academic_period_id),
      name: batch.name,
      section: batch.section,
      shift: batch.shift,
      status: batch.status,
    });
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/batches/${editing.id}`, {
          name: form.name.trim(),
          section: form.section.trim(),
          shift: form.shift,
          status: form.status,
        });
        toast.success('Batch updated.');
      } else {
        await api.post('/batches', {
          trade_id: Number(form.trade_id),
          academic_period_id: Number(form.academic_period_id),
          name: form.name.trim(),
          section: form.section.trim(),
          shift: form.shift,
        });
        toast.success('Batch created.');
      }
      setModalOpen(false);
      await reload();
    } catch (caught) {
      toast.error(caught?.message || 'Unable to save batch.');
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(batch) {
    setDetail({ batch, loading: true });
    setDetailLoading(true);
    try {
      const fullBatch = await api.get(`/batches/${batch.id}`);
      setDetail({ batch: fullBatch, loading: false });
    } catch (caught) {
      toast.error(caught?.message || 'Unable to load batch details.');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) return <Loader label="Loading batches…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        eyebrow="Cohort management"
        title="Batches"
        description="Batches bind a trade to an academic period and hold enrolled trainees and assigned instructors."
        actions={
          isAdmin ? (
            <Button onClick={openCreate}>
              <Plus size={16} />
              Create batch
            </Button>
          ) : null
        }
      />

      <div className="toolbar card">
        <div className="toolbar-filters">
          <input
            type="search"
            className="input-search"
            placeholder="Search batches, trades or periods…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={tradeFilter} onChange={(event) => setTradeFilter(event.target.value)}>
            <option value="">All trades</option>
            {trades.map((trade) => <option key={trade.id} value={trade.id}>{trade.name}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <span className="toolbar-count">{filtered.length} of {batches.length} batches</span>
      </div>

      <div className="card table-card">
        {filtered.length === 0 ? (
          <EmptyState
            title={batches.length === 0 ? 'No batches configured' : 'No batches match your filters'}
            message={batches.length === 0 ? 'Create a batch after configuring a trade and academic period.' : 'Try a different search or filter.'}
            action={isAdmin && batches.length === 0 ? <Button onClick={openCreate}><Plus size={15} />Create batch</Button> : null}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Trade</th>
                  <th>Academic period</th>
                  <th>Shift</th>
                  <th>Students</th>
                  <th>Instructors</th>
                  <th>Status</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <div className="cell-primary">
                        <span className="cell-avatar"><ClipboardList size={15} /></span>
                        <div>
                          <strong>{batch.name}</strong>
                          <span className="cell-muted">Section {batch.section}</span>
                        </div>
                      </div>
                    </td>
                    <td>{batch.trade_name}</td>
                    <td>{batch.academic_period_name}</td>
                    <td className="cell-shift">{batch.shift}</td>
                    <td>{batch.student_count}</td>
                    <td>{batch.instructor_count}</td>
                    <td><Badge>{batch.status}</Badge></td>
                    <td className="align-right">
                      <div className="row-actions">
                        <button type="button" className="icon-btn" onClick={() => openDetail(batch)} aria-label={`View ${batch.name}`}>
                          <Eye size={15} />
                        </button>
                        {isAdmin ? (
                          <button type="button" className="icon-btn" onClick={() => openEdit(batch)} aria-label={`Edit ${batch.name}`}>
                            <Pencil size={15} />
                          </button>
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
        title={editing ? 'Edit batch' : 'Create batch'}
        description={editing ? 'Trade and academic period are locked after creation to preserve history.' : 'Batch identity combines trade, period, name and section.'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <Field label="Trade" htmlFor="batch-trade" required className="span-2">
            <select
              id="batch-trade"
              value={form.trade_id}
              onChange={(event) => setForm((current) => ({ ...current, trade_id: event.target.value }))}
              required
              disabled={Boolean(editing)}
            >
              <option value="">Select trade</option>
              {trades.map((trade) => <option key={trade.id} value={trade.id}>{trade.name} ({trade.code})</option>)}
            </select>
          </Field>
          <Field label="Academic period" htmlFor="batch-period" required className="span-2">
            <select
              id="batch-period"
              value={form.academic_period_id}
              onChange={(event) => setForm((current) => ({ ...current, academic_period_id: event.target.value }))}
              required
              disabled={Boolean(editing)}
            >
              <option value="">Select academic period</option>
              {periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
            </select>
          </Field>
          <Field label="Batch name" htmlFor="batch-name" required>
            <input
              id="batch-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="EL-2026"
              required
            />
          </Field>
          <Field label="Section" htmlFor="batch-section" required>
            <input
              id="batch-section"
              value={form.section}
              onChange={(event) => setForm((current) => ({ ...current, section: event.target.value }))}
              placeholder="A"
              maxLength={10}
              required
            />
          </Field>
          <Field label="Shift" htmlFor="batch-shift" className="span-2">
            <select id="batch-shift" value={form.shift} onChange={(event) => setForm((current) => ({ ...current, shift: event.target.value }))}>
              {SHIFTS.map((shift) => <option key={shift} value={shift}>{shift}</option>)}
            </select>
          </Field>
          {editing ? (
            <Field label="Status" htmlFor="batch-status" className="span-2">
              <select id="batch-status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          ) : null}
          <div className="form-actions span-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? 'Save batch' : 'Create batch'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        title={detail?.batch ? `${detail.batch.name} · Section ${detail.batch.section}` : 'Batch details'}
        description={detail?.batch ? `${detail.batch.trade_name} · ${detail.batch.academic_period_name}` : ''}
        onClose={() => setDetail(null)}
        size="lg"
      >
        {detailLoading || detail?.loading ? (
          <Loader label="Loading rosters…" />
        ) : (
          <div className="detail-columns">
            <div>
              <div className="detail-section-title">
                <Users size={16} />
                Enrolled students ({detail?.batch?.students?.length || 0})
              </div>
              {detail?.batch?.students?.length ? (
                <div className="compact-list">
                  {detail.batch.students.map((student) => (
                    <div key={student.student_id} className="compact-row">
                      <div>
                        <strong>{student.name}</strong>
                        <span>{student.admission_no}</span>
                      </div>
                      <Badge>{student.enrollment_status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-text">No active students enrolled.</p>
              )}
            </div>
            <div>
              <div className="detail-section-title">
                <ClipboardList size={16} />
                Assigned instructors ({detail?.batch?.instructors?.length || 0})
              </div>
              {detail?.batch?.instructors?.length ? (
                <div className="compact-list">
                  {detail.batch.instructors.map((instructor) => (
                    <div key={instructor.assignment_id} className="compact-row">
                      <div>
                        <strong>{instructor.name}</strong>
                        <span>{instructor.employee_code} · since {formatDate(instructor.starts_on)}</span>
                      </div>
                      <Badge tone="success">Active</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-text">No instructors currently assigned.</p>
              )}
              <div className="detail-list detail-list-tight">
                <div className="detail-row">
                  <span>Shift</span>
                  <strong>{detail?.batch?.shift}</strong>
                </div>
                <div className="detail-row">
                  <span>Status</span>
                  <Badge>{detail?.batch?.status}</Badge>
                </div>
                <div className="detail-row">
                  <span>Trade</span>
                  <strong>{detail?.batch?.trade_name} ({detail?.batch?.trade_code})</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
