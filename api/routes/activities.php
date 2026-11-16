<?php
/** Kunjungan lapangan (check-in/out), foto dokumentasi & material terpakai. */
declare(strict_types=1);

const MAX_PHOTOS_PER_UPLOAD = 10;

page('/activities', function () {
	$user = require_user();
	$manager = is_manager($user['role']);
	$q = query_param('q');
	$status = query_param('status');

	[$where, $params] = $manager ? ['1=1', []] : ['fa.user_id = ?', [$user['id']]];
	if (in_array($status, ACTIVITY_STATUSES, true)) {
		$where .= ' AND fa.status = ?';
		$params[] = $status;
	}
	[$searchSql, $searchParams] = search_clause($q, ['wo.wo_number', 'wo.title', 'u.name', 's.name']);

	$items = rows(
		"SELECT fa.id, fa.check_in_at, fa.check_out_at, fa.status, u.name AS userName,
		        wo.id AS woId, wo.wo_number, wo.title AS woTitle, s.name AS siteName, COUNT(p.id) AS photoCount
		 FROM field_activities fa
		 JOIN users u ON u.id = fa.user_id
		 JOIN work_orders wo ON wo.id = fa.work_order_id
		 JOIN sites s ON s.id = wo.site_id
		 LEFT JOIN activity_photos p ON p.field_activity_id = fa.id
		 WHERE $where AND $searchSql
		 GROUP BY fa.id
		 ORDER BY fa.check_in_at DESC
		 LIMIT 200",
		[...$params, ...$searchParams]
	);
	return compact('items', 'q', 'status', 'manager');
});

function get_activity(int $id): array
{
	$activity = row('SELECT * FROM field_activities WHERE id = ? LIMIT 1', [$id]) ?? not_found('Kunjungan tidak ditemukan.');
	return [
		'activity' => $activity,
		'userName' => scalar('SELECT name FROM users WHERE id = ?', [$activity['userId']]),
		'wo' => row('SELECT id, wo_number, title, status FROM work_orders WHERE id = ?', [$activity['workOrderId']]),
		'site' => row(
			'SELECT s.name, s.address, s.latitude, s.longitude FROM sites s JOIN work_orders wo ON wo.site_id = s.id WHERE wo.id = ?',
			[$activity['workOrderId']]
		)
	];
}

/** Pemilik boleh mengubah selama kunjungan berlangsung; admin/supervisor kapan saja (koreksi data). */
function can_edit_activity(array $user, array $activity): bool
{
	return is_manager($user['role']) || ($activity['userId'] === $user['id'] && $activity['status'] === 'ongoing');
}

function editable_activity(array $p): array
{
	$user = require_user();
	$row = get_activity(parse_id($p['id']));
	if (!can_edit_activity($user, $row['activity'])) throw new HttpError(403, 'Kunjungan ini tidak bisa diubah lagi.');
	return $row['activity'];
}

function is_lead(int $workOrderId, int $userId): bool
{
	return (bool) scalar(
		"SELECT 1 FROM work_order_assignees WHERE work_order_id = ? AND user_id = ? AND role = 'lead' LIMIT 1",
		[$workOrderId, $userId]
	);
}

page('/activities/{id}', function ($p) {
	$user = require_user();
	$id = parse_id($p['id']);
	$row = get_activity($id);
	if (!is_manager($user['role']) && $row['activity']['userId'] !== $user['id']) {
		throw new HttpError(403, 'Ini bukan kunjungan Anda.');
	}

	return [
		...$row,
		'photos' => rows('SELECT * FROM activity_photos WHERE field_activity_id = ? ORDER BY created_at, id', [$id]),
		'usedMaterials' => rows(
			'SELECT am.id, am.quantity, am.notes, m.name, m.code, m.unit
			 FROM activity_materials am JOIN materials m ON m.id = am.material_id
			 WHERE am.field_activity_id = ? ORDER BY am.id',
			[$id]
		),
		'materialOptions' => rows('SELECT id, name, unit FROM materials ORDER BY name'),
		'isOwner' => $row['activity']['userId'] === $user['id'],
		'editable' => can_edit_activity($user, $row['activity']),
		// Ketua tim / manager boleh langsung menandai WO selesai saat check-out.
		'canCompleteWo' => is_manager($user['role']) || is_lead($row['wo']['id'], $user['id'])
	];
});

