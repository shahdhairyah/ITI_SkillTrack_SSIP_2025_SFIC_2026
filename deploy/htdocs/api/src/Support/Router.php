<?php

namespace App\Support;

class Router
{
    private array $routes = [];
    private array $middleware = [];

    public function use(callable|string $middleware): self
    {
        $this->middleware[] = $middleware;
        return $this;
    }

    public function get(string $path, callable|array $handler, array $routeMiddleware = []): self
    {
        return $this->addRoute('GET', $path, $handler, $routeMiddleware);
    }

    public function post(string $path, callable|array $handler, array $routeMiddleware = []): self
    {
        return $this->addRoute('POST', $path, $handler, $routeMiddleware);
    }

    public function put(string $path, callable|array $handler, array $routeMiddleware = []): self
    {
        return $this->addRoute('PUT', $path, $handler, $routeMiddleware);
    }

    public function patch(string $path, callable|array $handler, array $routeMiddleware = []): self
    {
        return $this->addRoute('PATCH', $path, $handler, $routeMiddleware);
    }

    public function delete(string $path, callable|array $handler, array $routeMiddleware = []): self
    {
        return $this->addRoute('DELETE', $path, $handler, $routeMiddleware);
    }

    public function options(string $path, callable|array $handler, array $routeMiddleware = []): self
    {
        return $this->addRoute('OPTIONS', $path, $handler, $routeMiddleware);
    }

    private function addRoute(string $method, string $path, callable|array $handler, array $routeMiddleware = []): self
    {
        $this->routes[] = [
            'method' => $method,
            'path' => rtrim($path, '/') ?: '/',
            'handler' => $handler,
            'middleware' => $routeMiddleware
        ];
        return $this;
    }

    public function dispatch(string $method, string $uri): void
    {
        // 1. Run global middleware immediately (CORS, RequestId)
        foreach ($this->middleware as $mw) {
            if (is_callable($mw)) {
                $mw();
            } elseif (is_string($mw) && class_exists($mw)) {
                (new $mw())->handle();
            }
        }

        // 2. Normalize URI
        $parsedUri = parse_url($uri, PHP_URL_PATH) ?? '/';
        $cleanUri = rtrim($parsedUri, '/') ?: '/';

        // Strip index.php or /public/index.php if passed by rewrite
        $cleanUri = preg_replace('#^/+(?:api/)?(?:public/)?index\.php#i', '', $cleanUri);
        $cleanUri = rtrim($cleanUri, '/') ?: '/';

        // Normalize /v1/... to /api/v1/...
        if (str_starts_with($cleanUri, '/v1/')) {
            $cleanUri = '/api' . $cleanUri;
        } elseif ($cleanUri === '/v1') {
            $cleanUri = '/api/v1';
        }

        $methodMatch = false;

        foreach ($this->routes as $route) {
            $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $route['path']);
            $pattern = '#^' . $pattern . '$#';

            if (preg_match($pattern, $cleanUri, $matches)) {
                if ($route['method'] === $method || $method === 'OPTIONS') {
                    // Filter named matches
                    $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);

                    // Execute route-specific middleware
                    foreach ($route['middleware'] as $mw) {
                        if (is_callable($mw)) {
                            $mw();
                        } elseif (is_string($mw) && class_exists($mw)) {
                            (new $mw())->handle();
                        }
                    }

                    // Execute handler
                    $handler = $route['handler'];
                    if (is_callable($handler)) {
                        call_user_func_array($handler, [$params]);
                        return;
                    } elseif (is_array($handler) && count($handler) === 2) {
                        [$class, $action] = $handler;
                        $controller = new $class();
                        $controller->$action($params);
                        return;
                    }
                } else {
                    $methodMatch = true;
                }
            }
        }

        if ($methodMatch) {
            Response::error('Method not allowed', 'METHOD_NOT_ALLOWED', [], 405);
        } else {
            Response::error("Route $cleanUri not found", 'ROUTE_NOT_FOUND', [], 404);
        }
    }
}
