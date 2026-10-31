<?php

namespace App\Controllers;

use App\Services\OrganizationService;
use App\Support\Response;

class AcademicPeriodController
{
    public function index(): void
    {
        $periods = OrganizationService::getAllAcademicPeriods();
        Response::success($periods);
    }

    public function store(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        try {
            $period = OrganizationService::createAcademicPeriod($data, $actorId);
            Response::success($period, ['message' => 'Academic period created successfully.'], 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', [], 422);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'ACADEMIC_PERIOD_FAILED', [], 500);
        }
    }

    public function update(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        try {
            $period = OrganizationService::updateAcademicPeriod($id, $data, $actorId);
            Response::success($period, ['message' => 'Academic period updated successfully.']);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', [], $e->getCode() === 404 ? 404 : 422);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'ACADEMIC_PERIOD_UPDATE_FAILED', [], 500);
        }
    }
}
