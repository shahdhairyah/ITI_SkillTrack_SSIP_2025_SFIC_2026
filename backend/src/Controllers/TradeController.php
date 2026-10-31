<?php

namespace App\Controllers;

use App\Services\OrganizationService;
use App\Support\Response;

class TradeController
{
    public function index(): void
    {
        $status = $_GET['status'] ?? null;
        $trades = OrganizationService::getAllTrades($status);
        Response::success($trades);
    }

    public function show(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $trade = OrganizationService::getTradeById($id);

        if (!$trade) {
            Response::error("Trade #{$id} not found.", 'NOT_FOUND', [], 404);
            return;
        }

        Response::success($trade);
    }

    public function store(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        try {
            $trade = OrganizationService::createTrade($data, $actorId);
            Response::success($trade, ['message' => 'Trade created successfully.'], 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', [], $e->getCode() === 409 ? 409 : 422);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'TRADE_CREATE_FAILED', [], 500);
        }
    }

    public function update(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        try {
            $trade = OrganizationService::updateTrade($id, $data, $actorId);
            Response::success($trade, ['message' => 'Trade updated successfully.']);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'NOT_FOUND', [], 404);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'TRADE_UPDATE_FAILED', [], 500);
        }
    }

    public function toggleStatus(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $status = $data['status'] ?? 'inactive';
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        try {
            $trade = OrganizationService::updateTrade($id, ['status' => $status], $actorId);
            Response::success($trade, ['message' => "Trade status changed to {$status}."]);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'TRADE_STATUS_FAILED', [], 500);
        }
    }
}
