<?php
declare(strict_types=1);

page('/me', fn() => ['user' => current_user()]);

action('/login', 'default', function () {
	$email = strtolower(trim((string) ($_POST['email'] ?? '')));
	$password = (string) ($_POST['password'] ?? '');
	if ($email === '' || $password === '') {
		fail(400, ['email' => $email, 'message' => 'Email dan password wajib diisi.']);
	}

	// Pembatas percobaan login: per IP + email.
	$key = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . $email);
	$locked = scalar(
		'SELECT 1 FROM login_attempts WHERE id = ? AND failures >= ? AND reset_at > UTC_TIMESTAMP()',
		[$key, LOGIN_MAX_FAILURES]
	);
	if ($locked) {
		fail(429, ['email' => $email, 'message' => 'Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.']);
	}

	$user = q('SELECT id, password_hash, is_active FROM users WHERE email = ? LIMIT 1', [$email])->fetch() ?: null;
	$valid = verify_password($user['password_hash'] ?? null, $password);

	if (!$user || !$valid) {
		q(
			'INSERT INTO login_attempts (id, failures, reset_at) VALUES (?, 1, ?)
			 ON DUPLICATE KEY UPDATE
			   failures = IF(reset_at < UTC_TIMESTAMP(), 1, failures + 1),
			   reset_at = IF(reset_at < UTC_TIMESTAMP(), VALUES(reset_at), reset_at)',
			[$key, gmdate('Y-m-d H:i:s', time() + LOGIN_WINDOW)]
		);
		fail(400, ['email' => $email, 'message' => 'Email atau password salah.']);
	}
	if (!$user['is_active']) {
		fail(403, ['email' => $email, 'message' => 'Akun ini dinonaktifkan. Hubungi admin.']);
	}

	q('DELETE FROM login_attempts WHERE id = ? OR reset_at < UTC_TIMESTAMP() - INTERVAL 1 DAY', [$key]);
	create_session((int) $user['id']);
	redirect_to(safe_redirect(query_param('redirectTo') ?: null));
});

action('/logout', 'default', function () {
	$session = current_session();
	if ($session) q('DELETE FROM sessions WHERE id = ?', [$session['id']]);
	delete_session_cookie();
	redirect_to('/login');
});
