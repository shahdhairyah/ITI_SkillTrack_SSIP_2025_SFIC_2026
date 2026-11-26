<?php

namespace App\Controllers;

use App\Services\AuditService;
use App\Support\Request;
use App\Support\Response;

class AuditController
{
    /**
     * Retrieve paginated audit logs with search filters.
     * Accessible by Administrator and Monitoring Officer.
     */
    public function index(): void
    {
        $filters = [
            'action' => Request::query('action'),
            'entity_type' => Request::query('entity_type'),
            'actor_user_id' => Request::query('actor_user_id'),
            'date_from' => Request::query('date_from'),
            'date_to' => Request::query('date_to'),
            'limit' => Request::query('limit', 25),
            'offset' => Request::query('offset', 0)
        ];

        $result = AuditService::getLogs($filters);

        Response::success($result['items'], [
            'total' => $result['total'],
            'limit' => $result['limit'],
            'offset' => $result['offset']
        ]);
    }
}

