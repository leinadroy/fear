<?php
declare(strict_types=1);

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Filter WO yang boleh dilihat user: admin/supervisor melihat semua,
 * engineer hanya WO yang ditugaskan kepadanya. Return [sql, params] untuk alias `wo`.
 */
function visible_work_orders(array $user): array
{
	if (is_manager($user['role'])) return ['1=1', []];
	return ['wo.id IN (SELECT work_order_id FROM work_order_assignees WHERE user_id = ?)', [$user['id']]];
}

function is_assigned(int $workOrderId, int $userId): bool
{
	return (bool) scalar('SELECT 1 FROM work_order_assignees WHERE work_order_id = ? AND user_id = ? LIMIT 1', [$workOrderId, $userId]);
}

/** Validasi form buat / edit WO. */
function work_order_input(): array
{
	$f = new Form();
	$data = [
		'title' => $f->text('title', 'Judul', 200),
		'description' => $f->optText('description'),
		'siteId' => $f->ref('siteId', 'Lokasi'),
		'activityTypeId' => $f->ref('activityTypeId', 'Jenis aktivitas'),
		'priority' => $f->enum('priority', WO_PRIORITIES, 'Prioritas'),
		'scheduledStart' => $f->dateTime('scheduledStart', 'Jadwal mulai'),
		'scheduledEnd' => $f->dateTime('scheduledEnd', 'Jadwal selesai')
	];
	if ($f->ok() && $data['scheduledStart'] && $data['scheduledEnd'] && $data['scheduledEnd'] < $data['scheduledStart']) {
		$f->error('scheduledEnd', 'Jadwal selesai harus setelah jadwal mulai.');
	}
	$f->check();
	return $data;
}

/** Pilihan lokasi & jenis aktivitas untuk form. `$includeTypeId` = jenis lama walau nonaktif. */
function work_order_form_options(?int $includeTypeId = null): array
{
	return [
		'siteOptions' => rows(
			'SELECT s.id, s.name, s.code, c.name AS customerName
			 FROM sites s JOIN customers c ON c.id = s.customer_id ORDER BY c.name, s.name'
		),
		'typeOptions' => rows(
			'SELECT id, name FROM activity_types WHERE is_active = 1 OR id = ? ORDER BY name',
			[$includeTypeId ?? 0]
		)
	];
}

/** Insert WO dengan nomor otomatis WO-YYYYMM-0001 (bulan menurut WIB); ulangi jika nomor bentrok. */
function insert_work_order(array $values): int
{
	$prefix = 'WO-' . gmdate('Ym', time() + WIB_OFFSET) . '-';
	for ($attempt = 0; $attempt < 5; $attempt++) {
		$max = scalar('SELECT MAX(wo_number) FROM work_orders WHERE wo_number LIKE ?', [$prefix . '%']);
		$next = $prefix . str_pad((string) ($max ? (int) substr($max, strlen($prefix)) + 1 : 1), 4, '0', STR_PAD_LEFT);
		try {
			return insert('work_orders', [...$values, 'woNumber' => $next]);
		} catch (PDOException $e) {
			if (!is_duplicate($e)) throw $e;
		}
	}
	throw new RuntimeException('Gagal membuat nomor WO unik, silakan coba lagi.');
}

function get_work_order(int $id): array
{
	$wo = row('SELECT * FROM work_orders WHERE id = ? LIMIT 1', [$id]) ?? not_found('Work order tidak ditemukan.');
	return [
		'wo' => $wo,
		'site' => row('SELECT * FROM sites WHERE id = ?', [$wo['siteId']]),
		'customer' => row(
			'SELECT c.id, c.name, c.phone FROM customers c JOIN sites s ON s.customer_id = c.id WHERE s.id = ?',
			[$wo['siteId']]
		),
		'typeName' => scalar('SELECT name FROM activity_types WHERE id = ?', [$wo['activityTypeId']]),
		'creatorName' => scalar('SELECT name FROM users WHERE id = ?', [$wo['createdBy']])
	];
}

/** Kunjungan yang masih berlangsung milik user (di WO mana pun), untuk mencegah check-in ganda. */
function ongoing_activity_of(int $userId): ?array
{
	return row("SELECT id, work_order_id FROM field_activities WHERE user_id = ? AND status = 'ongoing' LIMIT 1", [$userId]);
}

// ─── Daftar & buat baru ──────────────────────────────────────────────────────

