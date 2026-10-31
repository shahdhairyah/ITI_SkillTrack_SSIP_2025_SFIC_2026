<?php

namespace App\Services;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $pdo = null;
    private static string $activeDriver = 'mysql';

    public static function getConnection(): PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $configuredConnection = getenv('DB_CONNECTION');
        $connection = $configuredConnection ?: 'mysql';
        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $port = getenv('DB_PORT') ?: '3306';
        $database = getenv('DB_DATABASE') ?: 'iti_skilltrack';
        $username = getenv('DB_USERNAME') ?: 'root';
        $password = getenv('DB_PASSWORD') ?: '';

        $sqliteDatabase = getenv('DB_SQLITE_DATABASE') ?: $database;
        $candidatePaths = array_filter([
            getenv('DB_SQLITE_PATH') ?: '',
            __DIR__ . '/../../database/' . $sqliteDatabase . '.sqlite',
            __DIR__ . '/../database/' . $sqliteDatabase . '.sqlite',
            dirname(__DIR__, 2) . '/database/' . $sqliteDatabase . '.sqlite',
            dirname(__DIR__, 3) . '/database/' . $sqliteDatabase . '.sqlite',
        ]);
        $sqlitePath = __DIR__ . '/../../database/' . $sqliteDatabase . '.sqlite';
        foreach ($candidatePaths as $candidate) {
            if (file_exists($candidate)) {
                $sqlitePath = $candidate;
                break;
            }
        }

        // Zero-config fallback: if no .env was uploaded or DB_CONNECTION is not mysql,
        // and SQLite database is present, use it.
        if (($configuredConnection === false || $configuredConnection === '' || $configuredConnection === 'sqlite') && file_exists($sqlitePath)) {
            $connection = 'sqlite';
        }

        if ($connection === 'sqlite') {
            self::$activeDriver = 'sqlite';
            $dbPath = $sqlitePath;
            $dsn = "sqlite:$dbPath";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            self::$pdo = new PDO($dsn, null, null, $options);
            self::$pdo->exec('PRAGMA foreign_keys = ON;');
            return self::$pdo;
        }

        $dsn = "mysql:host=$host;port=$port;dbname=$database;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 5,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];

        if (defined('PDO::MYSQL_ATTR_CONNECT_TIMEOUT')) {
            $options[PDO::MYSQL_ATTR_CONNECT_TIMEOUT] = 5;
        }

        try {
            self::$pdo = new PDO($dsn, $username, $password, $options);
            self::$activeDriver = 'mysql';
        } catch (PDOException $e) {
            // Explicit opt-in only: production/local should fail loudly if MySQL is unavailable.
            $allowFallback = getenv('DB_FALLBACK_SQLITE') === 'true';
            $message = $e->getMessage();
            $isConnectionFailure = (int)$e->getCode() === 2002
                || stripos($message, 'Connection refused') !== false
                || stripos($message, 'timed out') !== false
                || stripos($message, 'No route to host') !== false
                || stripos($message, 'Unknown MySQL server host') !== false
                || stripos($message, 'getaddrinfo') !== false;

            if ($allowFallback && $isConnectionFailure) {
                $dbPath = $sqlitePath;
                if (!file_exists($dbPath)) {
                    throw new PDOException(
                        "MySQL is unreachable and the SQLite fallback database was not found at database/{$sqliteDatabase}.sqlite. Run: php database/migrate.php",
                        2002
                    );
                }

                self::$activeDriver = 'sqlite';
                $dsn = "sqlite:$dbPath";
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ];
                self::$pdo = new PDO($dsn, null, null, $options);
                self::$pdo->exec('PRAGMA foreign_keys = ON;');
                return self::$pdo;
            }

            // Re-throw with sanitized message (no credentials leaked)
            throw new PDOException("Database connection failed: " . $message, (int)$e->getCode());
        }

        return self::$pdo;
    }

    public static function getActiveDriver(): string
    {
        return self::$activeDriver;
    }

    public static function checkHealth(): array
    {
        $startTime = microtime(true);

        try {
            $pdo = self::getConnection();
            $driver = self::$activeDriver;
            $stmt = $pdo->query('SELECT 1 as ping');
            $ping = $stmt->fetch();
            $latencyMs = round((microtime(true) - $startTime) * 1000, 2);

            $version = $driver === 'mysql' 
                ? $pdo->query('SELECT VERSION()')->fetchColumn()
                : $pdo->query('SELECT sqlite_version()')->fetchColumn();

            // Check if tables exist
            $tableCount = 0;
            if ($driver === 'mysql') {
                $dbName = getenv('DB_DATABASE') ?: 'iti_skilltrack';
                $tableStmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = :db");
                $tableStmt->execute(['db' => $dbName]);
                $tableCount = (int)$tableStmt->fetchColumn();
            } else {
                $tableStmt = $pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
                $tableCount = (int)$tableStmt->fetchColumn();
            }

            return [
                'status' => 'healthy',
                'connection' => $driver,
                'target_driver' => getenv('DB_CONNECTION') ?: 'mysql',
                'server_version' => $version,
                'latency_ms' => $latencyMs,
                'migrated_tables' => $tableCount
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 'unhealthy',
                'connection' => getenv('DB_CONNECTION') ?: 'mysql',
                'error' => $e->getMessage(),
                'suggestion' => 'Verify that MySQL is running or configure DB_CONNECTION in backend/.env'
            ];
        }
    }
}
