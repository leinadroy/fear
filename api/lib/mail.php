<?php
/**
 * Kirim email teks biasa lewat mail() bawaan PHP (di cPanel langsung jalan tanpa setting SMTP).
 * Saat `debug` = true, setiap email juga ditulis ke api/storage/mail.log
 * agar bisa dites di laptop yang tidak punya server email.
 */
declare(strict_types=1);

/** Alamat dasar aplikasi untuk link di email, mis. https://fear.domainanda.com */
function app_url(): string
{
	$configured = trim((string) (config()['app_url'] ?? ''));
	if ($configured !== '') return rtrim($configured, '/');
	// Cadangan bila app_url belum diisi: ambil dari request. Isi app_url di config.php
	// supaya link tidak bisa dibelokkan lewat header Host palsu.
	$host = (string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? ($_SERVER['HTTP_HOST'] ?? 'localhost'));
	return (is_https() ? 'https' : 'http') . '://' . $host;
}

function mail_from(): string
{
	$from = trim((string) (config()['mail_from'] ?? ''));
	if ($from !== '' && filter_var($from, FILTER_VALIDATE_EMAIL)) return $from;
	$host = (string) parse_url(app_url(), PHP_URL_HOST);
	$host = preg_replace('/^www\./', '', $host ?: 'localhost');
	return "noreply@$host";
}

function send_mail(string $to, string $subject, string $body): bool
{
	$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
	$headers = implode("\r\n", [
		'From: FEAR <' . mail_from() . '>',
		'MIME-Version: 1.0',
		'Content-Type: text/plain; charset=UTF-8',
		'Content-Transfer-Encoding: 8bit'
	]);

	if (config()['debug'] ?? false) {
		$log = dirname(__DIR__) . '/storage/mail.log';
		@file_put_contents(
			$log,
			'=== ' . gmdate('Y-m-d H:i:s') . " UTC\nKepada: $to\nSubjek: $subject\n\n$body\n\n",
			FILE_APPEND | LOCK_EX
		);
	}

	$sent = @mail($to, $encodedSubject, $body, $headers, '-f' . mail_from());
	if (!$sent) error_log('[FEAR] Gagal mengirim email ke ' . $to . ' (cek fungsi mail() di hosting).');
	return $sent;
}
