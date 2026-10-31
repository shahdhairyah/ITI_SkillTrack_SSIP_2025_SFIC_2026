<?php

namespace App\Middleware;

class CorsMiddleware
{
    public function handle(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        // If no Origin header sent, infer from Referer if present
        if ($origin === '' && !empty($_SERVER['HTTP_REFERER'])) {
            $parsed = parse_url($_SERVER['HTTP_REFERER']);
            if (!empty($parsed['scheme']) && !empty($parsed['host'])) {
                $origin = $parsed['scheme'] . '://' . $parsed['host'] . (!empty($parsed['port']) ? ':' . $parsed['port'] : '');
            }
        }

        $configured = getenv('FRONTEND_ORIGIN') ?: '';
        $allowedOrigins = array_values(array_filter(array_map('trim', explode(',', $configured))));

        // Recognized local origins
        $defaultLocalOrigins = [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:8000',
            'http://127.0.0.1:8000',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost',
            'http://127.0.0.1',
        ];

        // Is wildcard enabled or allowed?
        $hasWildcard = in_array('*', $allowedOrigins, true) || empty($allowedOrigins);

        $isAllowed = false;
        if ($origin !== '') {
            if ($hasWildcard) {
                $isAllowed = true;
            } elseif (in_array($origin, $allowedOrigins, true)) {
                $isAllowed = true;
            } elseif (in_array($origin, $defaultLocalOrigins, true)) {
                $isAllowed = true;
            } else {
                // Check if origin matches current host (same domain)
                $host = $_SERVER['HTTP_HOST'] ?? '';
                if ($host !== '') {
                    $originHost = parse_url($origin, PHP_URL_HOST);
                    $bareHost = explode(':', $host)[0];
                    if ($originHost === $bareHost || $originHost === $host) {
                        $isAllowed = true;
                    }
                }
            }
        }

        if ($isAllowed && $origin !== '') {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Request-ID, X-Session-ID');
            header('Access-Control-Expose-Headers: X-Request-ID, Content-Disposition');
            header('Access-Control-Max-Age: 86400');
        }

        // Respond immediately to OPTIONS preflight requests
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
