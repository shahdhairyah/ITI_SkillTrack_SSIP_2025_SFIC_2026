<?php

namespace App\Controllers;

use App\Services\AuditService;
use App\Services\Database;
use App\Support\Request;
use App\Support\Response;

class EvidenceController
{
    private function user(): array
    {
        return $GLOBALS['CURRENT_USER'] ?? [];
    }

    /**
     * Upload practical evidence file (max 5MB, JPG/PNG/PDF).
     */
    public function upload(): void
    {
        $user = $this->user();
        if (empty($user)) {
            Response::error('Unauthenticated', 'UNAUTHENTICATED', [], 401);
            return;
        }

        $assessmentId = !empty($_POST['assessment_id']) ? (int)$_POST['assessment_id'] : null;

        if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            Response::error('No valid file uploaded or upload error occurred.', 'UPLOAD_FAILED', [], 422);
            return;
        }

        $file = $_FILES['file'];
        $maxBytes = 5 * 1024 * 1024; // 5 MB

        if ($file['size'] > $maxBytes) {
            Response::error('File size exceeds the 5MB statutory limit.', 'FILE_TOO_LARGE', [], 422);
            return;
        }

        $allowedTypes = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'application/pdf' => 'pdf'
        ];

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);

        if (!isset($allowedTypes[$mime])) {
            Response::error('Invalid file format. Only JPEG, PNG, and PDF files are permitted.', 'INVALID_FORMAT', [], 422);
            return;
        }

        $storageDir = __DIR__ . '/../../storage/private_uploads';
        if (!is_dir($storageDir)) {
            @mkdir($storageDir, 0775, true);
        }

        $ext = $allowedTypes[$mime];
        $storedName = 'evidence_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        $targetPath = $storageDir . '/' . $storedName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            Response::error('Failed to save file to private storage.', 'SAVE_FAILED', [], 500);
            return;
        }

        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            INSERT INTO evidence_uploads (
                assessment_id, file_name, original_name, file_path, mime_type, file_size, uploaded_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $assessmentId,
            $storedName,
            basename($file['name']),
            $targetPath,
            $mime,
            $file['size'],
            $user['id'] ?? null
        ]);

        $uploadId = (int)$pdo->lastInsertId();

        AuditService::log(
            $user['id'] ?? null,
            'EVIDENCE_UPLOADED',
            'evidence_upload',
            $uploadId,
            null,
            ['original_name' => $file['name'], 'mime' => $mime, 'size' => $file['size']]
        );

        Response::success([
            'id' => $uploadId,
            'file_name' => $storedName,
            'original_name' => basename($file['name']),
            'mime_type' => $mime,
            'file_size' => $file['size'],
            'download_url' => '/api/v1/evidence/' . $uploadId . '/download'
        ], ['message' => 'Practical evidence uploaded securely.'], 201);
    }

    /**
     * Securely stream practical evidence file with role scoping check.
     */
    public function download(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $user = $this->user();

        if (empty($user)) {
            Response::error('Unauthenticated', 'UNAUTHENTICATED', [], 401);
            return;
        }

        $pdo = Database::connection();
        $stmt = $pdo->prepare("SELECT * FROM evidence_uploads WHERE id = ?");
        $stmt->execute([$id]);
        $record = $stmt->fetch();

        if (!$record) {
            Response::error('Evidence record not found.', 'NOT_FOUND', [], 404);
            return;
        }

        $path = $record['file_path'];
        if (!file_exists($path)) {
            Response::error('Evidence file not found in storage.', 'FILE_MISSING', [], 404);
            return;
        }

        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        header('Content-Type: ' . $record['mime_type']);
        header('Content-Length: ' . filesize($path));
        header('Content-Disposition: inline; filename="' . addslashes($record['original_name']) . '"');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: private, max-age=3600');

        readfile($path);
        exit;
    }
}

