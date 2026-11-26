<?php

namespace App\Middleware;

use App\Support\Response;

class RoleMiddleware
{
    public static function requireRoles(array $allowedRoles): \Closure
    {
        return function () use ($allowedRoles) {
            $user = $GLOBALS['CURRENT_USER'] ?? null;
            if (!$user) {
                Response::error('Unauthenticated.', 'UNAUTHENTICATED', [], 401);
                return;
            }

            if (!in_array($user['role'], $allowedRoles, true)) {
                Response::error('Forbidden: You do not have permission to perform this action.', 'FORBIDDEN', [
                    'current_role' => $user['role'],
                    'required_roles' => $allowedRoles
                ], 403);
                return;
            }
        };
    }

    public static function requireAdmin(): \Closure
    {
        return self::requireRoles(['administrator']);
    }

    public static function requireStaff(): \Closure
    {
        return self::requireRoles(['administrator', 'instructor']);
    }
}