action('/activities/{id}', 'checkOut', function ($p) {
	$user = require_user();
	['activity' => $activity, 'wo' => $wo] = get_activity(parse_id($p['id']));
	if ($activity['userId'] !== $user['id']) fail(403, ['checkOutError' => 'Ini bukan kunjungan Anda.']);
	if ($activity['status'] !== 'ongoing') fail(400, ['checkOutError' => 'Sudah check-out.']);

	$f = new Form();
	$status = $f->enum('status', ['done', 'failed'], 'Hasil');
	$notes = $f->optText('notes');
	$lat = $f->optDecimal('lat', -90, 90, 'Latitude');
	$lng = $f->optDecimal('lng', -180, 180, 'Longitude');
	if ($status === 'failed' && !$notes) $f->error('notes', 'Jelaskan kenapa pekerjaan gagal / tertunda.');
	if (!$f->ok()) fail(400, ['checkOutErrors' => $f->errors, 'values' => $f->values()]);

	$completeWo = ($_POST['completeWo'] ?? '') === 'on' && $status === 'done' &&
		(is_manager($user['role']) || is_lead($wo['id'], $user['id']));

	transaction(function () use ($activity, $wo, $status, $notes, $lat, $lng, $completeWo) {
		update('field_activities', [
			'status' => $status,
			'notes' => $notes,
			'checkOutAt' => now_utc(),
			'checkOutLat' => $lat,
			'checkOutLng' => $lng
		], $activity['id']);
		if ($completeWo) {
			update('work_orders', ['status' => 'completed', 'completedAt' => now_utc()], $wo['id']);
		} elseif ($status === 'failed' && $wo['status'] === 'in_progress') {
			update('work_orders', ['status' => 'on_hold'], $wo['id']);
		}
	});
	return ['checkedOut' => true];
});

action('/activities/{id}', 'uploadPhoto', function ($p) {
	$activity = editable_activity($p);
	$caption = trim((string) ($_POST['caption'] ?? ''));
	$caption = $caption === '' ? null : (function_exists('mb_substr') ? mb_substr($caption, 0, 255) : substr($caption, 0, 255));

	$files = uploaded_files('photos');
	if (!$files) {
		$tooBig = empty($_POST) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0;
		fail(400, ['photoError' => $tooBig
			? 'Total ukuran foto melebihi batas server (' . ini_get('post_max_size') . '). Unggah lebih sedikit foto sekaligus.'
			: 'Pilih minimal satu foto.']);
	}
	if (count($files) > MAX_PHOTOS_PER_UPLOAD) fail(400, ['photoError' => 'Maksimal ' . MAX_PHOTOS_PER_UPLOAD . ' foto sekali upload.']);
	foreach ($files as $file) {
		$problem = validate_photo($file);
		if ($problem) fail(400, ['photoError' => $problem]);
	}

	foreach ($files as $file) {
		insert('activity_photos', [
			'fieldActivityId' => $activity['id'],
			'filePath' => save_photo($activity['id'], $file),
			'caption' => $caption
		]);
	}
	return ['photosUploaded' => count($files)];
});

action('/activities/{id}', 'deletePhoto', function ($p) {
	$activity = editable_activity($p);
	$photo = row(
		'SELECT id, file_path FROM activity_photos WHERE id = ? AND field_activity_id = ?',
		[parse_id($_POST['photoId'] ?? ''), $activity['id']]
	);
	if (!$photo) fail(404, ['photoError' => 'Foto tidak ditemukan.']);
	q('DELETE FROM activity_photos WHERE id = ?', [$photo['id']]);
	delete_upload($photo['filePath']);
	return ['photoDeleted' => true];
});

action('/activities/{id}', 'addMaterial', function ($p) {
	$activity = editable_activity($p);
	$f = new Form();
	$materialId = $f->ref('materialId', 'Material');
	$raw = trim($f->raw('quantity'));
	$quantity = $raw === '' ? 0.0 : (is_numeric($raw) ? (float) $raw : NAN);
	if (is_nan($quantity)) $f->error('quantity', 'Jumlah harus angka.');
	elseif ($quantity <= 0) $f->error('quantity', 'Jumlah harus lebih dari 0.');
	elseif ($quantity > 9999999999) $f->error('quantity', 'Jumlah terlalu besar.');
	$notes = $f->optText('notes', 255);
	if (!$f->ok()) fail(400, ['materialError' => $f->firstError()]);

	insert('activity_materials', [
		'fieldActivityId' => $activity['id'],
		'materialId' => $materialId,
		'quantity' => number_format($quantity, 2, '.', ''),
		'notes' => $notes
	]);
	return ['materialAdded' => true];
});

action('/activities/{id}', 'deleteMaterial', function ($p) {
	$activity = editable_activity($p);
	q('DELETE FROM activity_materials WHERE id = ? AND field_activity_id = ?', [parse_id($_POST['rowId'] ?? ''), $activity['id']]);
	return ['materialDeleted' => true];
});
