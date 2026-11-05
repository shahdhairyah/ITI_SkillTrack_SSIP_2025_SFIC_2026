<?php

namespace App\Controllers;

use App\Services\AuditService;
use App\Services\Database;
use App\Services\SystemService;
use App\Support\Request;
use App\Support\Response;

class SystemController
{
    private function user(): array
    {
        return $GLOBALS['CURRENT_USER'] ?? [];
    }

    /**
     * Executes the live automated UAT integration test suite.
     */
    public function runUatSuite(): void
    {
        try {
            $results = SystemService::runUatSuite();
            Response::success($results);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'UAT_SUITE_FAILED', [], 500);
        }
    }

    /**
     * Returns reconciliation data between paper registers and digital records.
     */
    public function reconciliation(): void
    {
        $batchId = (int)Request::query('batch_id', 1);
        try {
            $data = SystemService::getReconciliationData($batchId);
            Response::success($data);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'RECONCILIATION_ERROR', [], 500);
        }
    }

    /**
     * Real-time operational health and server diagnostics.
     */
    public function operationalHealth(): void
    {
        try {
            $data = SystemService::getProductionHealth();
            Response::success($data);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'HEALTH_ERROR', [], 500);
        }
    }

    /**
     * 1-Click Rollout of additional vocational trades.
     */
    public function rolloutTrade(): void
    {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $code = $body['trade_code'] ?? '';

        if (empty($code)) {
            Response::error('Trade code is required (e.g. FIT-01, WEL-01, COPA-01).', 'VALIDATION_ERROR', [], 422);
            return;
        }

        $user = $this->user();
        try {
            $result = SystemService::rolloutTrade($code, (int)($user['id'] ?? 1));
            Response::success($result, ['message' => $result['message']], 201);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'ROLLOUT_FAILED', [], 400);
        }
    }

    /**
     * Generates downloadable SQL database backup snapshot.
     */
    public function backup(): void
    {
        $user = $this->user();
        AuditService::log(
            $user['id'] ?? null,
            'DATABASE_BACKUP_TRIGGERED',
            'system',
            1,
            null,
            ['timestamp' => date('c'), 'user' => $user['username'] ?? 'admin']
        );

        $pdo = Database::connection();
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);

        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        $filename = 'iti-skilltrack-backup-' . date('Ymd-His') . '.sql';
        header('Content-Type: application/sql; charset=UTF-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-store, no-cache, must-revalidate');

        echo "-- =========================================================\n";
        echo "-- ITI SkillTrack Institutional Database Snapshot\n";
        echo "-- Generated At: " . date('Y-m-d H:i:s') . "\n";
        echo "-- Engine Driver: " . $driver . "\n";
        echo "-- =========================================================\n\n";

        // If SQLite, provide table structure
        if ($driver === 'sqlite') {
            $tables = $pdo->query("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll();
            foreach ($tables as $t) {
                echo "-- Table: " . $t['name'] . "\n";
                echo $t['sql'] . ";\n\n";
                $rows = $pdo->query("SELECT * FROM " . $t['name'])->fetchAll(\PDO::FETCH_ASSOC);
                foreach ($rows as $r) {
                    $cols = array_keys($r);
                    $vals = array_map(function($v) use ($pdo) {
                        return $v === null ? 'NULL' : $pdo->quote((string)$v);
                    }, array_values($r));
                    echo "INSERT INTO " . $t['name'] . " (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $vals) . ");\n";
                }
                echo "\n";
            }
        } else {
            echo "-- MySQL production dump placeholder\n";
        }
        exit;
    }
}

