<?php

namespace App\Services;

use App\Support\Request;

class AuditService
{
    /**
     * Standardized append-only audit logger.
     */
    public static function log(
        ?int $actorUserId,
        string $action,
        string $entityType,
        int $entityId,
        $before = null,
        $after = null,
        ?string $requestId = null
    ): void {
        try {
            $pdo = Database::connection();
            $reqId = $requestId ?? Request::header('X-Request-Id') ?? ('req_' . bin2hex(random_bytes(8)));

            $beforeJson = $before !== null ? (is_string($before) ? $before : json_encode($before)) : null;
            $afterJson = $after !== null ? (is_string($after) ? $after : json_encode($after)) : null;

            $stmt = $pdo->prepare("
                INSERT INTO audit_logs (
                    actor_user_id, action, entity_type, entity_id, request_id, before_json, after_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $actorUserId,
                $action,
                $entityType,
                $entityId,
                $reqId,
                $beforeJson,
                $afterJson
            ]);
        } catch (\Throwable $e) {
            // Never break primary transaction on audit log write failure, but record to system log
            error_log("AuditService Error: " . $e->getMessage());
        }
    }

    /**
     * Retrieve paginated and filtered audit logs.
     */
    public static function getLogs(array $filters = []): array
    {
        $pdo = Database::connection();
        $conditions = ["1=1"];
        $params = [];

        if (!empty($filters['action'])) {
            $conditions[] = "a.action LIKE ?";
            $params[] = '%' . $filters['action'] . '%';
        }

        if (!empty($filters['entity_type'])) {
            $conditions[] = "a.entity_type = ?";
            $params[] = $filters['entity_type'];
        }

        if (!empty($filters['actor_user_id'])) {
            $conditions[] = "a.actor_user_id = ?";
            $params[] = (int)$filters['actor_user_id'];
        }

        if (!empty($filters['date_from'])) {
            $conditions[] = "DATE(a.created_at) >= ?";
            $params[] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $conditions[] = "DATE(a.created_at) <= ?";
            $params[] = $filters['date_to'];
        }

        $whereClause = implode(" AND ", $conditions);

        // Count total matching
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM audit_logs a WHERE {$whereClause}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $limit = isset($filters['limit']) ? min(100, max(1, (int)$filters['limit'])) : 25;
        $offset = isset($filters['offset']) ? max(0, (int)$filters['offset']) : 0;

        $sql = "
            SELECT 
                a.id,
                a.actor_user_id,
                a.action,
                a.entity_type,
                a.entity_id,
                a.request_id,
                a.before_json,
                a.after_json,
                a.created_at,
                u.username as actor_username,
                u.first_name as actor_first_name,
                u.last_name as actor_last_name
            FROM audit_logs a
            LEFT JOIN users u ON a.actor_user_id = u.id
            WHERE {$whereClause}
            ORDER BY a.id DESC
            LIMIT {$limit} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll();

        $items = [];
        foreach ($records as $row) {
            $items[] = [
                'id' => (int)$row['id'],
                'actor_user_id' => $row['actor_user_id'] ? (int)$row['actor_user_id'] : null,
                'actor_name' => $row['actor_first_name'] ? trim($row['actor_first_name'] . ' ' . $row['actor_last_name']) : ($row['actor_username'] ?? 'System / Anonymous'),
                'action' => $row['action'],
                'entity_type' => $row['entity_type'],
                'entity_id' => (int)$row['entity_id'],
                'request_id' => $row['request_id'],
                'before' => $row['before_json'] ? json_decode($row['before_json'], true) : null,
                'after' => $row['after_json'] ? json_decode($row['after_json'], true) : null,
                'created_at' => $row['created_at']
            ];
        }

        return [
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'items' => $items
        ];
    }
}

