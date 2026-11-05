import { useState } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { api } from '../../lib/api';
import { useApiResource } from '../../hooks/useApiResource';
import PageHeader from '../../components/common/PageHeader';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileText,
  Activity,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '../../lib/format';

export default function StudentSkillsPage() {
  const { user } = useAuth();
  const studentId = user?.profile?.student_id;

  const [selectedAttempt, setSelectedAttempt] = useState(null);

  const { data, loading, error, reload } = useApiResource(async () => {
    if (!studentId) return null;
    return await api.get(`/students/${studentId}/competency`);
  }, [studentId]);

  if (loading) return <Loader label="Loading your practical skills progress…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Student profile not linked" />;

  const student = data?.student;
  const summary = data?.summary;
  const activities = data?.activities || [];
  const attempts = data?.attempts || [];
  const remedials = data?.remedials || [];

  return (
    <div className="page-shell">
      <PageHeader
        title="My Practical Skills & Competencies"
        description="Phase 4 & 5 — Your verified trade competencies, workshop practical attempts, and remedial tasks"
        badge="Phase 4 & 5 Portfolio"
      />

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Competencies Mastered</span>
          <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', color: '#10b981' }}>
            {summary?.competent_count} / {summary?.total_activities}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            {summary?.completion_percentage}% of trade syllabus
          </span>
        </div>

        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #2563eb' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Practicals Evaluated</span>
          <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', color: '#2563eb' }}>
            {summary?.assessed_count}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Across all modules</span>
        </div>

        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Remedials</span>
          <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', color: '#f59e0b' }}>
            {summary?.active_remedials_count}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Follow-up practice tasks</span>
        </div>
      </div>

      {/* Active Remedial Alerts */}
      {remedials.filter((r) => r.status === 'assigned' || r.status === 'in_progress').length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309' }}>
            <AlertTriangle size={18} /> Assigned Remedial Follow-Ups
          </h4>
          {remedials
            .filter((r) => r.status === 'assigned' || r.status === 'in_progress')
            .map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#92400e' }}>
                    {r.activity_code} — {r.activity_title}
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#78350f', marginTop: '0.25rem' }}>
                    <strong>Prescribed Practice:</strong> {r.instructions}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge variant="warning">{r.status.toUpperCase()}</Badge>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '0.25rem' }}>
                    Due: {r.due_on || 'By next lab'}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Practical Activities & Status List */}
      <div className="card mb-6" style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Practical Curriculum Progression</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {student?.trade_name} ({student?.trade_code})
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {activities.map((act) => {
            const attempt = attempts.find((a) => a.activity_id === act.id);
            const isCompetent = attempt?.derived_status === 'competent';
            const isNP = attempt?.derived_status === 'needs_practice';

            return (
              <div
                key={act.id}
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: isCompetent ? '#f0fdf4' : 'inherit'
                }}
              >
                <div style={{ maxWidth: '65%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Badge variant={isCompetent ? 'success' : isNP ? 'warning' : 'neutral'}>
                      {act.code}
                    </Badge>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{act.module_title}</span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{act.title}</h4>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {act.instructions}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {isCompetent && (
                    <div style={{ textAlign: 'right' }}>
                      <Badge variant="success" icon={CheckCircle2}>
                        COMPETENT ({attempt.percentage}%)
                      </Badge>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                        Evaluated {formatDate(attempt.assessed_at)}
                      </div>
                    </div>
                  )}

                  {isNP && (
                    <div style={{ textAlign: 'right' }}>
                      <Badge variant="warning" icon={AlertTriangle}>
                        NEEDS PRACTICE ({attempt.percentage}%)
                      </Badge>
                      <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.2rem' }}>
                        Remedial Assigned
                      </div>
                    </div>
                  )}

                  {!attempt && (
                    <Badge variant="neutral">NOT ATTEMPTED</Badge>
                  )}

                  {attempt && (
                    <Button size="sm" variant="ghost" onClick={() => setSelectedAttempt(attempt)}>
                      View Rubric &rarr;
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attempt / Assessment Breakdown Modal */}
      {selectedAttempt && (
        <Modal
          open={!!selectedAttempt}
          onClose={() => setSelectedAttempt(null)}
          title={`Practical Evaluation Details — Attempt #${selectedAttempt.attempt_no}`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Score:</strong> {selectedAttempt.total_score} / {selectedAttempt.max_possible} ({selectedAttempt.percentage}%)
                </div>
                <div>
                  <Badge variant={selectedAttempt.derived_status === 'competent' ? 'success' : 'warning'}>
                    {selectedAttempt.derived_status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              {selectedAttempt.feedback && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Instructor Feedback:</strong> {selectedAttempt.feedback}
                </div>
              )}
            </div>

            <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>Criterion-Level Rubric Breakdown</h4>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)' }}>
                    <th>Criterion</th>
                    <th>Score Awarded</th>
                    <th>Type</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAttempt.criterion_results?.map((cr) => (
                    <tr key={cr.id}>
                      <td>
                        <strong>{cr.criteria_code}</strong>: {cr.criteria_desc}
                      </td>
                      <td style={{ fontWeight: 600 }}>{cr.result_value} / 5</td>
                      <td>
                        {cr.is_safety_critical ? (
                          <Badge variant="danger">Safety Mandatory (&ge; 4)</Badge>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)' }}>Standard</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{cr.comment || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button onClick={() => setSelectedAttempt(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
