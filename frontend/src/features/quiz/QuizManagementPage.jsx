import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Plus,
  PlusCircle,
  Trash2,
  Users,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../app/providers/ToastProvider';
import { formatDateTime } from '../../lib/format';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';

function createEmptyQuestion() {
  return {
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'A',
    marks: 1,
  };
}

export default function QuizManagementPage() {
  const { showToast } = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showBuilder, setShowBuilder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    batch_id: '',
    title: '',
    description: '',
    time_limit_minutes: 15,
    passing_percentage: 60,
    questions: [createEmptyQuestion()],
  });

  const [resultsModal, setResultsModal] = useState({ open: false, quiz: null, rows: [], loading: false });
  const [previewModal, setPreviewModal] = useState({ open: false, quiz: null, loading: false });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [quizList, batchList] = await Promise.all([
        api.get('/quizzes'),
        api.get('/batches'),
      ]);
      const safeBatches = Array.isArray(batchList) ? batchList : [];
      setQuizzes(Array.isArray(quizList) ? quizList : []);
      setBatches(safeBatches);
      setForm((prev) => ({
        ...prev,
        batch_id: prev.batch_id || (safeBatches[0]?.id ? String(safeBatches[0].id) : ''),
      }));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function updateQuestion(idx, field, value) {
    setForm((prev) => {
      const next = [...prev.questions];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, questions: next };
    });
  }

  function addQuestion() {
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, createEmptyQuestion()],
    }));
  }

  function removeQuestion(idx) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.length > 1
        ? prev.questions.filter((_, i) => i !== idx)
        : prev.questions,
    }));
  }

  async function handleCreateQuiz(e) {
    e.preventDefault();
    if (!form.batch_id || !form.title.trim()) {
      showToast('Please select a batch and enter a quiz title.', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/quizzes', {
        batch_id: Number(form.batch_id),
        title: form.title.trim(),
        description: form.description.trim(),
        time_limit_minutes: Number(form.time_limit_minutes) || 15,
        passing_percentage: Number(form.passing_percentage) || 60,
        status: 'published',
        questions: form.questions.map((q) => ({
          ...q,
          marks: Number(q.marks) || 1,
        })),
      });
      showToast('Quiz created and published to the selected batch!', 'success');
      setShowBuilder(false);
      setForm({
        batch_id: batches[0]?.id ? String(batches[0].id) : '',
        title: '',
        description: '',
        time_limit_minutes: 15,
        passing_percentage: 60,
        questions: [createEmptyQuestion()],
      });
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to create quiz', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(quiz) {
    const nextStatus = quiz.status === 'published' ? 'closed' : 'published';
    try {
      await api.patch(`/quizzes/${quiz.id}/status`, { status: nextStatus });
      showToast(`Quiz ${nextStatus === 'published' ? 'reopened' : 'closed'}.`, 'success');
      await loadData();
    } catch (err) {
      showToast(err.message || 'Could not update quiz status', 'error');
    }
  }

  async function handleDeleteQuiz(quiz) {
    if (!window.confirm(`Are you sure you want to delete "${quiz.title}"? This will also delete all questions and student submissions. This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/quizzes/${quiz.id}`);
      showToast('Quiz deleted successfully.', 'success');
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to delete quiz', 'error');
    }
  }

  async function openResults(quiz) {
    setResultsModal({ open: true, quiz, rows: [], loading: true });
    try {
      const rows = await api.get(`/quizzes/${quiz.id}/results`);
      setResultsModal({ open: true, quiz, rows: Array.isArray(rows) ? rows : [], loading: false });
    } catch (err) {
      showToast(err.message || 'Failed to load student submissions', 'error');
      setResultsModal({ open: false, quiz: null, rows: [], loading: false });
    }
  }

  async function openPreview(quiz) {
    setPreviewModal({ open: true, quiz: null, loading: true });
    try {
      const detail = await api.get(`/quizzes/${quiz.id}`);
      setPreviewModal({ open: true, quiz: detail, loading: false });
    } catch (err) {
      showToast(err.message || 'Failed to load quiz details', 'error');
      setPreviewModal({ open: false, quiz: null, loading: false });
    }
  }

  if (loading) return <Loader label="Loading batch quizzes…" />;
  if (error) return <ErrorState error={error} onRetry={loadData} />;

  const publishedCount = quizzes.filter((q) => q.status === 'published').length;
  const totalAttempts = quizzes.reduce((acc, q) => acc + Number(q.attempt_count || 0), 0);

  return (
    <div className="quiz-page">
      <PageHeader
        eyebrow="Phase 9 · Batch Knowledge Checks"
        title="Batch Quiz Manager"
        description="Create batch-assigned multiple-choice quizzes, set correct answers securely, and review student marks."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowBuilder((v) => !v)}
          >
            <PlusCircle size={15} />
            {showBuilder ? 'Close Builder' : 'Create Batch Quiz'}
          </Button>
        }
      />

      <div className="stat-grid stat-grid-3" style={{ marginBottom: 22 }}>
        <StatCard label="Total Quizzes" value={quizzes.length} icon={ClipboardCheck} tone="blue" hint="Across assigned batches" />
        <StatCard label="Published Quizzes" value={publishedCount} icon={CheckCircle2} tone="green" hint="Visible to batch trainees" />
        <StatCard label="Student Submissions" value={totalAttempts} icon={Users} tone="violet" hint="Graded attempts stored" />
      </div>

      {showBuilder ? (
        <form className="card quiz-builder-card" onSubmit={handleCreateQuiz} style={{ marginBottom: 24 }}>
          <div className="section-heading">
            <h2>Create New Batch Quiz</h2>
            <p>Select the target batch and mark the correct option (A–D) for each question. Students will never see the answer key.</p>
          </div>

          <div className="quiz-meta-grid">
            <div className="quiz-field">
              <label htmlFor="quiz-batch">Target Batch *</label>
              <select
                id="quiz-batch"
                value={form.batch_id}
                onChange={(e) => setForm((p) => ({ ...p, batch_id: e.target.value }))}
                required
              >
                <option value="">Select a batch…</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.section ? ` · Section ${b.section}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="quiz-field">
              <label htmlFor="quiz-title">Quiz Title *</label>
              <input
                id="quiz-title"
                type="text"
                placeholder="e.g. Workshop Safety & PPE Check"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </div>

            <div className="quiz-field">
              <label htmlFor="quiz-time">Time Limit (Minutes)</label>
              <input
                id="quiz-time"
                type="number"
                min={1}
                max={180}
                value={form.time_limit_minutes}
                onChange={(e) => setForm((p) => ({ ...p, time_limit_minutes: e.target.value }))}
              />
            </div>

            <div className="quiz-field">
              <label htmlFor="quiz-pass">Passing Percentage (%)</label>
              <input
                id="quiz-pass"
                type="number"
                min={1}
                max={100}
                value={form.passing_percentage}
                onChange={(e) => setForm((p) => ({ ...p, passing_percentage: e.target.value }))}
              />
            </div>
          </div>

          <div className="quiz-field" style={{ marginTop: 12 }}>
            <label htmlFor="quiz-desc">Instructions / Description</label>
            <textarea
              id="quiz-desc"
              rows={2}
              placeholder="Optional instructions for trainees..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="quiz-questions-stack">
            {form.questions.map((q, idx) => (
              <div key={idx} className="quiz-question-editor">
                <div className="quiz-question-editor-head">
                  <strong>Question #{idx + 1}</strong>
                  <div className="quiz-question-editor-actions">
                    <label className="quiz-marks-label">
                      Marks:
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={q.marks}
                        onChange={(e) => updateQuestion(idx, 'marks', e.target.value)}
                      />
                    </label>
                    {form.questions.length > 1 ? (
                      <Button
                        variant="ghost-danger"
                        size="sm"
                        onClick={() => removeQuestion(idx)}
                      >
                        <Trash2 size={14} /> Remove
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="quiz-field" style={{ marginBottom: 10 }}>
                  <input
                    type="text"
                    placeholder="Enter question text…"
                    value={q.question_text}
                    onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                    required
                  />
                </div>

                <div className="quiz-options-editor-grid">
                  {(['A', 'B', 'C', 'D']).map((letter) => {
                    const key = `option_${letter.toLowerCase()}`;
                    const isCorrect = q.correct_option === letter;
                    return (
                      <div key={letter} className={`quiz-option-input-box ${isCorrect ? 'is-correct' : ''}`}>
                        <label className="quiz-correct-radio">
                          <input
                            type="radio"
                            name={`correct-${idx}`}
                            checked={isCorrect}
                            onChange={() => updateQuestion(idx, 'correct_option', letter)}
                          />
                          <span>{letter} {isCorrect ? '(Correct Answer)' : ''}</span>
                        </label>
                        <input
                          type="text"
                          placeholder={`Option ${letter}`}
                          value={q[key]}
                          onChange={(e) => updateQuestion(idx, key, e.target.value)}
                          required
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="quiz-builder-footer">
            <Button variant="secondary" size="sm" onClick={addQuestion}>
              <Plus size={15} /> Add Question
            </Button>
            <Button type="submit" variant="primary" loading={saving} disabled={saving}>
              {saving ? 'Publishing Quiz…' : 'Publish Quiz to Batch'}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="card">
        <div className="section-heading">
          <h2>Published &amp; Assigned Quizzes</h2>
          <p>Quizzes are visible only to students enrolled in the assigned batch.</p>
        </div>

        {quizzes.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No quizzes created yet"
            description="Click 'Create Batch Quiz' above to publish a quiz for a batch."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quiz Title</th>
                  <th>Batch</th>
                  <th>Questions</th>
                  <th>Total Marks</th>
                  <th>Submissions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map((quiz) => (
                  <tr key={quiz.id}>
                    <td>
                      <strong>{quiz.title}</strong>
                      {quiz.description ? <div className="table-sub">{quiz.description}</div> : null}
                    </td>
                    <td>
                      <span>{quiz.batch_name}</span>
                      <div className="table-sub">{quiz.batch_code}</div>
                    </td>
                    <td>{quiz.question_count} Qs</td>
                    <td>{quiz.total_marks} Marks</td>
                    <td>{quiz.attempt_count}</td>
                    <td>
                      <Badge tone={quiz.status === 'published' ? 'success' : 'warning'}>
                        {quiz.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Button variant="secondary" size="sm" onClick={() => openResults(quiz)}>
                          <Users size={14} /> Results
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => openPreview(quiz)}>
                          <Eye size={14} /> Key
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleToggleStatus(quiz)}>
                          {quiz.status === 'published' ? 'Close' : 'Reopen'}
                        </Button>
                        <Button variant="ghost-danger" size="sm" onClick={() => handleDeleteQuiz(quiz)}>
                          <Trash2 size={14} /> Delete
                        </Button>
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
        open={resultsModal.open}
        title={resultsModal.quiz ? `Submissions · ${resultsModal.quiz.title}` : 'Quiz Submissions'}
        description="Student attempts and evaluated marks recorded in the database."
        onClose={() => setResultsModal({ open: false, quiz: null, rows: [], loading: false })}
        size="lg"
      >
        {resultsModal.loading ? (
          <Loader label="Loading submissions…" />
        ) : resultsModal.rows.length === 0 ? (
          <EmptyState icon={Users} title="No submissions yet" description="No student from this batch has submitted this quiz yet." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Admission No</th>
                  <th>Marks</th>
                  <th>Percentage</th>
                  <th>Result</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {resultsModal.rows.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.student_name}</strong></td>
                    <td>{r.admission_no}</td>
                    <td>{r.score} / {r.max_score}</td>
                    <td>{r.percentage}%</td>
                    <td>
                      <Badge tone={r.passed ? 'success' : 'danger'}>
                        {r.passed ? 'Passed' : 'Needs Practice'}
                      </Badge>
                    </td>
                    <td>{formatDateTime(r.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal
        open={previewModal.open}
        title={previewModal.quiz ? `Answer Key · ${previewModal.quiz.title}` : 'Quiz Preview'}
        description="Staff-only view showing questions and configured correct answers."
        onClose={() => setPreviewModal({ open: false, quiz: null, loading: false })}
        size="lg"
      >
        {previewModal.loading ? (
          <Loader label="Loading quiz key…" />
        ) : previewModal.quiz ? (
          <div className="quiz-preview-list">
            {(previewModal.quiz.questions || []).map((q, idx) => (
              <div key={q.id} className="quiz-preview-item">
                <strong>Q{idx + 1}. {q.question_text} ({q.marks} mark{q.marks > 1 ? 's' : ''})</strong>
                <div className="quiz-preview-options">
                  {(['A', 'B', 'C', 'D']).map((letter) => {
                    const isAns = q.correct_option === letter;
                    return (
                      <div key={letter} className={`quiz-preview-opt ${isAns ? 'is-ans' : ''}`}>
                        <span>{letter}. {q[`option_${letter.toLowerCase()}`]}</span>
                        {isAns ? <Badge tone="success">Correct</Badge> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
