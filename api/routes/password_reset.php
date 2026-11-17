<?php
/**
 * Lupa password: minta link reset lewat email, lalu atur password baru dari link itu.
 * Link berlaku 60 menit dan hanya bisa dipakai sekali.
 */
declare(strict_types=1);

const RESET_TTL = 60 * 60;
/** Jeda minimal sebelum email reset berikutnya dikirim ke akun yang sama. */
const RESET_RESEND_GAP = 2 * 60;
const RESET_MAX_REQUESTS = 5;

/** Data link reset yang masih berlaku, atau null. */
function find_reset(string $token): ?array
{
	if ($token === '' || strlen($token) > 100) return null;
	$r = q(
		'SELECT r.id, r.user_id, u.email FROM password_resets r JOIN users u ON u.id = r.user_id
		 WHERE r.id = ? AND r.used_at IS NULL AND r.expires_at > UTC_TIMESTAMP() AND u.is_active = 1 LIMIT 1',
		[hash('sha256', $token)]
	)->fetch();
	return $r ?: null;
}

action('/forgot-password', 'default', function () {
	$email = strtolower(trim((string) ($_POST['email'] ?? '')));
	if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
		fail(400, ['email' => $email, 'message' => 'Masukkan alamat email yang valid.']);
	}

	// Batasi permintaan per IP supaya tidak dipakai untuk spam email.
	$key = hash('sha256', 'forgot|' . ($_SERVER['REMOTE_ADDR'] ?? ''));
	$blocked = scalar(
		'SELECT 1 FROM login_attempts WHERE id = ? AND failures >= ? AND reset_at > UTC_TIMESTAMP()',
		[$key, RESET_MAX_REQUESTS]
	);
	if ($blocked) {
		fail(429, ['email' => $email, 'message' => 'Terlalu banyak permintaan. Coba lagi dalam 15 menit.']);
	}
	q(
		'INSERT INTO login_attempts (id, failures, reset_at) VALUES (?, 1, ?)
		 ON DUPLICATE KEY UPDATE
		   failures = IF(reset_at < UTC_TIMESTAMP(), 1, failures + 1),
		   reset_at = IF(reset_at < UTC_TIMESTAMP(), VALUES(reset_at), reset_at)',
		[$key, gmdate('Y-m-d H:i:s', time() + LOGIN_WINDOW)]
	);

	$user = q('SELECT id, name, email FROM users WHERE email = ? AND is_active = 1 LIMIT 1', [$email])->fetch();
	$recent = $user && scalar(
		'SELECT 1 FROM password_resets WHERE user_id = ? AND created_at > UTC_TIMESTAMP() - INTERVAL ? SECOND LIMIT 1',
		[$user['id'], RESET_RESEND_GAP]
	);

	if ($user && !$recent) {
		$token = base64url(random_bytes(32));
		// Link lama otomatis tidak berlaku lagi.
		q('DELETE FROM password_resets WHERE user_id = ?', [$user['id']]);
		q('INSERT INTO password_resets (id, user_id, expires_at) VALUES (?, ?, ?)', [
			hash('sha256', $token),
			$user['id'],
			gmdate('Y-m-d H:i:s', time() + RESET_TTL)
		]);

		$link = app_url() . '/reset-password?token=' . $token;
		send_mail(
			$user['email'],
			'Atur ulang password FEAR',
			"Halo {$user['name']},\n\n" .
				"Ada permintaan untuk mengatur ulang password akun FEAR Anda.\n" .
				"Buka link berikut untuk membuat password baru (berlaku 60 menit, hanya sekali pakai):\n\n" .
				"$link\n\n" .
				"Jika Anda tidak meminta ini, abaikan saja email ini. Password Anda tidak berubah.\n\n" .
				"— FEAR (Field Activity Engineering)\n"
		);
	}

	// Jawaban selalu sama, supaya tidak bisa dipakai untuk menebak email mana yang terdaftar.
	return ['sent' => true, 'email' => $email];
});

page('/reset-password', function () {
	$reset = find_reset(query_param('token'));
	return ['valid' => (bool) $reset, 'email' => $reset['email'] ?? null];
});

action('/reset-password', 'default', function () {
	$token = (string) ($_POST['token'] ?? '');
	$reset = find_reset($token);
	if (!$reset) {
		fail(400, ['expired' => true, 'message' => 'Link reset sudah tidak berlaku. Minta link baru.']);
	}

	$f = new Form();
	$password = password_pair($f);
	if (!$f->ok()) fail(400, ['errors' => $f->errors]);

	transaction(function () use ($reset, $password) {
		$userId = (int) $reset['user_id'];
		update('users', ['passwordHash' => hash_password($password)], $userId);
		q('DELETE FROM password_resets WHERE user_id = ?', [$userId]);
		// Keluarkan semua sesi lama, termasuk perangkat yang mungkin dipakai orang lain.
		q('DELETE FROM sessions WHERE user_id = ?', [$userId]);
	});

	redirect_to('/login?reset=1');
});
