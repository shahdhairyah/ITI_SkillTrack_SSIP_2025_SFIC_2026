<?php

// Test runner for Health & Base API primitives

declare(strict_types=1);

require_once __DIR__ . '/../src/Support/Response.php';
require_once __DIR__ . '/../src/Support/Router.php';
require_once __DIR__ . '/../src/Services/Database.php';
require_once __DIR__ . '/../src/Controllers/HealthController.php';

echo "=== ITI SkillTrack Backend Health & Architecture Tests ===\n\n";

$passCount = 0;
$failCount = 0;

function assertCondition(bool $condition, string $testName): void {
    global $passCount, $failCount;
    if ($condition) {
        echo "[PASS] $testName\n";
        $passCount++;
    } else {
        echo "[FAIL] $testName\n";
        $failCount++;
    }
}

// 1. Test PHP Extensions
assertCondition(extension_loaded('pdo'), 'PHP PDO extension is available');
assertCondition(extension_loaded('pdo_mysql'), 'PHP PDO MySQL extension is available');
assertCondition(extension_loaded('session'), 'PHP Session extension is available');
assertCondition(extension_loaded('openssl'), 'PHP OpenSSL extension is available');
assertCondition(extension_loaded('json'), 'PHP JSON extension is available');

// 2. Test Router & Response Envelope
$router = new \App\Support\Router();
$routeExecuted = false;

$router->get('/api/v1/test', function () use (&$routeExecuted) {
    $routeExecuted = true;
});

// Simulate dispatch
$router->dispatch('GET', '/api/v1/test');
assertCondition($routeExecuted === true, 'Router matches GET /api/v1/test correctly');

// 3. Test Database Health Check logic
$health = \App\Services\Database::checkHealth();
assertCondition(isset($health['status']) && isset($health['connection']), 'Database health check returns structured diagnostic array');
echo "  Note: Database status reported as '" . $health['status'] . "' (" . ($health['error'] ?? 'Connection verified') . ")\n";

echo "\nTest Summary: $passCount Passed, $failCount Failed.\n";
exit($failCount === 0 ? 0 : 1);
