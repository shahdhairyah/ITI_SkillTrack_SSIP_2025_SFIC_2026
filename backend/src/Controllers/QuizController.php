<?php

namespace App\Controllers;

use App\Services\QuizService;
use App\Support\Request;
use App\Support\Response;

class QuizController
{
    private function user(): array
    {
        return $GLOBALS['CURRENT_USER'] ?? [];
    }

    public function index(): void
    {
        $batchId = Request::query('batch_id') ? (int)Request::query('batch_id') : null;
        $quizzes = QuizService::listQuizzes($this->user(), $batchId);
        Response::success($quizzes);
    }

    public function show(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $quiz = QuizService::getQuizDetail($id, $this->user());
        Response::success($quiz);
    }

    public function store(): void
    {
        $body = Request::json();
        $quiz = QuizService::createQuiz($body, $this->user());
        Response::success($quiz, ['message' => 'Quiz created and assigned to batch successfully.'], 201);
    }

    public function submit(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $body = Request::json();
        $answers = $body['answers'] ?? [];
        if (!is_array($answers)) {
            Response::error('Invalid answers payload.', 'VALIDATION_ERROR', [], 422);
            return;
        }
        $result = QuizService::submitQuizAttempt($id, $answers, $this->user());
        Response::success($result, ['message' => 'Quiz submitted and evaluated.'], 201);
    }

    public function results(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $results = QuizService::getQuizResults($id, $this->user());
        Response::success($results);
    }

    public function toggleStatus(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $body = Request::json();
        $status = (string)($body['status'] ?? '');
        $updated = QuizService::toggleStatus($id, $status, $this->user());
        Response::success($updated, ['message' => 'Quiz status updated.']);
    }
}
