<?php

namespace App\Middleware;

class RequestIdMiddleware
{
    public function handle(): void
    {
        $requestId = $_SERVER['HTTP_X_REQUEST_ID'] ?? uniqid('req_', true);
        $GLOBALS['REQUEST_ID'] = $requestId;
        header("X-Request-ID: $requestId");
    }
}
