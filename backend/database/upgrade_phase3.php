<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Services/Database.php';

$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        if (str_starts_with(trim($line), '#')) {
            continue;
        }
        [$name, $value] = explode('=', $line, 2) + ['', ''];
        $name = trim($name);
        if ($name !== '') {
            putenv("$name=" . trim($value));
            $_ENV[$name] = trim($value);
        }
    }
}

echo "=== ITI SkillTrack Phase 3 Attendance Upgrade ===\n";

try {
    $pdo = \App\Services\Database::getConnection();
    $driver = \App\Services\Database::getActiveDriver();

    $hasStatusTable = false;
    if ($driver === 'mysql') {
        $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'attendance_statuses'");
        $hasStatusTable = (int)$stmt->fetchColumn() > 0;
    } else {
        $stmt = $pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'attendance_statuses'");
        $hasStatusTable = (int)$stmt->fetchColumn() > 0;
    }

    $hasSessionType = false;
    if ($driver === 'mysql') {
        $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'training_sessions' AND column_name = 'session_type'");
        $hasSessionType = (int)$stmt->fetchColumn() > 0;
    } else {
        foreach ($pdo->query('PRAGMA table_info(training_sessions)')->fetchAll() as $column) {
            if ($column['name'] === 'session_type') {
                $hasSessionType = true;
                break;
            }
        }
    }

    if ($hasStatusTable && $hasSessionType) {
        echo "[i] Phase 3 schema is already applied. Nothing to do.\n";
        exit(0);
    }
    if ($hasStatusTable || $hasSessionType) {
        throw new RuntimeException('Phase 3 appears partially applied. Restore the database backup before retrying.');
    }

    $file = __DIR__ . '/migrations/' . ($driver === 'mysql' ? '002_phase3_attendance.sql' : '002_phase3_attendance_sqlite.sql');
    echo "[...] Applying " . basename($file) . "...\n";
    $pdo->exec(file_get_contents($file));
    echo "[✓] Phase 3 attendance schema applied.\n";
    echo "[✓] Attendance statuses and 80% policy seed applied.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "[✗] Upgrade failed: " . $e->getMessage() . "\n");
    exit(1);
}
