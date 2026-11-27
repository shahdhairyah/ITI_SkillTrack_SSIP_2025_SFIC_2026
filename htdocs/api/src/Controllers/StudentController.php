<?php

namespace App\Controllers;

use App\Services\StudentService;
use App\Support\Response;

class StudentController
{
    public function index(): void
    {
        $currentUser = $GLOBALS['CURRENT_USER'] ?? null;
        $filters = [
            'batch_id' => $_GET['batch_id'] ?? null,
            'status' => $_GET['status'] ?? null,
            'search' => $_GET['search'] ?? null
        ];

        $students = StudentService::getStudents($filters, $currentUser);
        Response::success($students);
    }

    public function show(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $currentUser = $GLOBALS['CURRENT_USER'] ?? null;

        try {
            $student = StudentService::getStudentById($id, $currentUser);
            if (!$student) {
                Response::error("Student #{$id} not found.", 'NOT_FOUND', [], 404);
                return;
            }
            Response::success($student);
        } catch (\DomainException $e) {
            Response::error($e->getMessage(), 'FORBIDDEN', [], 403);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'SERVER_ERROR', [], 500);
        }
    }

    public function store(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;
        $data['institute_id'] = $GLOBALS['CURRENT_USER']['institute_id'] ?? ($data['institute_id'] ?? 1);

        try {
            $student = StudentService::createStudent($data, $actorId);
            Response::success($student, ['message' => 'Student created and enrolled successfully.'], 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', [], $e->getCode() === 409 ? 409 : 422);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'STUDENT_CREATE_FAILED', [], 500);
        }
    }

    public function update(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        try {
            $student = StudentService::updateStudent($id, $data, $actorId);
            Response::success($student, ['message' => 'Student profile updated successfully.']);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'NOT_FOUND', [], 404);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'STUDENT_UPDATE_FAILED', [], 500);
        }
    }

    public function toggleStatus(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $status = $data['status'] ?? 'inactive';
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        try {
            $student = StudentService::toggleStatus($id, $status, $actorId);
            Response::success($student, ['message' => "Student status changed to {$status}."]);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'STUDENT_STATUS_FAILED', [], 500);
        }
    }

    public function enroll(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $studentId = (int)($data['student_id'] ?? 0);
        $batchId = (int)($data['batch_id'] ?? 0);
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        if ($studentId <= 0 || $batchId <= 0) {
            Response::error('Student ID and Batch ID are required.', 'VALIDATION_ERROR', [], 422);
            return;
        }

        try {
            $student = StudentService::enrollBatch($studentId, $batchId, $actorId);
            Response::success($student, ['message' => 'Student enrollment updated successfully.']);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', [], $e->getCode() === 404 ? 404 : 422);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'ENROLLMENT_FAILED', [], 500);
        }
    }
}