page('/work-orders', function () {
	$user = require_user();
	$q = query_param('q');
	$status = query_param('status');
	$priority = query_param('priority');

	[$where, $params] = visible_work_orders($user);
	if ($status === 'open') {
		$where .= ' AND wo.status IN (' . in_list(OPEN_STATUSES) . ')';
		array_push($params, ...OPEN_STATUSES);
	} elseif (in_array($status, WO_STATUSES, true)) {
		$where .= ' AND wo.status = ?';
		$params[] = $status;
	}
	if (in_array($priority, WO_PRIORITIES, true)) {
		$where .= ' AND wo.priority = ?';
		$params[] = $priority;
	}
	[$searchSql, $searchParams] = search_clause($q, ['wo.wo_number', 'wo.title', 's.name', 'c.name']);

	$items = rows(
		"SELECT wo.id, wo.wo_number, wo.title, wo.status, wo.priority, wo.scheduled_start,
		        s.name AS siteName, c.name AS customerName, t.name AS typeName,
		        (SELECT GROUP_CONCAT(u.name ORDER BY a.role = 'lead' DESC, u.name SEPARATOR ', ')
		         FROM work_order_assignees a JOIN users u ON u.id = a.user_id
		         WHERE a.work_order_id = wo.id) AS assignees
		 FROM work_orders wo
		 JOIN sites s ON s.id = wo.site_id
		 JOIN customers c ON c.id = s.customer_id
		 JOIN activity_types t ON t.id = wo.activity_type_id
		 WHERE $where AND $searchSql
		 ORDER BY wo.created_at DESC, wo.id DESC
		 LIMIT 200",
		[...$params, ...$searchParams]
	);
	return ['items' => $items, 'q' => $q, 'status' => $status, 'priority' => $priority, 'manager' => is_manager($user['role'])];
});

page('/work-orders/new', function () {
	require_user(MANAGER_ROLES);
	return work_order_form_options();
});

action('/work-orders/new', 'default', function () {
	$user = require_user(MANAGER_ROLES);
	$data = work_order_input();
	$id = insert_work_order([...$data, 'createdBy' => $user['id'], 'status' => 'draft']);
	redirect_to("/work-orders/$id");
});

// ─── Edit ────────────────────────────────────────────────────────────────────

page('/work-orders/{id}/edit', function ($p) {
	require_user(MANAGER_ROLES);
	$item = row('SELECT * FROM work_orders WHERE id = ? LIMIT 1', [parse_id($p['id'])]) ?? not_found('Work order tidak ditemukan.');
	return ['item' => $item, ...work_order_form_options($item['activityTypeId'])];
});

action('/work-orders/{id}/edit', 'default', function ($p) {
	require_user(MANAGER_ROLES);
	$id = parse_id($p['id']);
	update('work_orders', work_order_input(), $id);
	redirect_to("/work-orders/$id");
});

// ─── Detail & aksi ───────────────────────────────────────────────────────────

page('/work-orders/{id}', function ($p) {
	$user = require_user();
	$id = parse_id($p['id']);
	$manager = is_manager($user['role']);
	$assigned = is_assigned($id, $user['id']);
	if (!$manager && !$assigned) throw new HttpError(403, 'Work order ini tidak ditugaskan kepada Anda.');

	$detail = get_work_order($id);
	$assignees = rows(
		"SELECT u.id AS userId, u.name, u.phone, a.role
		 FROM work_order_assignees a JOIN users u ON u.id = a.user_id
		 WHERE a.work_order_id = ? ORDER BY a.role = 'lead' DESC, u.name",
		[$id]
	);
	$activities = rows(
		'SELECT fa.id, u.name AS userName, fa.check_in_at, fa.check_out_at, fa.status, fa.notes, COUNT(p.id) AS photoCount
		 FROM field_activities fa
		 JOIN users u ON u.id = fa.user_id
		 LEFT JOIN activity_photos p ON p.field_activity_id = fa.id
		 WHERE fa.work_order_id = ?
		 GROUP BY fa.id ORDER BY fa.check_in_at DESC',
		[$id]
	);
	$myOngoing = ongoing_activity_of($user['id']);

	// Kandidat petugas: user aktif (engineer/supervisor) yang belum ditugaskan.
	$candidates = $manager
		? rows(
			"SELECT id, name, role FROM users
			 WHERE is_active = 1 AND role IN ('engineer', 'supervisor')
			   AND id NOT IN (SELECT user_id FROM work_order_assignees WHERE work_order_id = ?)
			 ORDER BY name",
			[$id]
		)
		: [];

	return [
		...$detail,
		'assignees' => $assignees,
		'activities' => $activities,
		'candidates' => $candidates,
		'manager' => $manager,
		'myOngoing' => $myOngoing,
		'canCheckIn' => $assigned && !in_array($detail['wo']['status'], CLOSED_STATUSES, true) && !$myOngoing
	];
});

