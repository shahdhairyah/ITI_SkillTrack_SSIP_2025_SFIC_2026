<?php

namespace App\Middleware;

use App\Services\AuthService;
use App\Support\Response;

class AuthMiddleware
{
    public function handle(): void
    {
        $user = AuthService::getAuthenticatedUser();

        if (!$user) {
            Response::error('Unauthenticated. Please log in to access this resource.', 'UNAUTHENTICATED', [], 401);
            return;
        }

        if ($user['status'] !== 'active') {
            Response::error('Your account is deactivated. Contact administrator.', 'ACCOUNT_DISABLED', [], 403);
            return;
        }

        $GLOBALS['CURRENT_USER'] = $user;
    }
}
