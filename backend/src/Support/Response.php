<?php

namespace App\Support;

class Response
{
    public static function json(array $payload, int $statusCode = 200, array $headers = []): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=UTF-8');
        header('X-Content-Type-Options: nosniff');
        
        foreach ($headers as $key => $val) {
            header("$key: $val");
        }

        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        exit;
    }

    public static function success(mixed $data = null, array $meta = [], int $statusCode = 200): void
    {
        $responseMeta = array_merge([
            'request_id' => $GLOBALS['REQUEST_ID'] ?? uniqid('req_', true),
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
            'api_version' => '1.0'
        ], $meta);

        self::json([
            'status' => 'success',
            'data' => $data,
            'meta' => $responseMeta
        ], $statusCode);
    }

    public static function error(string $message, string $code = 'SERVER_ERROR', array $details = [], int $statusCode = 500): void
    {
        $responseMeta = [
            'request_id' => $GLOBALS['REQUEST_ID'] ?? uniqid('req_', true),
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
            'api_version' => '1.0'
        ];

        self::json([
            'status' => 'error',
            'error' => [
                'code' => $code,
                'message' => $message,
                'details' => $details
            ],
            'meta' => $responseMeta
        ], $statusCode);
    }
}