action('/work-orders/{id}', 'assign', function ($p) {
	require_user(MANAGER_ROLES);
	$id = parse_id($p['id']);
	$f = new Form();
	$userId = $f->ref('userId', 'Petugas');
	$role = $f->enum('role', ASSIGNEE_ROLES, 'Peran');
	if (!$f->ok()) fail(400, ['assignError' => $f->firstError()]);

	transaction(function () use ($id, $userId, $role) {
		// Hanya boleh satu ketua tim.
		if ($role === 'lead') q("UPDATE work_order_assignees SET role = 'member' WHERE work_order_id = ?", [$id]);
		q(
			'INSERT INTO work_order_assignees (work_order_id, user_id, role) VALUES (?, ?, ?)
			 ON DUPLICATE KEY UPDATE role = VALUES(role)',
			[$id, $userId, $role]
		);
		q("UPDATE work_orders SET status = 'assigned' WHERE id = ? AND status = 'draft'", [$id]);
	});
	return ['assigned' => true];
});

action('/work-orders/{id}', 'unassign', function ($p) {
	require_user(MANAGER_ROLES);
	$id = parse_id($p['id']);
	$userId = parse_id($_POST['userId'] ?? '');
	transaction(function () use ($id, $userId) {
		q('DELETE FROM work_order_assignees WHERE work_order_id = ? AND user_id = ?', [$id, $userId]);
		if (!scalar('SELECT COUNT(*) FROM work_order_assignees WHERE work_order_id = ?', [$id])) {
			q("UPDATE work_orders SET status = 'draft' WHERE id = ? AND status = 'assigned'", [$id]);
		}
	});
	return ['unassigned' => true];
});

action('/work-orders/{id}', 'status', function ($p) {
	require_user(MANAGER_ROLES);
	$id = parse_id($p['id']);
	$status = (string) ($_POST['status'] ?? '');
	if (!in_array($status, WO_STATUSES, true)) fail(400, ['statusError' => 'Status tidak valid.']);
	update('work_orders', ['status' => $status, 'completedAt' => $status === 'completed' ? now_utc() : null], $id);
	return ['statusSaved' => true];
});

action('/work-orders/{id}', 'checkIn', function ($p) {
	$user = require_user();
	$id = parse_id($p['id']);
	if (!is_assigned($id, $user['id'])) fail(403, ['checkInError' => 'Anda tidak ditugaskan di work order ini.']);
	$wo = get_work_order($id)['wo'];
	if (in_array($wo['status'], CLOSED_STATUSES, true)) fail(400, ['checkInError' => 'Work order sudah ditutup.']);
	$ongoing = ongoing_activity_of($user['id']);
	if ($ongoing) {
		fail(400, ['checkInError' => 'Anda masih check-in di kunjungan lain. Check-out dulu.', 'ongoingId' => $ongoing['id']]);
	}

	$f = new Form();
	$lat = $f->optDecimal('lat', -90, 90, 'Latitude');
	$lng = $f->optDecimal('lng', -180, 180, 'Longitude');

	$activityId = transaction(function () use ($id, $user, $wo, $lat, $lng) {
		$activityId = insert('field_activities', [
			'workOrderId' => $id,
			'userId' => $user['id'],
			'checkInAt' => now_utc(),
			'checkInLat' => $lat,
			'checkInLng' => $lng
		]);
		if ($wo['status'] !== 'in_progress') q("UPDATE work_orders SET status = 'in_progress' WHERE id = ?", [$id]);
		return $activityId;
	});
	redirect_to("/activities/$activityId");
});

action('/work-orders/{id}', 'delete', function ($p) {
	require_user(MANAGER_ROLES);
	$id = parse_id($p['id']);
	if (scalar('SELECT COUNT(*) FROM field_activities WHERE work_order_id = ?', [$id])) {
		fail(409, ['message' => 'WO ini sudah punya riwayat kunjungan. Ubah statusnya jadi "Dibatalkan" saja.']);
	}
	q('DELETE FROM work_orders WHERE id = ?', [$id]);
	redirect_to('/work-orders');
});
