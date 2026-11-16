<?php
/** Master data: pelanggan, lokasi, jenis aktivitas, material. Akses: admin & supervisor (lihat ROLE_RULES). */
declare(strict_types=1);

/**
 * Daftarkan halaman detail + aksi simpan/hapus untuk satu tabel master.
 * $cfg: base, table, notFound, validate(Form): array, dupMessage, refMessage, load?(item, params): array
 */
function master_crud(array $cfg): void
{
	$base = $cfg['base'];

	page("$base/{id}", function ($p) use ($cfg) {
		$item = null;
		if ($p['id'] !== 'new') {
			$item = row("SELECT * FROM `{$cfg['table']}` WHERE id = ? LIMIT 1", [parse_id($p['id'])]) ?? not_found($cfg['notFound']);
		}
		$data = ['item' => $item];
		return isset($cfg['load']) ? $cfg['load']($data, $p) : $data;
	});

	action("$base/{id}", 'save', function ($p) use ($cfg, $base) {
		$f = new Form();
		$data = $cfg['validate']($f);
		$f->check();
		try {
			if ($p['id'] === 'new') insert($cfg['table'], $data);
			else update($cfg['table'], $data, parse_id($p['id']));
		} catch (PDOException $e) {
			if (is_duplicate($e)) $f->failWith(['code' => $cfg['dupMessage']]);
			throw $e;
		}
		redirect_to($base);
	});

	action("$base/{id}", 'delete', function ($p) use ($cfg, $base) {
		try {
			q("DELETE FROM `{$cfg['table']}` WHERE id = ?", [parse_id($p['id'])]);
		} catch (PDOException $e) {
			if (is_referenced($e)) fail(409, ['message' => $cfg['refMessage']]);
			throw $e;
		}
		redirect_to($base);
	});
}

function customer_options(): array
{
	return rows('SELECT id, name FROM customers ORDER BY name');
}

// ─── Pelanggan ─────────────────────────────────────────────────────────────

page('/master/customers', function () {
	$q = query_param('q');
	[$where, $params] = search_clause($q, ['c.code', 'c.name', 'c.contact_person']);
	$items = rows(
		"SELECT c.id, c.code, c.name, c.contact_person, c.phone, COUNT(s.id) AS siteCount
		 FROM customers c LEFT JOIN sites s ON s.customer_id = c.id
		 WHERE $where GROUP BY c.id ORDER BY c.name LIMIT 200",
		$params
	);
	return compact('items', 'q');
});

master_crud([
	'base' => '/master/customers',
	'table' => 'customers',
	'notFound' => 'Pelanggan tidak ditemukan.',
	'dupMessage' => 'Kode sudah dipakai pelanggan lain.',
	'refMessage' => 'Pelanggan masih punya lokasi. Hapus lokasinya dulu.',
	'validate' => fn(Form $f) => [
		'code' => $f->code('code'),
		'name' => $f->text('name', 'Nama', 150),
		'contactPerson' => $f->optText('contactPerson', 100),
		'phone' => $f->optText('phone', 30),
		'email' => $f->optEmail('email'),
		'address' => $f->optText('address')
	]
]);

// ─── Lokasi ────────────────────────────────────────────────────────────────

page('/master/sites', function () {
	$q = query_param('q');
	$customerId = ctype_digit(query_param('customer')) ? ((int) query_param('customer') ?: null) : null;
	[$where, $params] = search_clause($q, ['s.code', 's.name', 's.address']);
	if ($customerId) {
		$where .= ' AND s.customer_id = ?';
		$params[] = $customerId;
	}
	$items = rows(
		"SELECT s.id, s.code, s.name, s.address, s.latitude, s.longitude, c.name AS customerName
		 FROM sites s JOIN customers c ON c.id = s.customer_id
		 WHERE $where ORDER BY c.name, s.name LIMIT 200",
		$params
	);
	return ['items' => $items, 'q' => $q, 'customerId' => $customerId, 'customerOptions' => customer_options()];
});

master_crud([
	'base' => '/master/sites',
	'table' => 'sites',
	'notFound' => 'Lokasi tidak ditemukan.',
	'dupMessage' => 'Kode sudah dipakai lokasi lain.',
	'refMessage' => 'Lokasi sudah dipakai di work order, tidak bisa dihapus.',
	'validate' => fn(Form $f) => [
		'customerId' => $f->ref('customerId', 'Pelanggan'),
		'code' => $f->code('code'),
		'name' => $f->text('name', 'Nama lokasi', 150),
		'address' => $f->optText('address'),
		'latitude' => $f->optDecimal('latitude', -90, 90, 'Latitude'),
		'longitude' => $f->optDecimal('longitude', -180, 180, 'Longitude')
	],
	'load' => function (array $data, array $p) {
		$isNew = $p['id'] === 'new';
		if ($isNew) {
			$preset = ctype_digit(query_param('customer')) ? (int) query_param('customer') : 0;
			$data['item'] = $preset ? ['customerId' => $preset] : null;
		}
		return [...$data, 'isNew' => $isNew, 'customerOptions' => customer_options()];
	}
]);

// ─── Jenis aktivitas ───────────────────────────────────────────────────────

page('/master/activity-types', fn() => ['items' => rows('SELECT * FROM activity_types ORDER BY name')]);

master_crud([
	'base' => '/master/activity-types',
	'table' => 'activity_types',
	'notFound' => 'Jenis aktivitas tidak ditemukan.',
	'dupMessage' => 'Kode sudah dipakai.',
	'refMessage' => 'Jenis ini sudah dipakai di work order. Nonaktifkan saja agar tidak muncul lagi.',
	'validate' => fn(Form $f) => [
		'code' => $f->code('code'),
		'name' => $f->text('name', 'Nama', 100),
		'description' => $f->optText('description'),
		'isActive' => $f->checkbox('isActive')
	]
]);

// ─── Material ──────────────────────────────────────────────────────────────

page('/master/materials', function () {
	$q = query_param('q');
	[$where, $params] = search_clause($q, ['code', 'name']);
	return ['items' => rows("SELECT * FROM materials WHERE $where ORDER BY name LIMIT 300", $params), 'q' => $q];
});

master_crud([
	'base' => '/master/materials',
	'table' => 'materials',
	'notFound' => 'Material tidak ditemukan.',
	'dupMessage' => 'Kode sudah dipakai.',
	'refMessage' => 'Material sudah tercatat dipakai, tidak bisa dihapus.',
	'validate' => fn(Form $f) => [
		'code' => $f->code('code'),
		'name' => $f->text('name', 'Nama', 150),
		'unit' => $f->text('unit', 'Satuan', 20)
	]
]);
