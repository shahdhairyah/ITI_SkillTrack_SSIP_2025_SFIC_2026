import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Send,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../app/providers/ToastProvider';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';

function waitMs(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function StudentQuizPage() {
  const { showToast } = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeQuiz, setActiveQuiz] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [answers, setAnswers] = useState({});
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState(null);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.get('/quizzes');
      setQuizzes(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  async function handleOpenQuiz(quiz) {
    setLoadingQuiz(true);
    setAnswers({});
    setResult(null);
    try {
      const detail = await api.get(`/quizzes/${quiz.id}`);
      setActiveQuiz(detail);
      if (detail?.attempt) {
        setResult(detail.attempt);
      }
    } catch (e) {
      showToast(e.message || 'Could not load quiz', 'error');
    } finally {
      setLoadingQuiz(false);
    }
  }

  async function handleSubmitQuiz(e) {
    e.preventDefault();
    if (!activeQuiz) return;

    const questions = activeQuiz.questions || [];
    const unanswered = questions.some((q) => !answers[q.id]);
    if (unanswered) {
      showToast('Please select an answer for every question before submitting.', 'error');
      return;
    }

    setEvaluating(true);
    try {
      // Enforce a 2.5-second evaluation delay before revealing marks
      const [submissionResult] = await Promise.all([
        api.post(`/quizzes/${activeQuiz.id}/submit`, { answers }),
        waitMs(2500),
      ]);
      setResult(submissionResult);
      showToast('Quiz evaluated! Your marks are now displayed.', 'success');
      await loadQuizzes();
    } catch (err) {
      showToast(err.message || 'Quiz submission failed', 'error');
    } finally {
      setEvaluating(false);
    }
  }

  if (loading) return <Loader label="Loading your batch quizzes…" />;
  if (error) return <ErrorState error={error} onRetry={loadQuizzes} />;

  const completedCount = quizzes.filter((q) => Boolean(q.attempt)).length;
  const pendingCount = quizzes.length - completedCount;

  if (loadingQuiz) {
    return <Loader label="Opening quiz questions…" />;
  }

  if (activeQuiz) {
    return (
      <div className="quiz-page">
        <PageHeader
          eyebrow={`${activeQuiz.batch_name} (${activeQuiz.batch_code})`}
          title={activeQuiz.title}
          description={activeQuiz.description || 'Select one option for each question and submit to see your marks.'}
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setActiveQuiz(null);
                setResult(null);
              }}
              disabled={evaluating}
            >
              <ArrowLeft size={15} /> Back to Quizzes
            </Button>
          }
        />

        {evaluating ? (
          <div className="card quiz-evaluating-card" role="status" aria-live="polite">
            <div className="quiz-evaluating-spinner">
              <Sparkles size={28} />
            </div>
            <h2>Evaluating Your Answers…</h2>
            <p>Checking your responses and calculating your marks. Please wait a moment.</p>
            <div className="quiz-eval-bar">
              <div className="quiz-eval-bar-fill" />
            </div>
          </div>
        ) : result ? (
          <div className="card quiz-result-card">
            <div className={`quiz-result-icon ${result.passed ? 'is-pass' : 'is-fail'}`}>
              <Award size={32} />
            </div>
            <Badge tone={result.passed ? 'success' : 'warning'}>
              {result.passed ? 'Passed' : 'Needs Practice'}
            </Badge>
            <h2 className="quiz-result-score">
              {result.score} / {result.max_score} Marks
            </h2>
            <p className="quiz-result-pct">
              Score Percentage: <strong>{result.percentage}%</strong>
            </p>
            <p className="quiz-result-note">
              Your marks have been recorded in the institutional database.
            </p>
            <Button
              variant="primary"
              onClick={() => {
                setActiveQuiz(null);
                setResult(null);
              }}
            >
              Return to My Quizzes
            </Button>
          </div>
        ) : (
          <form className="quiz-attempt-stack" onSubmit={handleSubmitQuiz}>
            {(activeQuiz.questions || []).map((q, idx) => (
              <div key={q.id} className="card quiz-attempt-question">
                <div className="quiz-attempt-q-head">
                  <span className="quiz-q-number">Question {idx + 1}</span>
                  <span className="quiz-q-marks">{q.marks} Mark{q.marks > 1 ? 's' : ''}</span>
                </div>
                <h3 className="quiz-attempt-q-text">{q.question_text}</h3>
                <div className="quiz-attempt-options">
                  {(['A', 'B', 'C', 'D']).map((letter) => {
                    const isSelected = answers[q.id] === letter;
                    return (
                      <label
                        key={letter}
                        className={`quiz-option-choice ${isSelected ? 'is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`question-${q.id}`}
                          value={letter}
                          checked={isSelected}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: letter }))}
                        />
                        <span className="quiz-option-letter">{letter}</span>
                        <span className="quiz-option-label">{q[`option_${letter.toLowerCase()}`]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="quiz-submit-bar">
              <span>
                Answered {Object.keys(answers).length} of {(activeQuiz.questions || []).length} questions
              </span>
              <Button type="submit" variant="primary">
                <Send size={15} /> Submit Quiz
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <PageHeader
        eyebrow="Student Assessment Portal"
        title="My Batch Quizzes"
        description="Complete quizzes assigned to your batch. Marks are revealed automatically a few seconds after submission."
      />

      <div className="stat-grid stat-grid-3" style={{ marginBottom: 22 }}>
        <StatCard label="Assigned Quizzes" value={quizzes.length} icon={ClipboardCheck} tone="blue" hint="For your active batch" />
        <StatCard label="Pending" value={pendingCount} icon={Clock} tone="amber" hint="Ready to attempt" />
        <StatCard label="Completed" value={completedCount} icon={CheckCircle2} tone="green" hint="Submitted & graded" />
      </div>

      {quizzes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ClipboardCheck}
            title="No quizzes assigned to your batch yet"
            description="When your instructor or administrator publishes a quiz for your batch, it will appear here."
          />
        </div>
      ) : (
        <div className="quiz-student-grid">
          {quizzes.map((quiz) => {
            const attempt = quiz.attempt;
            return (
              <div key={quiz.id} className="card quiz-student-card">
                <div>
                  <div className="quiz-card-top">
                    <Badge tone={attempt ? (attempt.passed ? 'success' : 'warning') : 'info'}>
                      {attempt ? `Completed · ${attempt.score}/${attempt.max_score}` : 'Pending'}
                    </Badge>
                    <span className="quiz-meta-pill">{quiz.time_limit_minutes} min</span>
                  </div>
                  <h3 className="quiz-card-title">{quiz.title}</h3>
                  {quiz.description ? <p className="quiz-card-desc">{quiz.description}</p> : null}
                  <div className="quiz-card-stats">
                    <span>{quiz.question_count} Questions</span>
                    <span>•</span>
                    <span>{quiz.total_marks} Total Marks</span>
                  </div>
                </div>

                <Button
                  variant={attempt ? 'secondary' : 'primary'}
                  size="sm"
                  className="btn-block"
                  onClick={() => handleOpenQuiz(quiz)}
                >
                  {attempt ? `View Marks (${attempt.percentage}%)` : 'Start Quiz'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
