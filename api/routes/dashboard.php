<?php
declare(strict_types=1);

page('/', function () {
	$user = require_user();
	$manager = is_manager($user['role']);
	[$woWhere, $woParams] = visible_work_orders($user);
	[$ownSql, $ownParams] = $manager ? ['1=1', []] : ['fa.user_id = ?', [$user['id']]];

	$statusCounts = array_fill_keys(WO_STATUSES, 0);
	foreach (rows("SELECT wo.status, COUNT(*) AS total FROM work_orders wo WHERE $woWhere GROUP BY wo.status", $woParams) as $r) {
		$statusCounts[$r['status']] = (int) $r['total'];
	}

	$upcoming = rows(
		"SELECT wo.id, wo.wo_number, wo.title, wo.status, wo.priority, wo.scheduled_start, s.name AS siteName
		 FROM work_orders wo JOIN sites s ON s.id = wo.site_id
		 WHERE $woWhere AND wo.status IN (" . in_list(OPEN_STATUSES) . ')
		 ORDER BY wo.scheduled_start IS NULL, wo.scheduled_start ASC
		 LIMIT 8',
		[...$woParams, ...OPEN_STATUSES]
	);

	$ongoing = rows(
		"SELECT fa.id, fa.check_in_at, u.name AS userName, wo.id AS woId, wo.wo_number, wo.title AS woTitle
		 FROM field_activities fa
		 JOIN users u ON u.id = fa.user_id
		 JOIN work_orders wo ON wo.id = fa.work_order_id
		 WHERE fa.status = 'ongoing' AND $ownSql
		 ORDER BY fa.check_in_at DESC
		 LIMIT 10",
		$ownParams
	);

	// Awal hari ini (00:00 WIB) dalam UTC.
	$todayWib = gmdate('Y-m-d', time() + WIB_OFFSET);
	$startOfToday = gmdate('Y-m-d H:i:s', strtotime("$todayWib 00:00:00 UTC") - WIB_OFFSET);
	$activitiesToday = (int) scalar(
		"SELECT COUNT(*) FROM field_activities fa WHERE fa.check_in_at >= ? AND $ownSql",
		[$startOfToday, ...$ownParams]
	);

	return compact('statusCounts', 'upcoming', 'ongoing', 'activitiesToday', 'manager');
});
