<?php

namespace App\Services;

use App\Support\Response;
use PDO;

class GujiTiService
{
    private static bool $schemaChecked = false;

    public static function ensureSchema(PDO $db): void
    {
        if (self::$schemaChecked) {
            return;
        }

        $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'sqlite') {
            $db->exec("
                CREATE TABLE IF NOT EXISTS itis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    code TEXT NOT NULL DEFAULT '',
                    city TEXT NOT NULL,
                    state TEXT NOT NULL DEFAULT 'Gujarat',
                    status TEXT NOT NULL DEFAULT 'active',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            ");
        } else {
            $db->exec("
                CREATE TABLE IF NOT EXISTS itis (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    code VARCHAR(50) NOT NULL DEFAULT '',
                    city VARCHAR(255) NOT NULL,
                    state VARCHAR(100) NOT NULL DEFAULT 'Gujarat',
                    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
        }

        // Seed default Gujarat ITIs in different cities if table is empty
        $count = (int)$db->query('SELECT COUNT(*) FROM itis')->fetchColumn();
        if ($count === 0) {
            $seed = $db->prepare('INSERT INTO itis (name, code, city, state, status) VALUES (:name, :code, :city, :state, :status)');
            $defaults = [
                ['name' => 'Government ITI Kubernagar', 'code' => 'GUJ-AMD-01', 'city' => 'Ahmedabad', 'state' => 'Gujarat', 'status' => 'active'],
                ['name' => 'Government ITI Majura Gate', 'code' => 'GUJ-SRT-01', 'city' => 'Surat', 'state' => 'Gujarat', 'status' => 'active'],
                ['name' => 'Government ITI Aji Dam', 'code' => 'GUJ-RJK-01', 'city' => 'Rajkot', 'state' => 'Gujarat', 'status' => 'active'],
            ];
            foreach ($defaults as $row) {
                $seed->execute($row);
            }
        }

        self::$schemaChecked = true;
    }

    public static function listAll(): array
    {
        $db = Database::getConnection();
        self::ensureSchema($db);
        $stmt = $db->query('SELECT id, name, code, city, state, status, created_at FROM itis ORDER BY name ASC');
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function create(array $data): array
    {
        $db = Database::getConnection();
        self::ensureSchema($db);

        $name = trim((string)($data['name'] ?? ''));
        $city = trim((string)($data['city'] ?? ''));
        $code = trim((string)($data['code'] ?? ''));
        $status = ($data['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';

        if ($name === '' || $city === '') {
            Response::error('ITI name and city are required.', 'VALIDATION_ERROR', [], 422);
        }

        $stmt = $db->prepare('INSERT INTO itis (name, code, city, state, status) VALUES (:name, :code, :city, :state, :status)');
        $stmt->execute([
            ':name' => $name,
            ':code' => $code,
            ':city' => $city,
            ':state' => 'Gujarat',
            ':status' => $status,
        ]);

        $id = (int)$db->lastInsertId();
        $row = $db->prepare('SELECT id, name, code, city, state, status, created_at FROM itis WHERE id = :id');
        $row->execute([':id' => $id]);
        return $row->fetch(PDO::FETCH_ASSOC) ?: ['id' => $id, 'name' => $name, 'code' => $code, 'city' => $city, 'state' => 'Gujarat', 'status' => $status];
    }
}
