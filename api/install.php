<?php
/**
 * Penginstal FEAR untuk shared hosting (tanpa terminal).
 * Buka https://domain-anda/api/install, isi data database & admin pertama.
 * Membuat tabel, data master awal, akun admin, lalu menulis api/config.php.
 * Setelah config.php ada, halaman ini terkunci otomatis.
 */
declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');

$configFile = __DIR__ . '/config.php';
$installed = is_file($configFile);
$errors = [];
$done = false;
$manualConfig = null;
$v = fn(string $k, string $d = '') => htmlspecialchars((string) ($_POST[$k] ?? $d), ENT_QUOTES);

if (!$installed && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
	$in = fn(string $k) => trim((string) ($_POST[$k] ?? ''));
	$db = [
		'host' => $in('db_host') ?: 'localhost',
		'port' => (int) ($in('db_port') ?: 3306),
		'name' => $in('db_name'),
		'user' => $in('db_user'),
		'pass' => (string) ($_POST['db_pass'] ?? '')
	];
	$adminName = $in('admin_name') ?: 'Administrator';
	$adminEmail = strtolower($in('admin_email'));
	$adminPass = (string) ($_POST['admin_pass'] ?? '');

	if (version_compare(PHP_VERSION, '8.1', '<')) $errors[] = 'FEAR butuh PHP 8.1 atau lebih baru (server ini PHP ' . PHP_VERSION . '). Ubah versi PHP di cPanel → "Select PHP Version".';
	if (!extension_loaded('pdo_mysql')) $errors[] = 'Ekstensi PHP "pdo_mysql" belum aktif. Aktifkan di cPanel → "Select PHP Version" → Extensions.';
	if ($db['name'] === '' || $db['user'] === '') $errors[] = 'Nama database dan user database wajib diisi.';
	if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) $errors[] = 'Email admin tidak valid.';
	if (strlen($adminPass) < 8) $errors[] = 'Password admin minimal 8 karakter.';
	if ($adminPass !== (string) ($_POST['admin_pass2'] ?? '')) $errors[] = 'Konfirmasi password admin tidak sama.';

	if (!$errors) {
		try {
			$pdo = new PDO(
				sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $db['host'], $db['port'], $db['name']),
				$db['user'],
				$db['pass'],
				[PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
			);
			$pdo->exec("SET time_zone = '+00:00'");
			foreach (preg_split('/;\s*\n/', (string) file_get_contents(__DIR__ . '/schema.sql')) as $sql) {
				$sql = trim(preg_replace('/^--.*$/m', '', $sql));
				if ($sql !== '') $pdo->exec($sql);
			}

			$hasUsers = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() > 0;
			if (!$hasUsers) {
				$pdo->prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
					->execute([$adminName, $adminEmail, password_hash($adminPass, PASSWORD_DEFAULT)]);
			}

			$uploads = __DIR__ . '/storage/uploads';
			if (!is_dir($uploads)) @mkdir($uploads, 0755, true);
			if (!is_writable($uploads)) $errors[] = 'Folder api/storage/uploads tidak bisa ditulisi. Ubah permission-nya jadi 755 di File Manager.';

			$config = "<?php\n// Dibuat oleh penginstal FEAR " . gmdate('Y-m-d H:i') . " UTC.\nreturn " . var_export([
				'db' => $db,
				'upload_dir' => '__UPLOADS__',
				'debug' => false
			], true) . ";\n";
			$config = str_replace("'__UPLOADS__'", "__DIR__ . '/storage/uploads'", $config);

			if (@file_put_contents($configFile, $config, LOCK_EX) === false) {
				$manualConfig = $config;
			}
			$done = true;
			$adminNote = $hasUsers
				? 'Database sudah berisi pengguna, jadi akun admin baru tidak dibuat. Login dengan akun yang sudah ada.'
				: "Akun admin $adminEmail sudah dibuat.";
		} catch (PDOException $e) {
			$errors[] = 'Gagal terhubung / membuat tabel: ' . $e->getMessage();
		}
	}
}
?>
<!doctype html>
<html lang="id">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="robots" content="noindex" />
	<title>Instal FEAR</title>
	<style>
		:root { color-scheme: light; }
		* { box-sizing: border-box; }
		body { margin: 0; font: 15px/1.5 system-ui, sans-serif; background: #f8fafc; color: #1e293b; }
		main { max-width: 560px; margin: 40px auto; padding: 0 16px; }
		h1 { margin: 0; font-size: 28px; } .sub { color: #64748b; margin: 2px 0 24px; }
		.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 1px 2px #0000000d; }
		fieldset { border: 0; padding: 0; margin: 0 0 20px; } legend { font-weight: 600; margin-bottom: 8px; }
		label { display: block; margin-bottom: 12px; font-size: 14px; font-weight: 500; color: #334155; }
		input { display: block; width: 100%; margin-top: 4px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font: inherit; }
		.row { display: grid; grid-template-columns: 1fr 110px; gap: 12px; }
		button, .btn { display: inline-block; background: #2563eb; color: #fff; border: 0; border-radius: 6px; padding: 10px 16px; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; }
		.err { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 10px 12px; border-radius: 6px; margin-bottom: 16px; }
		.ok { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; padding: 10px 12px; border-radius: 6px; margin-bottom: 16px; }
		.hint { font-size: 13px; color: #64748b; margin: -6px 0 12px; }
		pre { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
	</style>
</head>
<body>
<main>
	<h1>FEAR</h1>
	<p class="sub">Penginstal — Field Activity Engineering</p>
	<div class="card">
	<?php if ($installed && !$done): ?>
		<p class="ok">FEAR sudah terpasang. Penginstal dikunci.</p>
		<p>Untuk memasang ulang, hapus file <code>api/config.php</code> lewat File Manager.</p>
		<a class="btn" href="/">Buka FEAR</a>
	<?php elseif ($done): ?>
		<p class="ok">Instalasi selesai. <?= htmlspecialchars($adminNote) ?></p>
		<?php if ($errors): ?><p class="err"><?= htmlspecialchars(implode(' ', $errors)) ?></p><?php endif; ?>
		<?php if ($manualConfig): ?>
			<p class="err">File <code>api/config.php</code> tidak bisa dibuat otomatis. Buat file itu lewat File Manager dengan isi berikut:</p>
			<pre><?= htmlspecialchars($manualConfig) ?></pre>
		<?php endif; ?>
		<a class="btn" href="/login">Masuk ke FEAR</a>
	<?php else: ?>
		<?php foreach ($errors as $e): ?><p class="err"><?= htmlspecialchars($e) ?></p><?php endforeach; ?>
		<form method="post" autocomplete="off">
			<fieldset>
				<legend>Database MySQL</legend>
				<p class="hint">Buat dulu database + user di cPanel → "MySQL Databases", dan beri user tersebut ALL PRIVILEGES.</p>
				<div class="row">
					<label>Host <input name="db_host" value="<?= $v('db_host', 'localhost') ?>" required></label>
					<label>Port <input name="db_port" value="<?= $v('db_port', '3306') ?>" inputmode="numeric"></label>
				</div>
				<label>Nama database <input name="db_name" value="<?= $v('db_name') ?>" placeholder="mis. akunanda_fear" required></label>
				<label>User database <input name="db_user" value="<?= $v('db_user') ?>" placeholder="mis. akunanda_fear" required></label>
				<label>Password database <input name="db_pass" type="password"></label>
			</fieldset>
			<fieldset>
				<legend>Akun admin pertama</legend>
				<label>Nama <input name="admin_name" value="<?= $v('admin_name', 'Administrator') ?>"></label>
				<label>Email <input name="admin_email" type="email" value="<?= $v('admin_email') ?>" required></label>
				<label>Password (min. 8 karakter) <input name="admin_pass" type="password" minlength="8" required></label>
				<label>Ulangi password <input name="admin_pass2" type="password" minlength="8" required></label>
			</fieldset>
			<button type="submit">Instal FEAR</button>
		</form>
	<?php endif; ?>
	</div>
</main>
</body>
</html>
