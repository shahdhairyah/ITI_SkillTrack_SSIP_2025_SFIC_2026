<?php

namespace App\Controllers;

use App\Services\AuthService;
use App\Support\Response;

class AuthController
{
    public function login(): void
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: [];

        $identity = trim($data['identity'] ?? $data['email'] ?? $data['username'] ?? '');
        $password = $data['password'] ?? '';

        if (empty($identity) || empty($password)) {
            Response::error('Email/username and password are required.', 'VALIDATION_ERROR', [
                'fields' => [
                    'identity' => empty($identity) ? ['Identity is required.'] : [],
                    'password' => empty($password) ? ['Password is required.'] : []
                ]
            ], 422);
            return;
        }

        try {
            $userPayload = AuthService::login($identity, $password);
            Response::success($userPayload, [
                'message' => 'Login successful.'
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'INVALID_CREDENTIALS', [], 401);
        } catch (\DomainException $e) {
            Response::error($e->getMessage(), 'ACCOUNT_DISABLED', [], 403);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'AUTH_FAILED', [], 500);
        }
    }

    public function logout(): void
    {
        AuthService::logout();
        Response::success(['logged_out' => true], [
            'message' => 'Successfully logged out.'
        ]);
    }

    public function me(): void
    {
        $user = AuthService::getAuthenticatedUser();
        if (!$user) {
            Response::error('Unauthenticated.', 'UNAUTHENTICATED', [], 401);
            return;
        }

        Response::success($user);
    }

    public function csrf(): void
    {
        AuthService::startSession();
        Response::success([
            'csrf_token' => $_SESSION['csrf_token'] ?? ''
        ]);
    }
}
