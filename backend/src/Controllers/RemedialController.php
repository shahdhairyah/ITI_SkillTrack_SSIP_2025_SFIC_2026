<?php

namespace App\Controllers;

use App\Services\RemedialService;
use App\Support\Response;

class RemedialController
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

    public function index(): void
    {
        try {
            $filters = [
                'student_id' => $_GET['student_id'] ?? null,
                'batch_id' => $_GET['batch_id'] ?? null,
                'status' => $_GET['status'] ?? null,
                'activity_id' => $_GET['activity_id'] ?? null
            ];
            Response::success(RemedialService::getRemedials($filters, $this->user()));
        } catch (\Throwable $e) {
            $this->fail($e, 'REMEDIALS_FETCH_FAILED');
        }
    }

    public function store(): void
    {
        try {
            $res = RemedialService::createRemedial($this->body(), $this->user());
            Response::success($res, ['message' => 'Remedial assigned successfully.'], 201);
        } catch (\Throwable $e) {
            $this->fail($e, 'REMEDIAL_CREATE_FAILED');
        }
    }

    public function review(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        try {
            $res = RemedialService::reviewRemedial($id, $this->body(), $this->user());
            Response::success($res, ['message' => 'Remedial review recorded.']);
        } catch (\Throwable $e) {
            $this->fail($e, 'REMEDIAL_REVIEW_FAILED');
        }
    }

    public function dashboardStats(): void
    {
        try {
            Response::success(RemedialService::getAdminDashboardStats($this->user()));
        } catch (\Throwable $e) {
            $this->fail($e, 'DASHBOARD_STATS_FAILED');
        }
    }
}
