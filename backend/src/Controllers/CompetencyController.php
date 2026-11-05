<?php

namespace App\Controllers;

use App\Services\CompetencyService;
use App\Support\Response;

class CompetencyController
{
    private function user(): array
    {
        return $GLOBALS['AUTH_USER'] ?? [];
    }

    private function body(): array
    {
        $raw = file_get_contents('php://input');
        return !empty($raw) ? (json_decode($raw, true) ?: []) : [];
    }

    private function fail(\Throwable $e, string $code): void
    {
        Response::error($e->getMessage() ?: 'Operation failed', $code, [], 400);
    }

    public function curriculum(): void
    {
        try {
            $filters = [
                'trade_id' => $_GET['trade_id'] ?? null
            ];
            Response::success(CompetencyService::getCurriculum($filters, $this->user()));
        } catch (\Throwable $e) {
            $this->fail($e, 'CURRICULUM_FETCH_FAILED');
        }
    }

    public function showActivity(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        try {
            Response::success(CompetencyService::getActivityDetail($id, $this->user()));
        } catch (\Throwable $e) {
            $this->fail($e, 'ACTIVITY_FETCH_FAILED');
        }
    }

    public function saveModule(): void
    {
        try {
            $res = CompetencyService::saveModule($this->body(), $this->user());
            Response::success($res, ['message' => 'Curriculum module created.'], 201);
        } catch (\Throwable $e) {
            $this->fail($e, 'MODULE_SAVE_FAILED');
        }
    }

    public function updateModule(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        try {
            $res = CompetencyService::saveModule($this->body(), $this->user(), $id);
            Response::success($res, ['message' => 'Curriculum module updated.']);
        } catch (\Throwable $e) {
            $this->fail($e, 'MODULE_UPDATE_FAILED');
        }
    }

    public function saveActivity(): void
    {
        try {
            $res = CompetencyService::saveActivity($this->body(), $this->user());
            Response::success($res, ['message' => 'Practical activity created.'], 201);
        } catch (\Throwable $e) {
            $this->fail($e, 'ACTIVITY_SAVE_FAILED');
        }
    }

    public function updateActivity(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        try {
            $res = CompetencyService::saveActivity($this->body(), $this->user(), $id);
            Response::success($res, ['message' => 'Practical activity updated.']);
        } catch (\Throwable $e) {
            $this->fail($e, 'ACTIVITY_UPDATE_FAILED');
        }
    }

    public function createAttempt(): void
    {
        try {
            $res = CompetencyService::createAttempt($this->body(), $this->user());
            Response::success($res, ['message' => 'Activity attempt recorded.'], 201);
        } catch (\Throwable $e) {
            $this->fail($e, 'ATTEMPT_CREATE_FAILED');
        }
    }

    public function submitAssessment(): void
    {
        try {
            $res = CompetencyService::submitAssessment($this->body(), $this->user());
            Response::success($res, ['message' => 'Competency assessment submitted.']);
        } catch (\Throwable $e) {
            $this->fail($e, 'ASSESSMENT_SUBMIT_FAILED');
        }
    }

    public function batchMatrix(array $params): void
    {
        $batchId = (int)($params['batch_id'] ?? 0);
        try {
            Response::success(CompetencyService::getCompetencyMatrix($batchId, $this->user()));
        } catch (\Throwable $e) {
            $this->fail($e, 'COMPETENCY_MATRIX_FAILED');
        }
    }

    public function studentCompetency(array $params): void
    {
        $studentId = (int)($params['id'] ?? 0);
        try {
            Response::success(CompetencyService::getStudentCompetency($studentId, $this->user()));
        } catch (\Throwable $e) {
            $this->fail($e, 'STUDENT_COMPETENCY_FAILED');
        }
    }
}
