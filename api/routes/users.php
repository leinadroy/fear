<?php
/** Manajemen pengguna. Akses: admin saja (lihat ROLE_RULES). */
declare(strict_types=1);

page('/users', function () {
	$q = query_param('q');
	$role = in_array(query_param('role'), USER_ROLES, true) ? query_param('role') : null;
	[$where, $params] = search_clause($q, ['name', 'email']);
	if ($role) {
		$where .= ' AND role = ?';
		$params[] = $role;
	}
	$items = rows("SELECT id, name, email, phone, role, is_active FROM users WHERE $where ORDER BY name LIMIT 300", $params);
	return compact('items', 'q', 'role');
});

page('/users/{id}', function ($p) {
	if ($p['id'] === 'new') return ['item' => null];
	$item = row('SELECT id, name, email, phone, role, is_active, created_at FROM users WHERE id = ? LIMIT 1', [parse_id($p['id'])]);
	return ['item' => $item ?? not_found('Pengguna tidak ditemukan.')];
});

function user_profile(Form $f): array
{
	return [
		'name' => $f->text('name', 'Nama', 100),
		'email' => $f->email('email'),
		'phone' => $f->optText('phone', 30),
		'role' => $f->enum('role', USER_ROLES, 'Peran'),
		'isActive' => $f->checkbox('isActive')
	];
}

function password_pair(Form $f): string
{
	$password = $f->password('password');
	if ($f->raw('passwordConfirm') !== $password) $f->error('passwordConfirm', 'Konfirmasi password tidak sama.');
	return $password;
}

action('/users/{id}', 'save', function ($p) {
	$me = require_user(['admin']);
	$f = new Form();
	$data = user_profile($f);

	try {
		if ($p['id'] === 'new') {
			$password = password_pair($f);
			$f->check();
			$id = insert('users', [...$data, 'passwordHash' => hash_password($password)]);
			redirect_to("/users/$id?saved=1");
		}

		$id = parse_id($p['id']);
		$f->check();
		// Jangan sampai admin mengunci dirinya sendiri.
		if ($id === $me['id'] && ($data['role'] !== 'admin' || !$data['isActive'])) {
			$f->failWith(['role' => 'Anda tidak bisa menurunkan peran atau menonaktifkan akun sendiri.']);
		}
		update('users', $data, $id);
		if (!$data['isActive']) q('DELETE FROM sessions WHERE user_id = ?', [$id]);
	} catch (PDOException $e) {
		if (is_duplicate($e)) $f->failWith(['email' => 'Email sudah dipakai akun lain.']);
		throw $e;
	}
	redirect_to('/users');
});

action('/users/{id}', 'password', function ($p) {
	$me = require_user(['admin']);
	$id = parse_id($p['id']);
	$f = new Form();
	$password = password_pair($f);
	if (!$f->ok()) fail(400, ['pwErrors' => $f->errors]);

	update('users', ['passwordHash' => hash_password($password)], $id);
	// Paksa login ulang di semua perangkat milik user tsb (kecuali sesi admin yang sedang dipakai).
	if ($id !== $me['id']) q('DELETE FROM sessions WHERE user_id = ?', [$id]);
	return ['pwSaved' => true];
});

action('/users/{id}', 'delete', function ($p) {
	$me = require_user(['admin']);
	$id = parse_id($p['id']);
	if ($id === $me['id']) fail(400, ['message' => 'Anda tidak bisa menghapus akun sendiri.']);
	try {
		q('DELETE FROM users WHERE id = ?', [$id]);
	} catch (PDOException $e) {
		if (is_referenced($e)) {
			fail(409, ['message' => 'Pengguna ini sudah punya riwayat (work order / aktivitas). Nonaktifkan saja akunnya.']);
		}
		throw $e;
	}
	redirect_to('/users');
});
