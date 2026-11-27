<?php

namespace App\Controllers;

use App\Services\PracticalPhotoService;
use App\Support\Request;
use App\Support\Response;

class PracticalPhotoController
{
    private function user(): array
    {
        return $GLOBALS['CURRENT_USER'] ?? [];
    }

    public function index(): void
    {
        $filters = [
            'student_id' => Request::query('student_id'),
            'activity_id' => Request::query('activity_id'),
            'batch_id' => Request::query('batch_id'),
            'overall_status' => Request::query('overall_status'),
        ];
        $rows = PracticalPhotoService::listSubmissions($filters, $this->user());
        Response::success($rows);
    }

    public function upload(): void
    {
        $file = $_FILES['file'] ?? [];
        $result = PracticalPhotoService::uploadPhoto($file, $_POST, $this->user());
        Response::success($result, ['message' => 'Geo-tagged practical photo uploaded and awaiting Instructor & Admin approval.'], 201);
    }

    public function review(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $body = Request::json();
        $decision = (string)($body['decision'] ?? '');
        $remarks = (string)($body['remarks'] ?? '');
        $updated = PracticalPhotoService::reviewSubmission($id, $decision, $remarks, $this->user());
        Response::success($updated, ['message' => 'Practical photo review recorded.']);
    }

    public function submitPractical(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $body = Request::json();
        $notes = (string)($body['notes'] ?? '');
        $updated = PracticalPhotoService::submitPractical($id, $notes, $this->user());
        Response::success($updated, ['message' => 'Practical submitted successfully after Instructor & Admin approval.']);
    }

    public function file(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        PracticalPhotoService::streamPhoto($id, $this->user());
    }
}
