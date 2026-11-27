import test from 'node:test';
import assert from 'node:assert/strict';

function stripCorrectAnswersForStudent(questions) {
  return questions.map(({ correct_option, ...rest }) => rest);
}

function gradeQuiz(questions, answers, passingPercentage = 60) {
  let score = 0;
  let maxScore = 0;
  for (const q of questions) {
    const marks = Number(q.marks) || 1;
    maxScore += marks;
    if (String(answers[q.id] || '').toUpperCase() === String(q.correct_option).toUpperCase()) {
      score += marks;
    }
  }
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;
  return {
    score,
    max_score: maxScore,
    percentage,
    passed: percentage >= passingPercentage,
  };
}

test('student quiz payload strips correct_option from every question', () => {
  const sanitized = stripCorrectAnswersForStudent([
    { id: 1, question_text: 'Q1', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D', correct_option: 'B', marks: 2 },
  ]);
  assert.equal('correct_option' in sanitized[0], false);
  assert.equal(sanitized[0].question_text, 'Q1');
});

test('gradeQuiz computes marks, percentage, and pass status accurately', () => {
  const questions = [
    { id: 10, correct_option: 'A', marks: 2 },
    { id: 11, correct_option: 'C', marks: 3 },
  ];
  const result = gradeQuiz(questions, { 10: 'A', 11: 'B' }, 60);
  assert.equal(result.score, 2);
  assert.equal(result.max_score, 5);
  assert.equal(result.percentage, 40);
  assert.equal(result.passed, false);

  const passResult = gradeQuiz(questions, { 10: 'A', 11: 'C' }, 60);
  assert.equal(passResult.score, 5);
  assert.equal(passResult.percentage, 100);
  assert.equal(passResult.passed, true);
});
