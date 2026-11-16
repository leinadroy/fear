<?php
/**
 * Pintu masuk API FEAR. Semua request /api/* dan /files/* diarahkan ke sini (.htaccess).
 *
 * Kontrak dengan frontend (SvelteKit SPA):
 *  - GET  /api/<path halaman>          → data halaman (JSON), atau {message} + status error.
 *  - POST /api/<path halaman>?/<aksi>  → hasil form action: {type: success|failure|redirect|error, ...}.
 */
declare(strict_types=1);

$path = '/' . trim((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');

// Penginstal bisa dibuka sebelum config.php ada.
if ($path === '/api/install') {
	require __DIR__ . '/install.php';
	exit;
}

require __DIR__ . '/lib/core.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/form.php';
require __DIR__ . '/lib/router.php';

date_default_timezone_set('UTC');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

if (!is_file(__DIR__ . '/config.php')) {
	send_json(503, ['message' => 'FEAR belum dipasang.', 'install' => '/api/install']);
	exit;
}

$debug = (bool) (config()['debug'] ?? false);
ini_set('display_errors', '0');

try {
	if (str_starts_with($path . '/', '/files/')) {
		require __DIR__ . '/routes/files.php';
		serve_upload(substr($path, strlen('/files/')));
		exit;
	}
	if (!str_starts_with($path . '/', '/api/')) not_found();

	foreach (glob(__DIR__ . '/routes/*.php') as $file) require_once $file;
	dispatch($_SERVER['REQUEST_METHOD'] ?? 'GET', substr($path, 4) ?: '/');
} catch (Throwable $e) {
	error_log('[FEAR] ' . $e);
	send_json(500, ['message' => $debug ? $e->getMessage() : 'Terjadi kesalahan di server.']);
}
