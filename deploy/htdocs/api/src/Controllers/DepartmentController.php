<?php

namespace App\Controllers;

use App\Services\OrganizationService;
use App\Support\Response;

class DepartmentController
{
    public function index(): void
    {
        $user = $GLOBALS['CURRENT_USER'] ?? null;
        $departments = OrganizationService::getDepartments((int)$user['institute_id']);
        Response::success($departments);
    }

    public function store(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $user = $GLOBALS['CURRENT_USER'] ?? null;
        $data['institute_id'] = (int)$user['institute_id'];

        try {
            $department = OrganizationService::createDepartment($data, (int)$user['id']);
            Response::success($department, ['message' => 'Department created successfully.'], 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', [], $e->getCode() === 409 ? 409 : 422);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'DEPARTMENT_CREATE_FAILED', [], 500);
        }
    }

    public function update(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $user = $GLOBALS['CURRENT_USER'] ?? null;

        try {
            $department = OrganizationService::updateDepartment($id, $data, (int)$user['id']);
            Response::success($department, ['message' => 'Department updated successfully.']);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', [], $e->getCode() === 404 ? 404 : 422);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'DEPARTMENT_UPDATE_FAILED', [], 500);
        }
    }
}
