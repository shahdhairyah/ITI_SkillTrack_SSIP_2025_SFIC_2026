<?php

namespace App\Controllers;

use App\Services\AuthService;
use App\Services\Database;
use App\Services\UserService;
use App\Support\Response;

class UserController
{
    public function index(): void
    {
        $filters = [
            'role' => $_GET['role'] ?? null,
            'status' => $_GET['status'] ?? null,
            'search' => $_GET['search'] ?? null,
        ];

        Response::success(UserService::getUsers($filters));
    }

    public function show(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $user = UserService::getUserById($id);

        if (!$user) {
            Response::error("User #{$id} not found.", 'NOT_FOUND', [], 404);
            return;
        }

        Response::success($user);
    }

    public function store(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;
        $data['institute_id'] = $GLOBALS['CURRENT_USER']['institute_id'] ?? ($data['institute_id'] ?? 1);

        try {
            $user = UserService::createUser($data, $actorId);
            Response::success($user, ['message' => 'User account created successfully.'], 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', [], $e->getCode() === 409 ? 409 : 422);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'USER_CREATE_FAILED', [], 500);
        }
    }

    public function updateRole(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $role = trim($data['role'] ?? '');
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        try {
            $user = UserService::updateRole($id, $role, $actorId);
            Response::success($user, ['message' => 'User role updated successfully.']);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', [], in_array($e->getCode(), [400, 404, 422], true) ? $e->getCode() : 422);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'USER_ROLE_UPDATE_FAILED', [], 500);
        }
    }

    public function toggleStatus(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $status = $data['status'] ?? 'inactive';
        $newStatus = ($status === 'active') ? 'active' : 'inactive';
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        $pdo = Database::getConnection();

        if ($actorId === $id && $newStatus === 'inactive') {
            Response::error('You cannot deactivate your own account.', 'OPERATION_DENIED', [], 400);
            return;
        }

        $stmt = $pdo->prepare('SELECT id, status, role FROM users WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        if (!$user) {
            Response::error("User #{$id} not found.", 'NOT_FOUND', [], 404);
            return;
        }

        if ($user['role'] === 'administrator' && $newStatus === 'inactive') {
            $adminCount = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'administrator' AND status = 'active'")->fetchColumn();
            if ($adminCount <= 1) {
                Response::error('At least one active administrator must remain.', 'OPERATION_DENIED', [], 400);
                return;
            }
        }

        $upd = $pdo->prepare('UPDATE users SET status = :status WHERE id = :id');
        $upd->execute(['status' => $newStatus, 'id' => $id]);

        AuthService::logAudit($actorId, 'USER_STATUS_TOGGLE', 'users', $id, ['status' => $newStatus], ['status' => $user['status']]);

        Response::success([
            'id' => $id,
            'status' => $newStatus,
            'role' => $user['role']
        ], ['message' => "User status successfully changed to {$newStatus}."]);
    }

    public function resetPassword(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $newPassword = $data['password'] ?? '';
        $actorId = $GLOBALS['CURRENT_USER']['id'] ?? null;

        try {
            UserService::resetPassword($id, $newPassword, $actorId);
            Response::success([
                'id' => $id,
                'password_reset' => true
            ], ['message' => 'User password reset successfully.']);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', [], $e->getCode() === 404 ? 404 : 422);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'USER_PASSWORD_RESET_FAILED', [], 500);
        }
    }
}
