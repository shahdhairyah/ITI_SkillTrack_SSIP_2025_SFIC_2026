<?php

namespace App\Middleware;

use App\Services\AuthService;
use App\Support\Response;

class CsrfMiddleware
{
    public function handle(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);

        // Safe methods don't need CSRF
        if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }

        // Login endpoint initializes session so CSRF is not yet known
        if ($uri === '/api/v1/auth/login') {
            return;
        }

        // Check if Bearer token or X-Session-ID header is present (API client token-based request)
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        $customSessionId = $_SERVER['HTTP_X_SESSION_ID'] ?? '';
        if ((!empty($authHeader) && str_starts_with($authHeader, 'Bearer ')) || !empty($customSessionId)) {
            // For programmatic API clients passing Bearer token, token itself acts as proof of intent
            return;
        }

        // Cookie-based requests MUST provide matching X-CSRF-Token header
        $csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
        if (!$csrfToken || !AuthService::verifyCsrf($csrfToken)) {
            Response::error('Invalid or missing CSRF token.', 'CSRF_INVALID', [
                'hint' => 'Include X-CSRF-Token header retrieved from /api/v1/auth/me or /api/v1/auth/csrf'
            ], 403);
            return;
        }
    }
}
