<?php

namespace App\Controllers;

use App\Services\GujiTiService;
use App\Support\Request;
use App\Support\Response;

class GujiTiController
{
    public function index(): void
    {
        $list = GujiTiService::listAll();
        Response::success($list);
    }

    public function store(): void
    {
        $body = Request::json();
        $created = GujiTiService::create($body);
        Response::success($created, ['message' => 'ITI added to GUJ-ITI directory.'], 201);
    }
}
