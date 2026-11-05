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
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  User,
  BookOpen,
  Calendar,
  FileCheck,
  RotateCcw
} from 'lucide-react';

export default function RemedialSupportPage() {
  const { user, isInstructor, isAdmin } = useAuth();
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState('');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRemedial, setSelectedRemedial] = useState(null);
  const [reviewForm, setReviewForm] = useState({ outcome: 'Satisfactorily Completed and Demonstrated in Workshop', notes: '', status: 'completed' });
  const [submitting, setSubmitting] = useState(false);

  // New remedial modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    student_id: '',
    activity_id: '',
    reason: '',
    instructions: '',
    due_on: ''
  });

  const { data, loading, error, reload } = useApiResource(async () => {
    const url = statusFilter ? `/remedials?status=${statusFilter}` : '/remedials';
    const [remedials, students, curriculum] = await Promise.all([
      api.get(url),
      api.get('/students').catch(() => []),
      api.get('/curriculum').catch(() => [])
    ]);

    // Flatten activities from curriculum
    const allActivities = [];
    (curriculum || []).forEach((m) => {
      (m.activities || []).forEach((a) => allActivities.push(a));
    });

    return { remedials: remedials || [], students: students || [], activities: allActivities };
  }, [statusFilter]);

  if (loading) return <Loader label="Loading remedial support tasks and reviews…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const remedials = data?.remedials || [];
  const students = data?.students || [];
  const activities = data?.activities || [];

  function openReview(rem) {
    setSelectedRemedial(rem);
    setReviewForm({
      outcome: 'Satisfactorily Demonstrated in Practical Workshop',
      notes: '',
      status: 'completed'
    });
    setReviewModalOpen(true);
  }

  async function handleReviewSubmit(e) {
    e.preventDefault();
    if (!selectedRemedial) return;
    setSubmitting(true);
    try {
      await api.post(`/remedials/${selectedRemedial.id}/review`, reviewForm);
      toast.show({ type: 'success', message: 'Remedial review and resolution recorded.' });
      setReviewModalOpen(false);
      reload();
    } catch (err) {
      toast.show({ type: 'error', message: err.message || 'Failed to review remedial.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/remedials', assignForm);
      toast.show({ type: 'success', message: 'Remedial training assigned to student.' });
      setAssignModalOpen(false);
      reload();
    } catch (err) {
      toast.show({ type: 'error', message: err.message || 'Failed to assign remedial.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Remedial Support & Follow-Up Tasks"
        description="Phase 5 — Track personalized remedial practice, safety gap remediation, and instructor reviews (DEC-05 / REM-01)"
        badge="Phase 5 Remedial"
        actions={
          (isInstructor || isAdmin) && (
            <Button variant="primary" icon={Plus} onClick={() => setAssignModalOpen(true)}>
              Assign Remedial Task
            </Button>
          )
        }
      />

      {/* Filter Toolbar */}
      <div className="card toolbar-card mb-6" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Filter Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select"
          style={{ maxWidth: '220px', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
        >
          <option value="">All Remedials</option>
          <option value="assigned">Pending (Assigned)</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed / Resolved</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {remedials.length === 0 ? (
        <EmptyState
          title="No Remedial Tasks Found"
          description="All trainees are currently meeting practical competencies without open remedial requirements."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {remedials.map((rem) => {
            const isCompleted = rem.status === 'completed';
            const isPending = rem.status === 'assigned' || rem.status === 'in_progress';

            return (
              <div
                key={rem.id}
                className="card"
                style={{
                  borderLeft: isCompleted ? '4px solid #10b981' : rem.is_overdue ? '4px solid #ef4444' : '4px solid #f59e0b',
                  padding: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <Badge variant={isCompleted ? 'success' : rem.is_overdue ? 'danger' : 'warning'}>
                        {rem.status.toUpperCase()}
                      </Badge>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {rem.student_name} ({rem.admission_no})
                      </span>
                      {rem.batch_name && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>· {rem.batch_name}</span>
                      )}
                    </div>
                    <h3 style={{ margin: '0.25rem 0', fontSize: '1.05rem', fontWeight: 600 }}>
                      {rem.activity_code} — {rem.activity_title}
                    </h3>
                  </div>

                  {(isInstructor || isAdmin) && isPending && (
                    <Button variant="secondary" size="sm" icon={FileCheck} onClick={() => openReview(rem)}>
                      Review & Resolve
                    </Button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', backgroundColor: 'var(--bg-subtle, #f8fafc)', padding: '0.85rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  <div>
                    <strong style={{ color: '#b91c1c' }}>Reason / Skill Gap:</strong>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>{rem.reason}</p>
                  </div>
                  <div>
                    <strong>Instructions / Prescribed Practice:</strong>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>{rem.instructions}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  <div>
                    Assigned by: <strong>{rem.assigned_by_name}</strong> · Target Due Date:{' '}
                    <strong style={{ color: rem.is_overdue ? '#b91c1c' : 'inherit' }}>
                      {rem.due_on || 'No deadline'} {rem.is_overdue && '(OVERDUE)'}
                    </strong>
                  </div>

                  {rem.reviews && rem.reviews.length > 0 && (
                    <div style={{ color: '#065f46', fontWeight: 500 }}>
                      Latest Review: {rem.reviews[0].outcome} (by {rem.reviews[0].reviewer_name})
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && selectedRemedial && (
        <Modal
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title={`Remedial Review: ${selectedRemedial.student_name}`}
        >
          <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '0.85rem', padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px' }}>
              <strong>Activity:</strong> {selectedRemedial.activity_code} — {selectedRemedial.activity_title}
              <br />
              <strong>Identified Gap:</strong> {selectedRemedial.reason}
            </div>

            <Field label="Resolution Outcome" required>
              <input
                type="text"
                required
                value={reviewForm.outcome}
                onChange={(e) => setReviewForm({ ...reviewForm, outcome: e.target.value })}
                className="form-input"
                placeholder="e.g. Demonstrated satisfactory safety compliance and clean jointing."
              />
            </Field>

            <Field label="Evaluation Status">
              <select
                value={reviewForm.status}
                onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
                className="form-select"
              >
                <option value="completed">Completed / Resolved (Practice Met Standards)</option>
                <option value="in_progress">Keep In Progress (Needs Additional Time)</option>
                <option value="cancelled">Cancel / Waive Remedial</option>
              </select>
            </Field>

            <Field label="Detailed Review Notes">
              <textarea
                rows={3}
                value={reviewForm.notes}
                onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                className="form-input"
                placeholder="Specific trainee improvements observed during review workshop..."
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button variant="ghost" type="button" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={submitting}>
                Save Review
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assign Remedial Modal */}
      {assignModalOpen && (
        <Modal
          open={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title="Assign Remedial Practical Practice"
        >
          <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Field label="Select Student Trainee" required>
              <select
                required
                value={assignForm.student_id}
                onChange={(e) => setAssignForm({ ...assignForm, student_id: e.target.value })}
                className="form-select"
              >
                <option value="">Select student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.admission_no})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Practical Activity" required>
              <select
                required
                value={assignForm.activity_id}
                onChange={(e) => setAssignForm({ ...assignForm, activity_id: e.target.value })}
                className="form-select"
              >
                <option value="">Select practical activity...</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Identified Competency / Safety Gap" required>
              <textarea
                required
                rows={2}
                value={assignForm.reason}
                onChange={(e) => setAssignForm({ ...assignForm, reason: e.target.value })}
                className="form-input"
                placeholder="e.g. Scored 2/5 on safety goggles adherence during cutting."
              />
            </Field>

            <Field label="Prescribed Remedial Practice Instructions" required>
              <textarea
                required
                rows={2}
                value={assignForm.instructions}
                onChange={(e) => setAssignForm({ ...assignForm, instructions: e.target.value })}
                className="form-input"
                placeholder="e.g. Re-demonstrate 5 practice terminations under instructor observation."
              />
            </Field>

            <Field label="Target Due Date">
              <input
                type="date"
                value={assignForm.due_on}
                onChange={(e) => setAssignForm({ ...assignForm, due_on: e.target.value })}
                className="form-input"
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button variant="ghost" type="button" onClick={() => setAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={submitting}>
                Assign Remedial
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
