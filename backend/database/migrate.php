<?php

require_once __DIR__ . '/../src/Services/Database.php';

// Simple .env loader
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        [$name, $value] = explode('=', $line, 2) + ['', ''];
        $name = trim($name);
        $value = trim($value);
        if ($name !== '') {
            putenv("$name=$value");
            $_ENV[$name] = $value;
        }
    }
}

echo "=== ITI SkillTrack Database Migration Runner ===\n";
$targetConn = getenv('DB_CONNECTION') ?: 'mysql';
echo "Configured Engine: " . $targetConn . "\n";
echo "Host: " . (getenv('DB_HOST') ?: '127.0.0.1') . ":" . (getenv('DB_PORT') ?: '3306') . "\n";
echo "Database: " . (getenv('DB_DATABASE') ?: 'iti_skilltrack') . "\n\n";

try {
    $isFresh = in_array('--fresh', $argv ?? [], true);

    // If --fresh on SQLite, remove file
    if ($isFresh && ($targetConn === 'sqlite' || file_exists(__DIR__ . '/iti_skilltrack.sqlite'))) {
        @unlink(__DIR__ . '/iti_skilltrack.sqlite');
        echo "[i] Wiped existing SQLite database (--fresh).\n";
    }

    // For MySQL, create the database first if it does not exist yet.
    if ($targetConn === 'mysql') {
        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $port = getenv('DB_PORT') ?: '3306';
        $database = getenv('DB_DATABASE') ?: 'iti_skilltrack';
        $username = getenv('DB_USERNAME') ?: 'root';
        $password = getenv('DB_PASSWORD') ?: '';

        try {
            $serverPdo = new \PDO(
                "mysql:host={$host};port={$port};charset=utf8mb4",
                $username,
                $password,
                [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
            );
            if ($isFresh) {
                $serverPdo->exec("DROP DATABASE IF EXISTS `{$database}`");
                echo "[i] Dropped existing MySQL database (--fresh).\n";
            }
            $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `{$database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            echo "[✓] Database '{$database}' is available\n";
        } catch (\Throwable $e) {
            // If MySQL is not running, let Database::getConnection() fallback to SQLite if in local mode
        }
    }

    $pdo = \App\Services\Database::getConnection();
    $activeDriver = \App\Services\Database::getActiveDriver();
    echo "[✓] Connected successfully to database using engine: {$activeDriver}\n";

    $isSqlite = ($activeDriver === 'sqlite');
    $runSeed = !in_array('--no-seed', $argv ?? [], true);

    // Create migrations tracker table
    if ($isSqlite) {
        $pdo->exec('CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, migration TEXT UNIQUE, executed_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
    } else {
        $pdo->exec('CREATE TABLE IF NOT EXISTS _migrations (id INT AUTO_INCREMENT PRIMARY KEY, migration VARCHAR(255) UNIQUE, executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
    }

    $executed = $pdo->query('SELECT migration FROM _migrations')->fetchAll(\PDO::FETCH_COLUMN) ?: [];

    // Helper to run migration
    $apply = function (string $filePath, string $name) use ($pdo, $executed): void {
        if (in_array($name, $executed, true)) {
            echo "[✓] " . basename($filePath) . " already applied (skipped).\n";
            return;
        }
        if (file_exists($filePath)) {
            echo "[...] Executing " . basename($filePath) . "...\n";
            $sql = file_get_contents($filePath);
            $pdo->exec($sql);
            $stmt = $pdo->prepare('INSERT INTO _migrations (migration) VALUES (:m)');
            $stmt->execute(['m' => $name]);
            echo "[✓] " . basename($filePath) . " applied successfully.\n";
        }
    };

    // 1. Run Schema 001
    $schemaFile = $isSqlite
        ? __DIR__ . '/migrations/001_initial_schema_sqlite.sql'
        : __DIR__ . '/migrations/001_initial_schema.sql';
    $apply($schemaFile, '001_initial_schema');

    // 2. Run Phase 3 Schema 002
    $phase3File = $isSqlite
        ? __DIR__ . '/migrations/002_phase3_attendance_sqlite.sql'
        : __DIR__ . '/migrations/002_phase3_attendance.sql';
    $apply($phase3File, '002_phase3_attendance');

    // 3. Run Seed
    if ($runSeed) {
        $seedFile = $isSqlite
            ? __DIR__ . '/seeds/001_pilot_seed_sqlite.sql'
            : __DIR__ . '/seeds/001_pilot_seed.sql';

        if (file_exists($seedFile)) {
            echo "[...] Executing " . basename($seedFile) . "...\n";
            $seedSql = file_get_contents($seedFile);
            $pdo->exec($seedSql);
            echo "[✓] Pilot seed data inserted successfully.\n";
        }
    } else {
        echo "[i] Seed skipped (--no-seed).\n";
    }

    $health = \App\Services\Database::checkHealth();
    echo "\n=== Migration Complete ===\n";
    echo "Status: " . $health['status'] . "\n";
    echo "Active Driver: " . $health['connection'] . "\n";
    echo "Tables present: " . ($health['migrated_tables'] ?? 'N/A') . "\n";
    echo "Latency: " . ($health['latency_ms'] ?? 0) . " ms\n";
    exit(0);

} catch (\Throwable $e) {
    echo "\n[✗] Migration Failed:\n";
    echo $e->getMessage() . "\n";
    echo "\nTip: If MySQL server is running, make sure the database '" . (getenv('DB_DATABASE') ?: 'iti_skilltrack') . "' exists.\n";
    echo "Command to create: mysql -u root -p -e 'CREATE DATABASE IF NOT EXISTS " . (getenv('DB_DATABASE') ?: 'iti_skilltrack') . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'\n";
    exit(1);
}
