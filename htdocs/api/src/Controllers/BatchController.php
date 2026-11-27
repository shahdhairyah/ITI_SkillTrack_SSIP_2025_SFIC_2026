<?php

namespace App\Controllers;

use App\Services\OrganizationService;
use App\Support\Response;

class BatchController
{
    public function index(): void
    {
        $currentUser = $GLOBALS['CURRENT_USER'] ?? null;
        $filters = [
            'trade_id' => $_GET['trade_id'] ?? null,
            'status' => $_GET['status'] ?? null
        ];

        $batches = OrganizationService::getBatches($filters, $currentUser);
        Response::success($batches);
    }

    public function show(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $currentUser = $GLOBALS['CURRENT_USER'] ?? null;

        try {
            $batch = OrganizationService::getBatchById($id, $currentUser);
            if (!$batch) {
                Response::error("Batch #{$id} not found.", 'NOT_FOUND', [], 404);
                return;
            }
            Response::success($batch);
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

        try {
            $batch = OrganizationService::createBatch($data, $actorId);
            Response::success($batch, ['message' => 'Batch created successfully.'], 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', [], 422);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'BATCH_CREATE_FAILED', [], 500);
        }
    }

    public function update(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        try {
            $batch = OrganizationService::updateBatch($id, $data, $actorId);
            Response::success($batch, ['message' => 'Batch updated successfully.']);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'NOT_FOUND', [], 404);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'BATCH_UPDATE_FAILED', [], 500);
        }
    }
}
