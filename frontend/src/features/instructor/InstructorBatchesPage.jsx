import { useEffect, useState } from 'react';
import { ClipboardList, GraduationCap, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useApiResource } from '../../hooks/useApiResource';
import PageHeader from '../../components/common/PageHeader';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import { formatDate, toTitleCase } from '../../lib/format';

export default function InstructorBatchesPage() {
  const { data, loading, error, reload } = useApiResource(() => api.get('/batches'), []);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const batches = data || [];

  useEffect(() => {
    if (!selectedId && batches.length > 0) {
      setSelectedId(batches[0].id);
    }
  }, [batches, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    api
      .get(`/batches/${selectedId}`)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch(() => {
        if (active) setDetail(null);
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  if (loading) return <Loader label="Loading your batches…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        eyebrow="Instructor workspace"
        title="My batches"
        description="Only batches with an active assignment to your account are visible. Student records are scoped to these batches."
      />

      {batches.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No batches assigned"
            message="Your institute administrator must assign you to a batch before student records become visible."
          />
        </div>
      ) : (
        <div className="batch-workspace">
          <div className="card batch-list-panel">
            <div className="section-heading">
              <div>
                <h2>Assigned batches</h2>
                <p>{batches.length} active assignment{batches.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            <div className="batch-select-list">
              {batches.map((batch) => (
                <button
                  key={batch.id}
                  type="button"
                  className={`batch-select-item ${selectedId === batch.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(batch.id)}
                >
                  <span className="batch-select-icon"><ClipboardList size={18} /></span>
                  <span className="batch-select-copy">
                    <strong>{batch.name} · Section {batch.section}</strong>
                    <span>{batch.trade_name} · {batch.academic_period_name}</span>
                    <span className="batch-select-meta">{batch.student_count} students · {toTitleCase(batch.shift)}</span>
                  </span>
                  <Badge>{batch.status}</Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="card batch-detail-panel">
            {detailLoading ? (
              <Loader label="Loading batch roster…" />
            ) : detail ? (
              <>
                <div className="section-heading">
                  <div>
                    <h2>{detail.name} · Section {detail.section}</h2>
                    <p>{detail.trade_name} ({detail.trade_code}) · {detail.academic_period_name}</p>
                  </div>
                  <Badge>{detail.status}</Badge>
                </div>

                <div className="batch-meta-grid">
                  <div>
                    <span className="stat-label">Students</span>
                    <strong>{detail.students?.length || 0}</strong>
                  </div>
                  <div>
                    <span className="stat-label">Instructors</span>
                    <strong>{detail.instructors?.length || 0}</strong>
                  </div>
                  <div>
                    <span className="stat-label">Shift</span>
                    <strong className="batch-shift-text">{detail.shift}</strong>
                  </div>
                </div>

                <div className="detail-section-title"><GraduationCap size={16} />Batch roster</div>
                {detail.students?.length ? (
                  <div className="table-wrap">
                    <table className="data-table data-table-compact">
                      <thead>
                        <tr>
                          <th>Admission no</th>
                          <th>Student</th>
                          <th>Enrolled since</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.students.map((student) => (
                          <tr key={student.student_id}>
                            <td className="cell-mono">{student.admission_no}</td>
                            <td>
                              <strong>{student.name}</strong>
                              <span className="cell-muted cell-block">{student.phone || 'No phone'}</span>
                            </td>
                            <td>{formatDate(student.starts_on)}</td>
                            <td><Badge>{student.enrollment_status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState title="No students" message="No active enrollments in this batch." />
                )}

                <div className="detail-section-title detail-section-spaced"><Users size={16} />Co-instructors</div>
                {detail.instructors?.length ? (
                  <div className="compact-list">
                    {detail.instructors.map((instructor) => (
                      <div key={instructor.assignment_id} className="compact-row">
                        <div>
                          <strong>{instructor.name}</strong>
                          <span>{instructor.employee_code} · {instructor.qualification || 'Instructor'}</span>
                        </div>
                        <span className="cell-muted">since {formatDate(instructor.starts_on)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted-text">No instructors currently assigned.</p>
                )}
              </>
            ) : (
              <EmptyState title="Select a batch" message="Choose one of your assigned batches to view its roster." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
