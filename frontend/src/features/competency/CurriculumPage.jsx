import { useState } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { api } from '../../lib/api';
import { useApiResource } from '../../hooks/useApiResource';
import PageHeader from '../../components/common/PageHeader';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import Button from '../../components/common/Button';
import {
  BookOpen,
  Plus,
  Edit2,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Award
} from 'lucide-react';

export default function CurriculumPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [selectedTradeId, setSelectedTradeId] = useState('');
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Modals
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [moduleForm, setModuleForm] = useState({ code: '', title: '', sequence_no: 1 });

  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [activityForm, setActivityForm] = useState({
    code: '',
    title: '',
    instructions: '',
    criteria: [
      { code: '', description: '', is_safety_critical: false, max_points: 5, weight: 25 },
      { code: '', description: '', is_safety_critical: true, max_points: 5, weight: 25 }
    ]
  });

  const { data, loading, error, reload } = useApiResource(async () => {
    const [trades, curriculum] = await Promise.all([
      api.get('/trades'),
      api.get(selectedTradeId ? `/curriculum?trade_id=${selectedTradeId}` : '/curriculum')
    ]);
    return { trades: trades || [], curriculum: curriculum || [] };
  }, [selectedTradeId]);

  if (loading) return <Loader label="Loading curriculum and competency catalogue…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const trades = data?.trades || [];
  const curriculum = data?.curriculum || [];

  function openNewModule() {
    setEditingModule(null);
    setModuleForm({ code: '', title: '', sequence_no: curriculum.length + 1 });
    setModuleModalOpen(true);
  }

  function openEditModule(mod) {
    setEditingModule(mod);
    setModuleForm({ code: mod.code, title: mod.title, sequence_no: mod.sequence_no });
    setModuleModalOpen(true);
  }

  async function handleSaveModule(e) {
    e.preventDefault();
    try {
      if (editingModule) {
        await api.put(`/modules/${editingModule.id}`, { ...moduleForm, trade_id: selectedTradeId || trades[0]?.id });
        toast.show({ type: 'success', message: 'Module updated successfully.' });
      } else {
        await api.post('/modules', { ...moduleForm, trade_id: selectedTradeId || trades[0]?.id });
        toast.show({ type: 'success', message: 'Module added to curriculum.' });
      }
      setModuleModalOpen(false);
      reload();
    } catch (err) {
      toast.show({ type: 'error', message: err.message || 'Failed to save module.' });
    }
  }

  function openNewActivity(mod) {
    setSelectedModule(mod);
    setEditingActivity(null);
    setActivityForm({
      code: `${mod.code.replace('MOD', 'ACT')}-01`,
      title: '',
      instructions: '',
      criteria: [
        { code: 'CRIT-1', description: 'Mandatory PPE and safety inspection', is_safety_critical: true, max_points: 5, weight: 25 },
        { code: 'CRIT-2', description: 'Correct tool selection and wiring technique', is_safety_critical: false, max_points: 5, weight: 25 }
      ]
    });
    setActivityModalOpen(true);
  }

  function addCriterionRow() {
    setActivityForm({
      ...activityForm,
      criteria: [
        ...activityForm.criteria,
        { code: `CRIT-${activityForm.criteria.length + 1}`, description: '', is_safety_critical: false, max_points: 5, weight: 25 }
      ]
    });
  }

  function updateCriterion(index, field, value) {
    const updated = [...activityForm.criteria];
    updated[index][field] = value;
    setActivityForm({ ...activityForm, criteria: updated });
  }

  function removeCriterion(index) {
    const updated = activityForm.criteria.filter((_, i) => i !== index);
    setActivityForm({ ...activityForm, criteria: updated });
  }

  async function handleSaveActivity(e) {
    e.preventDefault();
    try {
      await api.post('/activities', {
        ...activityForm,
        module_id: selectedModule.id
      });
      toast.show({ type: 'success', message: 'Practical activity and rubric saved successfully.' });
      setActivityModalOpen(false);
      reload();
    } catch (err) {
      toast.show({ type: 'error', message: err.message || 'Failed to save practical activity.' });
    }
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Curriculum & Practical Rubrics"
        description="Phase 4 — Manage vocational trade modules, hands-on practical activities, and criteria rubrics"
        badge="Phase 4 Competency"
        actions={
          isAdmin && (
            <Button variant="primary" icon={Plus} onClick={openNewModule}>
              Add Module
            </Button>
          )
        }
      />

      {/* Filter Toolbar */}
      <div className="card toolbar-card mb-6" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Filter Trade:</label>
        <select
          value={selectedTradeId}
          onChange={(e) => setSelectedTradeId(e.target.value)}
          className="form-select"
          style={{ maxWidth: '280px', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
        >
          <option value="">All Configured Trades</option>
          {trades.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.code})
            </option>
          ))}
        </select>
      </div>

      {curriculum.length === 0 ? (
        <EmptyState
          title="No Curriculum Modules Found"
          description="Create training modules to configure practical activities and evaluation rubrics."
          action={isAdmin && <Button onClick={openNewModule}>Add Module</Button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {curriculum.map((mod) => (
            <div key={mod.id} className="card" style={{ borderLeft: '4px solid var(--brand-primary, #2563eb)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Badge variant="neutral">{mod.code}</Badge>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Seq #{mod.sequence_no} · {mod.trade_name}</span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>{mod.title}</h3>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {isAdmin && (
                    <>
                      <Button size="sm" variant="ghost" icon={Edit2} onClick={() => openEditModule(mod)}>
                        Edit Module
                      </Button>
                      <Button size="sm" variant="secondary" icon={Plus} onClick={() => openNewActivity(mod)}>
                        Add Practical
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Module Activities list */}
              {(!mod.activities || mod.activities.length === 0) ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', fontStyle: 'italic', margin: '0.5rem 0' }}>
                  No practical activities added to this module yet.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                  {mod.activities.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-subtle, #f8fafc)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <Badge variant="info">{act.code}</Badge>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={13} /> 120 mins
                          </span>
                        </div>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 600 }}>{act.title}</h4>
                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.825rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {act.instructions}
                        </p>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          <strong>{act.criteria_count || 4}</strong> rubric criteria
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const detail = await api.get(`/activities/${act.id}`);
                            setSelectedActivity(detail);
                          }}
                        >
                          View Rubric &rarr;
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Module Add/Edit Modal */}
      <Modal
        open={moduleModalOpen}
        onClose={() => setModuleModalOpen(false)}
        title={editingModule ? 'Edit Curriculum Module' : 'Add Curriculum Module'}
      >
        <form onSubmit={handleSaveModule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="Module Code (e.g. MOD-ELE-04)" required>
            <input
              type="text"
              required
              value={moduleForm.code}
              onChange={(e) => setModuleForm({ ...moduleForm, code: e.target.value })}
              className="form-input"
              placeholder="MOD-ELE-04"
            />
          </Field>
          <Field label="Module Title" required>
            <input
              type="text"
              required
              value={moduleForm.title}
              onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
              className="form-input"
              placeholder="Transformers and Single Phase AC"
            />
          </Field>
          <Field label="Sequence Number" required>
            <input
              type="number"
              required
              min="1"
              value={moduleForm.sequence_no}
              onChange={(e) => setModuleForm({ ...moduleForm, sequence_no: parseInt(e.target.value) || 1 })}
              className="form-input"
            />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setModuleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Module
            </Button>
          </div>
        </form>
      </Modal>

      {/* Activity Add Modal */}
      <Modal
        open={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        title={`Add Practical Activity to ${selectedModule?.code}`}
        size="lg"
      >
        <form onSubmit={handleSaveActivity} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="Activity Code" required>
            <input
              type="text"
              required
              value={activityForm.code}
              onChange={(e) => setActivityForm({ ...activityForm, code: e.target.value })}
              className="form-input"
              placeholder="ACT-ELE-103"
            />
          </Field>
          <Field label="Activity Title" required>
            <input
              type="text"
              required
              value={activityForm.title}
              onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
              className="form-input"
              placeholder="Measurement of Single-Phase Power with Wattmeter"
            />
          </Field>
          <Field label="Workshop Instructions & SOP" required>
            <textarea
              required
              rows={3}
              value={activityForm.instructions}
              onChange={(e) => setActivityForm({ ...activityForm, instructions: e.target.value })}
              className="form-input"
              placeholder="Detailed steps, safety warnings, and testing protocol for trainees..."
            />
          </Field>

          {/* Rubric criteria builder */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Competency Rubric Criteria (0 - 5 Scale)</label>
              <Button size="sm" variant="secondary" type="button" onClick={addCriterionRow}>
                + Add Criterion
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activityForm.criteria.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 140px 40px',
                    gap: '0.5rem',
                    alignItems: 'center',
                    padding: '0.5rem',
                    backgroundColor: 'var(--bg-subtle, #f8fafc)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <input
                    type="text"
                    required
                    placeholder="CRIT-1"
                    value={c.code}
                    onChange={(e) => updateCriterion(i, 'code', e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Criterion description / standard"
                    value={c.description}
                    onChange={(e) => updateCriterion(i, 'description', e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                  <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={c.is_safety_critical}
                      onChange={(e) => updateCriterion(i, 'is_safety_critical', e.target.checked)}
                    />
                    Safety-Critical
                  </label>
                  <button
                    type="button"
                    onClick={() => removeCriterion(i)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-danger, #ef4444)', cursor: 'pointer', fontWeight: 'bold' }}
                    title="Remove"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setActivityModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Activity & Rubric
            </Button>
          </div>
        </form>
      </Modal>

      {/* Activity Details & Rubric Viewer Modal */}
      {selectedActivity && (
        <Modal
          open={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
          title={`${selectedActivity.code} — ${selectedActivity.title}`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Module: {selectedActivity.module_title}</span>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                <strong>Instructions:</strong> {selectedActivity.instructions}
              </p>
            </div>

            <div>
              <h4 style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>Authoritative Competency Rubric (DEC-05)</h4>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-subtle)' }}>
                      <th>Code</th>
                      <th>Criterion Description</th>
                      <th>Max Score</th>
                      <th>Safety Gate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedActivity.criteria?.map((cr) => (
                      <tr key={cr.id}>
                        <td><strong>{cr.code}</strong></td>
                        <td>{cr.description}</td>
                        <td>{cr.max_points} pts</td>
                        <td>
                          {cr.is_safety_critical ? (
                            <Badge variant="danger" icon={AlertTriangle}>
                              Mandatory &ge; 4/5
                            </Badge>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)' }}>Standard (0-5)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ backgroundColor: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.8rem', color: '#1e40af' }}>
              <strong>DEC-05 Completion Invariant:</strong> Trainee is marked <em>Competent</em> only when all mandatory safety criteria achieve &ge; 4/5 points AND total percentage achieves &ge; 75%.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button onClick={() => setSelectedActivity(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
