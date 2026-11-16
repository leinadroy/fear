<?php
/**
 * Login berbasis sesi. Cookie `fear_session` berisi token acak;
 * database hanya menyimpan hash SHA-256 token tersebut.
 */
declare(strict_types=1);

const SESSION_COOKIE = 'fear_session';
const SESSION_TTL = 30 * 86400;
/** Perpanjang sesi otomatis jika sisa umurnya kurang dari ini. */
const SESSION_RENEW = 15 * 86400;
const MIN_PASSWORD_LENGTH = 8;
const LOGIN_MAX_FAILURES = 5;
const LOGIN_WINDOW = 15 * 60;

function base64url(string $bytes): string
{
	return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
}

function is_https(): bool
{
	return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
		(string) ($_SERVER['SERVER_PORT'] ?? '') === '443' ||
		strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
}

function set_session_cookie(string $token, int $expires): void
{
	setcookie(SESSION_COOKIE, $token, [
		'expires' => $expires,
		'path' => '/',
		'httponly' => true,
		'samesite' => 'Lax',
		'secure' => is_https()
	]);
}

function delete_session_cookie(): void
{
	set_session_cookie('', 1);
}

/** Sesi aktif dari cookie, atau null. Hasil di-cache per request. */
function current_session(): ?array
{
	static $loaded = false, $session = null;
	if ($loaded) return $session;
	$loaded = true;

	$token = $_COOKIE[SESSION_COOKIE] ?? '';
	if (!is_string($token) || $token === '') return null;

	$id = hash('sha256', $token);
	$r = q(
		'SELECT s.expires_at, u.id, u.name, u.email, u.role, u.is_active
		 FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? LIMIT 1',
		[$id]
	)->fetch();
	if (!$r) {
		delete_session_cookie();
		return null;
	}

	$expires = strtotime($r['expires_at'] . ' UTC');
	if (time() >= $expires || !$r['is_active']) {
		q('DELETE FROM sessions WHERE id = ?', [$id]);
		delete_session_cookie();
		return null;
	}
	if ($expires - time() < SESSION_RENEW) {
		$expires = time() + SESSION_TTL;
		q('UPDATE sessions SET expires_at = ? WHERE id = ?', [gmdate('Y-m-d H:i:s', $expires), $id]);
		set_session_cookie($token, $expires);
	}

	return $session = [
		'id' => $id,
		'user' => ['id' => (int) $r['id'], 'name' => $r['name'], 'email' => $r['email'], 'role' => $r['role']]
	];
}

function current_user(): ?array
{
	return current_session()['user'] ?? null;
}

/** Pastikan user login dan (opsional) punya salah satu peran yang diizinkan. */
function require_user(?array $roles = null): array
{
	$user = current_user();
	if (!$user) throw new HttpError(401, 'Silakan login dulu.');
	if ($roles && !in_array($user['role'], $roles, true)) {
		throw new HttpError(403, 'Anda tidak punya akses ke halaman ini.');
	}
	return $user;
}

function create_session(int $userId): void
{
	$token = base64url(random_bytes(32));
	$expires = time() + SESSION_TTL;
	q('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', [
		hash('sha256', $token),
		$userId,
		gmdate('Y-m-d H:i:s', $expires)
	]);
	set_session_cookie($token, $expires);
}

function hash_password(string $password): string
{
	return password_hash($password, PASSWORD_DEFAULT);
}

function verify_password(?string $stored, string $password): bool
{
	if ($stored === null) {
		// Tetap hitung hash walau user tidak ada, agar waktu respons sama.
		password_verify($password, '$2y$10$' . str_repeat('A', 53));
		return false;
	}
	return password_verify($password, $stored);
}

/** Hanya izinkan redirect ke path internal (cegah open redirect). */
function safe_redirect(?string $target): string
{
	if (!$target || $target[0] !== '/' || str_starts_with($target, '//') || str_starts_with($target, '/\\')) {
		return '/';
	}
	return $target;
}
