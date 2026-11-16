<?php
declare(strict_types=1);

/** @var array<int, array{0: string, 1: string, 2: callable}> */
$GLOBALS['ROUTES'] = [];

/** Bagian aplikasi yang dibatasi per peran (berlaku untuk data maupun aksi). */
const ROLE_RULES = [
	'/master' => MANAGER_ROLES,
	'/users' => ['admin']
];

/** Data halaman (GET). Pola: '/work-orders/{id}'. */
function page(string $pattern, callable $handler): void
{
	$GLOBALS['ROUTES'][] = ['GET', $pattern, $handler];
}

/** Form action (POST ...?/nama). Nama 'default' untuk form tanpa ?/nama. */
function action(string $pattern, string $name, callable $handler): void
{
	$GLOBALS['ROUTES'][] = ["POST:$name", $pattern, $handler];
}

function send_json(int $status, mixed $body): void
{
	http_response_code($status);
	header('Content-Type: application/json; charset=utf-8');
	echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
}

function match_route(string $key, string $path): ?array
{
	foreach ($GLOBALS['ROUTES'] as [$k, $pattern, $handler]) {
		if ($k !== $key) continue;
		$regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern) . '$#';
		if (preg_match($regex, $path, $m)) {
			return [$handler, array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY)];
		}
	}
	return null;
}

/** Nama action dari query string: "?/save" → "save". */
function action_name(): string
{
	foreach (array_keys($_GET) as $k) {
		if (is_string($k) && str_starts_with($k, '/')) return substr($k, 1);
	}
	return 'default';
}

function role_guard(string $path): void
{
	foreach (ROLE_RULES as $prefix => $roles) {
		if ($path === $prefix || str_starts_with($path, "$prefix/")) {
			$user = require_user();
			if (!in_array($user['role'], $roles, true)) {
				throw new HttpError(403, 'Anda tidak punya akses untuk tindakan ini.');
			}
		}
	}
}

function dispatch(string $method, string $path): void
{
	if ($method === 'POST') {
		dispatch_action($path);
		return;
	}
	if ($method !== 'GET') {
		send_json(405, ['message' => 'Metode tidak didukung.']);
		return;
	}

	try {
		role_guard($path);
		$route = match_route('GET', $path) ?? not_found('Halaman tidak ditemukan.');
		send_json(200, $route[0]($route[1]));
	} catch (HttpError $e) {
		send_json($e->status, ['message' => $e->getMessage()]);
	}
}

function dispatch_action(string $path): void
{
	// Proteksi CSRF: header kustom hanya bisa dikirim dari halaman FEAR sendiri
	// (browser lain domain butuh izin CORS yang tidak pernah kita berikan).
	$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
	$host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? ($_SERVER['HTTP_HOST'] ?? '');
	if (($_SERVER['HTTP_X_FEAR_REQUEST'] ?? '') !== '1' || ($origin && parse_url($origin, PHP_URL_HOST) . (parse_url($origin, PHP_URL_PORT) ? ':' . parse_url($origin, PHP_URL_PORT) : '') !== $host)) {
		send_json(403, ['type' => 'error', 'status' => 403, 'error' => ['message' => 'Permintaan ditolak (CSRF).', 'status' => 403]]);
		return;
	}

	try {
		role_guard($path);
		$route = match_route('POST:' . action_name(), $path) ?? not_found('Aksi tidak ditemukan.');
		$data = $route[0]($route[1]);
		$result = ['type' => 'success', 'status' => 200, 'data' => $data ?? null];
	} catch (ActionResult $r) {
		$result = $r->result;
	} catch (HttpError $e) {
		$result = $e->status === 401
			? ['type' => 'redirect', 'status' => 303, 'location' => '/login']
			: ['type' => 'error', 'status' => $e->status, 'error' => ['message' => $e->getMessage(), 'status' => $e->status]];
	}
	send_json(200, $result);
}
