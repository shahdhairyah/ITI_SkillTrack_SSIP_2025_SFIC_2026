<?php

namespace App\Controllers;

use App\Services\InstructorService;
use App\Support\Response;

class InstructorController
{
    public function index(): void
    {
        $filters = [
            'status' => $_GET['status'] ?? null,
            'search' => $_GET['search'] ?? null
        ];
        $currentUser = $GLOBALS['CURRENT_USER'] ?? null;
        $instructors = InstructorService::getInstructors($filters, $currentUser);
        Response::success($instructors);
    }

    public function show(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $currentUser = $GLOBALS['CURRENT_USER'] ?? null;

        try {
            $instructor = InstructorService::getInstructorById($id, $currentUser);

            if (!$instructor) {
                Response::error("Instructor #{$id} not found.", 'NOT_FOUND', [], 404);
                return;
            }

            Response::success($instructor);
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
            $instructor = InstructorService::createInstructor($data, $actorId);
            Response::success($instructor, ['message' => 'Instructor created successfully.'], 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', [], $e->getCode() === 409 ? 409 : 422);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'INSTRUCTOR_CREATE_FAILED', [], 500);
        }
    }

    public function update(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        try {
            $instructor = InstructorService::updateInstructor($id, $data, $actorId);
            Response::success($instructor, ['message' => 'Instructor profile updated successfully.']);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'NOT_FOUND', [], 404);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'INSTRUCTOR_UPDATE_FAILED', [], 500);
        }
    }

    public function toggleStatus(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $status = $data['status'] ?? 'inactive';
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        try {
            $instructor = InstructorService::toggleStatus($id, $status, $actorId);
            Response::success($instructor, ['message' => "Instructor status changed to {$status}."]);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'INSTRUCTOR_STATUS_FAILED', [], 500);
        }
    }

    public function assignBatch(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $instructorId = (int)($data['instructor_id'] ?? 0);
        $batchId = (int)($data['batch_id'] ?? 0);
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        if ($instructorId <= 0 || $batchId <= 0) {
            Response::error('Instructor ID and Batch ID are required.', 'VALIDATION_ERROR', [], 422);
            return;
        }

        try {
            $instructor = InstructorService::assignBatch($instructorId, $batchId, $actorId);
            Response::success($instructor, ['message' => 'Batch assigned to instructor successfully.']);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'DUPLICATE_ASSIGNMENT', [], 409);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'ASSIGNMENT_FAILED', [], 500);
        }
    }

    public function removeAssignment(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        try {
            InstructorService::removeBatchAssignment($id, $actorId);
            Response::success(['deleted' => true], ['message' => 'Batch assignment removed.']);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'UNASSIGN_FAILED', [], 500);
        }
    }
}
