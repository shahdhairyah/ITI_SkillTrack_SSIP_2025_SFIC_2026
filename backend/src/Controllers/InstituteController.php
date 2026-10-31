<?php

namespace App\Controllers;

use App\Services\OrganizationService;
use App\Support\Response;

class InstituteController
{
    public function show(): void
    {
        $user = $GLOBALS['CURRENT_USER'] ?? null;
        if (!$user) {
            Response::error('Unauthenticated.', 'UNAUTHENTICATED', [], 401);
            return;
        }

        $institute = OrganizationService::getInstituteById((int)$user['institute_id']);
        if (!$institute) {
            Response::error('Institute not found.', 'NOT_FOUND', [], 404);
            return;
        }

        Response::success($institute);
    }

    public function update(): void
    {
        $user = $GLOBALS['CURRENT_USER'] ?? null;
        $data = json_decode(file_get_contents('php://input'), true) ?: [];

        try {
            $institute = OrganizationService::updateInstitute((int)$user['institute_id'], $data, (int)$user['id']);
            Response::success($institute, ['message' => 'Institute settings updated successfully.']);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', [], $e->getCode() === 404 ? 404 : 422);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'INSTITUTE_UPDATE_FAILED', [], 500);
        }
    }
}
