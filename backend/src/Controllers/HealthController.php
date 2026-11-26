<?php

namespace App\Controllers;

use App\Services\Database;
use App\Support\Response;

class HealthController
{
    public function check(): void
    {
        $dbHealth = Database::checkHealth();
        
        $overallHealthy = $dbHealth['status'] === 'healthy';

        $payload = [
            'service' => 'ITI SkillTrack API',
            'version' => '3.0.0-phase3',
            'environment' => getenv('APP_ENV') ?: 'local',
            'config_file_loaded' => !empty($GLOBALS['ENV_FILE_LOADED']),
            'timezone' => date_default_timezone_get(),
            'php_version' => PHP_VERSION,
            'extensions' => [
                'pdo' => extension_loaded('pdo'),
                'pdo_mysql' => extension_loaded('pdo_mysql'),
                'pdo_sqlite' => extension_loaded('pdo_sqlite'),
                'sqlite3' => extension_loaded('sqlite3'),
                'openssl' => extension_loaded('openssl'),
                'session' => extension_loaded('session'),
                'json' => extension_loaded('json')
            ],
            'database' => $dbHealth,
            'server_time' => gmdate('Y-m-d\TH:i:s\Z'),
            'uptime_seconds' => microtime(true) - ($_SERVER['REQUEST_TIME_FLOAT'] ?? microtime(true))
        ];

        Response::success($payload, [
            'system_health' => $overallHealthy ? 'OK' : 'DEGRADED'
        ], 200);
    }
}
