<?php

namespace App\Support;

class Request
{
    public static function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public static function query(string $key, mixed $default = null): mixed
    {
        return $_GET[$key] ?? $default;
    }

    public static function post(string $key, mixed $default = null): mixed
    {
        return $_POST[$key] ?? $default;
    }

    public static function input(string $key, mixed $default = null): mixed
    {
        if (array_key_exists($key, $_POST)) {
            return $_POST[$key];
        }
        if (array_key_exists($key, $_GET)) {
            return $_GET[$key];
        }
        $json = self::json();
        return $json[$key] ?? $default;
    }

    public static function header(string $name, ?string $default = null): ?string
    {
        $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        if (!empty($_SERVER[$serverKey])) {
            return (string)$_SERVER[$serverKey];
        }

        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (is_array($headers)) {
                foreach ($headers as $k => $v) {
                    if (strcasecmp((string)$k, $name) === 0) {
                        return (string)$v;
                    }
                }
            }
        }

        return $default;
    }

    public static function json(): array
    {
        static $cached = null;
        if ($cached !== null) {
            return $cached;
        }

        $raw = file_get_contents('php://input');
        if (!$raw) {
            $cached = [];
            return $cached;
        }

        $decoded = json_decode($raw, true);
        $cached = is_array($decoded) ? $decoded : [];
        return $cached;
    }

    public static function all(): array
    {
        return array_merge($_GET, $_POST, self::json());
    }

    public static function ajax(): bool
    {
        return strtolower(self::header('X-Requested-With', '') ?? '') === 'xmlhttprequest';
    }
}
