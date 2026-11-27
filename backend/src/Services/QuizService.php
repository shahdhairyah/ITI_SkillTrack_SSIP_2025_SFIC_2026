<?php

namespace App\Services;

use App\Support\Response;
use PDO;

class QuizService
{
    private static bool $schemaChecked = false;

    /**
     * Ensure quiz tables exist in both SQLite and MySQL without requiring manual CLI migration.
     */
    public static function ensureSchema(PDO $db): void
    {
        if (self::$schemaChecked) {
            return;
        }
        $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);

        if ($driver === 'sqlite') {
            $db->exec("
                CREATE TABLE IF NOT EXISTS quizzes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    institute_id INTEGER NOT NULL,
                    batch_id INTEGER NOT NULL,
                    created_by INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NULL,
                    time_limit_minutes INTEGER NOT NULL DEFAULT 15,
                    passing_percentage REAL NOT NULL DEFAULT 60.0,
                    status TEXT NOT NULL DEFAULT 'published',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS quiz_questions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    quiz_id INTEGER NOT NULL,
                    question_text TEXT NOT NULL,
                    option_a TEXT NOT NULL,
                    option_b TEXT NOT NULL,
                    option_c TEXT NOT NULL,
                    option_d TEXT NOT NULL,
                    correct_option TEXT NOT NULL,
                    marks INTEGER NOT NULL DEFAULT 1,
                    sort_order INTEGER NOT NULL DEFAULT 1
                );
                CREATE TABLE IF NOT EXISTS quiz_attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    quiz_id INTEGER NOT NULL,
                    student_id INTEGER NOT NULL,
                    score INTEGER NOT NULL DEFAULT 0,
                    max_score INTEGER NOT NULL DEFAULT 0,
                    percentage REAL NOT NULL DEFAULT 0.0,
                    passed INTEGER NOT NULL DEFAULT 0,
                    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (quiz_id, student_id)
                );
                CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    attempt_id INTEGER NOT NULL,
                    question_id INTEGER NOT NULL,
                    selected_option TEXT NOT NULL,
                    is_correct INTEGER NOT NULL DEFAULT 0,
                    marks_awarded INTEGER NOT NULL DEFAULT 0
                );
            ");
        } else {
            $db->exec("
                CREATE TABLE IF NOT EXISTS quizzes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    institute_id INT NOT NULL,
                    batch_id INT NOT NULL,
                    created_by INT NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT NULL,
                    time_limit_minutes INT NOT NULL DEFAULT 15,
                    passing_percentage DECIMAL(5,2) NOT NULL DEFAULT 60.00,
                    status ENUM('published', 'draft', 'closed') NOT NULL DEFAULT 'published',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_quizzes_batch (batch_id, status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            $db->exec("
                CREATE TABLE IF NOT EXISTS quiz_questions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    quiz_id INT NOT NULL,
                    question_text TEXT NOT NULL,
                    option_a VARCHAR(500) NOT NULL,
                    option_b VARCHAR(500) NOT NULL,
                    option_c VARCHAR(500) NOT NULL,
                    option_d VARCHAR(500) NOT NULL,
                    correct_option ENUM('A', 'B', 'C', 'D') NOT NULL,
                    marks INT NOT NULL DEFAULT 1,
                    sort_order INT NOT NULL DEFAULT 1,
                    INDEX idx_quiz_questions_quiz (quiz_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            $db->exec("
                CREATE TABLE IF NOT EXISTS quiz_attempts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    quiz_id INT NOT NULL,
                    student_id INT NOT NULL,
                    score INT NOT NULL DEFAULT 0,
                    max_score INT NOT NULL DEFAULT 0,
                    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                    passed TINYINT(1) NOT NULL DEFAULT 0,
                    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_quiz_student_attempt (quiz_id, student_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            $db->exec("
                CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    attempt_id INT NOT NULL,
                    question_id INT NOT NULL,
                    selected_option ENUM('A', 'B', 'C', 'D') NOT NULL,
                    is_correct TINYINT(1) NOT NULL DEFAULT 0,
                    marks_awarded INT NOT NULL DEFAULT 0,
                    INDEX idx_quiz_attempt_answers_attempt (attempt_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
        }

        self::$schemaChecked = true;
    }

    private static function getStudentForUser(PDO $db, int $userId): ?array
    {
        $stmt = $db->prepare('SELECT id, name, admission_no FROM students WHERE user_id = :uid LIMIT 1');
        $stmt->execute([':uid' => $userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    private static function instructorOwnsBatch(PDO $db, int $userId, int $batchId): bool
    {
        $stmt = $db->prepare("
            SELECT 1
            FROM instructor_assignments ia
            JOIN instructors i ON i.id = ia.instructor_id
            WHERE i.user_id = :uid
              AND ia.batch_id = :bid
              AND ia.ends_on IS NULL
            LIMIT 1
        ");
        $stmt->execute([':uid' => $userId, ':bid' => $batchId]);
        return (bool)$stmt->fetchColumn();
    }

    private static function studentEnrolledInBatch(PDO $db, int $studentId, int $batchId): bool
    {
        $stmt = $db->prepare("
            SELECT 1 FROM enrollments
            WHERE student_id = :sid AND batch_id = :bid AND status = 'active'
            LIMIT 1
        ");
        $stmt->execute([':sid' => $studentId, ':bid' => $batchId]);
        return (bool)$stmt->fetchColumn();
    }

    public static function listQuizzes(array $currentUser, ?int $batchId = null): array
    {
        $db = Database::getConnection();
        self::ensureSchema($db);

        $role = $currentUser['role'] ?? '';
        $instId = (int)($currentUser['institute_id'] ?? 1);
        $userId = (int)($currentUser['id'] ?? 0);

        $sql = "
            SELECT q.*,
                   b.name AS batch_name,
                   b.section AS batch_code,
                   t.name AS trade_name,
                   t.code AS trade_code,
                   u.username AS created_by_name,
                   (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count,
                   (SELECT COALESCE(SUM(qq.marks), 0) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS total_marks,
                   (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) AS attempt_count
            FROM quizzes q
            JOIN batches b ON b.id = q.batch_id
            JOIN trades t ON t.id = b.trade_id
            LEFT JOIN users u ON u.id = q.created_by
            WHERE q.institute_id = :inst_id
        ";
        $params = [':inst_id' => $instId];

        if ($batchId) {
            $sql .= " AND q.batch_id = :batch_id";
            $params[':batch_id'] = $batchId;
        }

        if ($role === 'instructor') {
            $sql .= " AND q.batch_id IN (
                SELECT ia.batch_id
                FROM instructor_assignments ia
                JOIN instructors i ON i.id = ia.instructor_id
                WHERE i.user_id = :instructor_uid AND ia.ends_on IS NULL
            )";
            $params[':instructor_uid'] = $userId;
        } elseif ($role === 'student') {
            $student = self::getStudentForUser($db, $userId);
            if (!$student) {
                return [];
            }
            $sql .= " AND q.status = 'published' AND q.batch_id IN (
                SELECT e.batch_id FROM enrollments e
                WHERE e.student_id = :student_id AND e.status = 'active'
            )";
            $params[':student_id'] = (int)$student['id'];
        }

        $sql .= " ORDER BY q.created_at DESC, q.id DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $quizzes = $stmt->fetchAll();

        if ($role === 'student') {
            $student = self::getStudentForUser($db, $userId);
            $studentId = (int)$student['id'];
            $attemptStmt = $db->prepare("
                SELECT id, quiz_id, score, max_score, percentage, passed, submitted_at
                FROM quiz_attempts
                WHERE student_id = :sid
            ");
            $attemptStmt->execute([':sid' => $studentId]);
            $attemptsByQuiz = [];
            foreach ($attemptStmt->fetchAll() as $att) {
                $attemptsByQuiz[(int)$att['quiz_id']] = [
                    'id' => (int)$att['id'],
                    'score' => (int)$att['score'],
                    'max_score' => (int)$att['max_score'],
                    'percentage' => (float)$att['percentage'],
                    'passed' => (bool)$att['passed'],
                    'submitted_at' => $att['submitted_at'],
                ];
            }
            foreach ($quizzes as &$quiz) {
                $quiz['attempt'] = $attemptsByQuiz[(int)$quiz['id']] ?? null;
            }
        }

        return $quizzes;
    }

    public static function getQuizDetail(int $quizId, array $currentUser): array
    {
        $db = Database::getConnection();
        self::ensureSchema($db);

        $role = $currentUser['role'] ?? '';
        $userId = (int)($currentUser['id'] ?? 0);
        $instId = (int)($currentUser['institute_id'] ?? 1);

        $stmt = $db->prepare("
            SELECT q.*, b.name AS batch_name, b.section AS batch_code, t.name AS trade_name, t.code AS trade_code
            FROM quizzes q
            JOIN batches b ON b.id = q.batch_id
            JOIN trades t ON t.id = b.trade_id
            WHERE q.id = :qid AND q.institute_id = :inst_id
            LIMIT 1
        ");
        $stmt->execute([':qid' => $quizId, ':inst_id' => $instId]);
        $quiz = $stmt->fetch();

        if (!$quiz) {
            Response::error('Quiz not found.', 'QUIZ_NOT_FOUND', [], 404);
        }

        if ($role === 'instructor' && !self::instructorOwnsBatch($db, $userId, (int)$quiz['batch_id'])) {
            Response::error('Forbidden: You are not assigned to this batch.', 'FORBIDDEN', [], 403);
        }

        $studentAttempt = null;
        if ($role === 'student') {
            $student = self::getStudentForUser($db, $userId);
            if (!$student || !self::studentEnrolledInBatch($db, (int)$student['id'], (int)$quiz['batch_id'])) {
                Response::error('Forbidden: You are not enrolled in this batch.', 'FORBIDDEN', [], 403);
            }
            if ($quiz['status'] !== 'published') {
                Response::error('This quiz is not currently published.', 'QUIZ_UNAVAILABLE', [], 403);
            }

            $attStmt = $db->prepare("
                SELECT id, score, max_score, percentage, passed, submitted_at
                FROM quiz_attempts
                WHERE quiz_id = :qid AND student_id = :sid
                LIMIT 1
            ");
            $attStmt->execute([':qid' => $quizId, ':sid' => (int)$student['id']]);
            $att = $attStmt->fetch();
            if ($att) {
                $studentAttempt = [
                    'id' => (int)$att['id'],
                    'score' => (int)$att['score'],
                    'max_score' => (int)$att['max_score'],
                    'percentage' => (float)$att['percentage'],
                    'passed' => (bool)$att['passed'],
                    'submitted_at' => $att['submitted_at'],
                ];
            }
        }

        // Security: Never expose correct_option to students
        $cols = $role === 'student'
            ? 'id, quiz_id, question_text, option_a, option_b, option_c, option_d, marks, sort_order'
            : 'id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, sort_order';

        $qStmt = $db->prepare("
            SELECT {$cols}
            FROM quiz_questions
            WHERE quiz_id = :qid
            ORDER BY sort_order ASC, id ASC
        ");
        $qStmt->execute([':qid' => $quizId]);
        $questions = $qStmt->fetchAll();

        $quiz['questions'] = $questions;
        $quiz['question_count'] = count($questions);
        $quiz['total_marks'] = array_sum(array_map(fn($q) => (int)$q['marks'], $questions));
        if ($role === 'student') {
            $quiz['attempt'] = $studentAttempt;
        }

        return $quiz;
    }

    public static function createQuiz(array $payload, array $currentUser): array
    {
        $db = Database::getConnection();
        self::ensureSchema($db);

        $role = $currentUser['role'] ?? '';
        $userId = (int)($currentUser['id'] ?? 0);
        $instId = (int)($currentUser['institute_id'] ?? 1);

        $batchId = (int)($payload['batch_id'] ?? 0);
        $title = trim((string)($payload['title'] ?? ''));
        $description = trim((string)($payload['description'] ?? ''));
        $timeLimit = max(1, (int)($payload['time_limit_minutes'] ?? 15));
        $passingPct = (float)($payload['passing_percentage'] ?? 60);
        $status = in_array($payload['status'] ?? 'published', ['published', 'draft'], true)
            ? $payload['status']
            : 'published';
        $questions = $payload['questions'] ?? [];

        if ($batchId <= 0 || $title === '') {
            Response::error('Batch and quiz title are required.', 'VALIDATION_ERROR', [], 422);
        }
        if (!is_array($questions) || count($questions) === 0) {
            Response::error('At least one question is required.', 'VALIDATION_ERROR', [], 422);
        }

        // Verify batch belongs to institute
        $bStmt = $db->prepare('SELECT b.id FROM batches b JOIN trades t ON t.id = b.trade_id WHERE b.id = :bid AND t.institute_id = :inst_id LIMIT 1');
        $bStmt->execute([':bid' => $batchId, ':inst_id' => $instId]);
        if (!$bStmt->fetchColumn()) {
            Response::error('Selected batch was not found.', 'BATCH_NOT_FOUND', [], 404);
        }

        if ($role === 'instructor' && !self::instructorOwnsBatch($db, $userId, $batchId)) {
            Response::error('Forbidden: You can only create quizzes for your assigned batches.', 'FORBIDDEN', [], 403);
        }

        $validatedQuestions = [];
        foreach ($questions as $index => $q) {
            $qText = trim((string)($q['question_text'] ?? ''));
            $optA = trim((string)($q['option_a'] ?? ''));
            $optB = trim((string)($q['option_b'] ?? ''));
            $optC = trim((string)($q['option_c'] ?? ''));
            $optD = trim((string)($q['option_d'] ?? ''));
            $correct = strtoupper(trim((string)($q['correct_option'] ?? '')));
            $marks = max(1, (int)($q['marks'] ?? 1));

            if ($qText === '' || $optA === '' || $optB === '' || $optC === '' || $optD === '') {
                Response::error('Question #' . ($index + 1) . ' must have question text and all 4 options.', 'VALIDATION_ERROR', [], 422);
            }
            if (!in_array($correct, ['A', 'B', 'C', 'D'], true)) {
                Response::error('Question #' . ($index + 1) . ' must have a valid correct answer (A, B, C, or D).', 'VALIDATION_ERROR', [], 422);
            }

            $validatedQuestions[] = [
                'question_text' => $qText,
                'option_a' => $optA,
                'option_b' => $optB,
                'option_c' => $optC,
                'option_d' => $optD,
                'correct_option' => $correct,
                'marks' => $marks,
                'sort_order' => $index + 1,
            ];
        }

        $db->beginTransaction();
        try {
            $insertQuiz = $db->prepare("
                INSERT INTO quizzes (institute_id, batch_id, created_by, title, description, time_limit_minutes, passing_percentage, status)
                VALUES (:inst_id, :batch_id, :created_by, :title, :description, :time_limit, :passing_pct, :status)
            ");
            $insertQuiz->execute([
                ':inst_id' => $instId,
                ':batch_id' => $batchId,
                ':created_by' => $userId,
                ':title' => $title,
                ':description' => $description !== '' ? $description : null,
                ':time_limit' => $timeLimit,
                ':passing_pct' => max(1, min(100, $passingPct)),
                ':status' => $status,
            ]);
            $quizId = (int)$db->lastInsertId();

            $insertQ = $db->prepare("
                INSERT INTO quiz_questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, sort_order)
                VALUES (:quiz_id, :question_text, :option_a, :option_b, :option_c, :option_d, :correct_option, :marks, :sort_order)
            ");
            foreach ($validatedQuestions as $vq) {
                $insertQ->execute([
                    ':quiz_id' => $quizId,
                    ':question_text' => $vq['question_text'],
                    ':option_a' => $vq['option_a'],
                    ':option_b' => $vq['option_b'],
                    ':option_c' => $vq['option_c'],
                    ':option_d' => $vq['option_d'],
                    ':correct_option' => $vq['correct_option'],
                    ':marks' => $vq['marks'],
                    ':sort_order' => $vq['sort_order'],
                ]);
            }

            $db->commit();
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }

        AuditService::log($userId, 'QUIZ_CREATED', 'quiz', $quizId, null, [
            'batch_id' => $batchId,
            'title' => $title,
            'questions_count' => count($validatedQuestions),
        ]);

        return self::getQuizDetail($quizId, $currentUser);
    }

    public static function submitQuizAttempt(int $quizId, array $answers, array $currentUser): array
    {
        $db = Database::getConnection();
        self::ensureSchema($db);

        $role = $currentUser['role'] ?? '';
        $userId = (int)($currentUser['id'] ?? 0);
        $instId = (int)($currentUser['institute_id'] ?? 1);

        if ($role !== 'student') {
            Response::error('Only students can submit quiz attempts.', 'FORBIDDEN', [], 403);
        }

        $student = self::getStudentForUser($db, $userId);
        if (!$student) {
            Response::error('Student profile not found.', 'STUDENT_NOT_FOUND', [], 404);
        }
        $studentId = (int)$student['id'];

        $stmt = $db->prepare("
            SELECT * FROM quizzes WHERE id = :qid AND institute_id = :inst_id LIMIT 1
        ");
        $stmt->execute([':qid' => $quizId, ':inst_id' => $instId]);
        $quiz = $stmt->fetch();

        if (!$quiz) {
            Response::error('Quiz not found.', 'QUIZ_NOT_FOUND', [], 404);
        }
        if ($quiz['status'] !== 'published') {
            Response::error('This quiz is closed and no longer accepting submissions.', 'QUIZ_CLOSED', [], 403);
        }
        if (!self::studentEnrolledInBatch($db, $studentId, (int)$quiz['batch_id'])) {
            Response::error('Forbidden: You are not enrolled in this quiz batch.', 'FORBIDDEN', [], 403);
        }

        $existingStmt = $db->prepare('SELECT id FROM quiz_attempts WHERE quiz_id = :qid AND student_id = :sid LIMIT 1');
        $existingStmt->execute([':qid' => $quizId, ':sid' => $studentId]);
        if ($existingStmt->fetchColumn()) {
            Response::error('You have already submitted this quiz.', 'ALREADY_SUBMITTED', [], 409);
        }

        $qStmt = $db->prepare('SELECT id, correct_option, marks FROM quiz_questions WHERE quiz_id = :qid ORDER BY sort_order ASC, id ASC');
        $qStmt->execute([':qid' => $quizId]);
        $questions = $qStmt->fetchAll();

        if (count($questions) === 0) {
            Response::error('Quiz has no questions.', 'QUIZ_EMPTY', [], 422);
        }

        $score = 0;
        $maxScore = 0;
        $gradedAnswers = [];

        foreach ($questions as $q) {
            $qId = (int)$q['id'];
            $marks = (int)$q['marks'];
            $maxScore += $marks;

            $selected = strtoupper(trim((string)($answers[(string)$qId] ?? $answers[$qId] ?? '')));
            if (!in_array($selected, ['A', 'B', 'C', 'D'], true)) {
                Response::error('Please answer all questions before submitting.', 'VALIDATION_ERROR', [], 422);
            }

            $isCorrect = ($selected === strtoupper((string)$q['correct_option'])) ? 1 : 0;
            $awarded = $isCorrect ? $marks : 0;
            $score += $awarded;

            $gradedAnswers[] = [
                'question_id' => $qId,
                'selected_option' => $selected,
                'is_correct' => $isCorrect,
                'marks_awarded' => $awarded,
            ];
        }

        $percentage = $maxScore > 0 ? round(($score / $maxScore) * 100, 2) : 0.0;
        $passed = $percentage >= (float)$quiz['passing_percentage'] ? 1 : 0;

        $db->beginTransaction();
        try {
            $insAtt = $db->prepare("
                INSERT INTO quiz_attempts (quiz_id, student_id, score, max_score, percentage, passed)
                VALUES (:qid, :sid, :score, :max_score, :pct, :passed)
            ");
            $insAtt->execute([
                ':qid' => $quizId,
                ':sid' => $studentId,
                ':score' => $score,
                ':max_score' => $maxScore,
                ':pct' => $percentage,
                ':passed' => $passed,
            ]);
            $attemptId = (int)$db->lastInsertId();

            $insAns = $db->prepare("
                INSERT INTO quiz_attempt_answers (attempt_id, question_id, selected_option, is_correct, marks_awarded)
                VALUES (:aid, :qid, :opt, :ok, :marks)
            ");
            foreach ($gradedAnswers as $ga) {
                $insAns->execute([
                    ':aid' => $attemptId,
                    ':qid' => $ga['question_id'],
                    ':opt' => $ga['selected_option'],
                    ':ok' => $ga['is_correct'],
                    ':marks' => $ga['marks_awarded'],
                ]);
            }

            $db->commit();
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }

        AuditService::log($userId, 'QUIZ_SUBMITTED', 'quiz_attempt', $attemptId, null, [
            'quiz_id' => $quizId,
            'student_id' => $studentId,
            'score' => $score,
            'max_score' => $maxScore,
            'percentage' => $percentage,
        ]);

        return [
            'id' => $attemptId,
            'quiz_id' => $quizId,
            'score' => $score,
            'max_score' => $maxScore,
            'percentage' => $percentage,
            'passed' => (bool)$passed,
            'submitted_at' => date('Y-m-d H:i:s'),
        ];
    }

    public static function getQuizResults(int $quizId, array $currentUser): array
    {
        $db = Database::getConnection();
        self::ensureSchema($db);

        $role = $currentUser['role'] ?? '';
        $userId = (int)($currentUser['id'] ?? 0);
        $instId = (int)($currentUser['institute_id'] ?? 1);

        $stmt = $db->prepare('SELECT * FROM quizzes WHERE id = :qid AND institute_id = :inst_id LIMIT 1');
        $stmt->execute([':qid' => $quizId, ':inst_id' => $instId]);
        $quiz = $stmt->fetch();

        if (!$quiz) {
            Response::error('Quiz not found.', 'QUIZ_NOT_FOUND', [], 404);
        }
        if ($role === 'instructor' && !self::instructorOwnsBatch($db, $userId, (int)$quiz['batch_id'])) {
            Response::error('Forbidden: You are not assigned to this batch.', 'FORBIDDEN', [], 403);
        }

        $resStmt = $db->prepare("
            SELECT qa.*, s.name AS student_name, s.admission_no
            FROM quiz_attempts qa
            JOIN students s ON s.id = qa.student_id
            WHERE qa.quiz_id = :qid
            ORDER BY qa.submitted_at DESC, qa.id DESC
        ");
        $resStmt->execute([':qid' => $quizId]);
        return $resStmt->fetchAll();
    }

    public static function toggleStatus(int $quizId, string $status, array $currentUser): array
    {
        $db = Database::getConnection();
        self::ensureSchema($db);

        if (!in_array($status, ['published', 'draft', 'closed'], true)) {
            Response::error('Invalid quiz status.', 'VALIDATION_ERROR', [], 422);
        }

        $role = $currentUser['role'] ?? '';
        $userId = (int)($currentUser['id'] ?? 0);
        $instId = (int)($currentUser['institute_id'] ?? 1);

        $stmt = $db->prepare('SELECT * FROM quizzes WHERE id = :qid AND institute_id = :inst_id LIMIT 1');
        $stmt->execute([':qid' => $quizId, ':inst_id' => $instId]);
        $quiz = $stmt->fetch();

        if (!$quiz) {
            Response::error('Quiz not found.', 'QUIZ_NOT_FOUND', [], 404);
        }
        if ($role === 'instructor' && !self::instructorOwnsBatch($db, $userId, (int)$quiz['batch_id'])) {
            Response::error('Forbidden: You are not assigned to this batch.', 'FORBIDDEN', [], 403);
        }

        $upd = $db->prepare('UPDATE quizzes SET status = :status WHERE id = :qid');
        $upd->execute([':status' => $status, ':qid' => $quizId]);

        return ['id' => $quizId, 'status' => $status];
    }

    /**
     * Delete a quiz and cascade-delete questions, attempts, and attempt answers.
     */
    public static function deleteQuiz(int $quizId, array $currentUser): void
    {
        $db = Database::getConnection();
        self::ensureSchema($db);

        $role   = $currentUser['role'] ?? '';
        $userId = (int)($currentUser['id'] ?? 0);
        $instId = (int)($currentUser['institute_id'] ?? 1);

        $stmt = $db->prepare('SELECT batch_id, institute_id FROM quizzes WHERE id = :qid AND institute_id = :inst_id LIMIT 1');
        $stmt->execute([':qid' => $quizId, ':inst_id' => $instId]);
        $quiz = $stmt->fetch();

        if (!$quiz) {
            throw new \RuntimeException('Quiz not found.');
        }

        $batchId = (int)$quiz['batch_id'];

        if ($role === 'administrator') {
            // admin can delete any quiz in their institute
        } elseif ($role === 'instructor') {
            if (!self::instructorOwnsBatch($db, $userId, $batchId)) {
                throw new \RuntimeException('Forbidden: You are not assigned to this batch.');
            }
        } else {
            throw new \RuntimeException('Permission denied.');
        }

        $db->beginTransaction();
        try {
            // Delete attempt answers first
            $db->prepare('DELETE FROM quiz_attempt_answers WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE quiz_id = :qid)')->execute([':qid' => $quizId]);
            // Delete attempts
            $db->prepare('DELETE FROM quiz_attempts WHERE quiz_id = :qid')->execute([':qid' => $quizId]);
            // Delete questions
            $db->prepare('DELETE FROM quiz_questions WHERE quiz_id = :qid')->execute([':qid' => $quizId]);
            // Delete quiz
            $db->prepare('DELETE FROM quizzes WHERE id = :qid')->execute([':qid' => $quizId]);
            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            throw $e;
        }

        // Audit log
        try {
            if (class_exists(\App\Services\AuditService::class)) {
                \App\Services\AuditService::log($userId, 'QUIZ_DELETED', 'quiz', $quizId, null, ['batch_id' => $batchId]);
            }
        } catch (\Throwable $ignored) {}
    }
}
