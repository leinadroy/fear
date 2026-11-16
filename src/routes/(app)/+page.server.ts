import { and, asc, count, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { fieldActivities, sites, users, workOrders } from '#lib/server/db/schema.ts';
import { requireUser } from '#lib/server/guard.ts';
import { visibleWorkOrders } from '#lib/server/work-orders.ts';
import { isManager, WO_STATUSES, type WoStatus } from '#lib/enums.ts';
import { startOfTodayWib } from '#lib/datetime.ts';
import type { PageServerLoad } from './$types';

const OPEN_STATUSES: WoStatus[] = ['draft', 'assigned', 'in_progress', 'on_hold'];

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const manager = isManager(user.role);
	const woFilter = visibleWorkOrders(user);
	const ownActivities = manager ? undefined : eq(fieldActivities.userId, user.id);

	const [statusRows, upcoming, ongoing, [today]] = await Promise.all([
		db
			.select({ status: workOrders.status, total: count() })
			.from(workOrders)
			.where(woFilter)
			.groupBy(workOrders.status),

		db
			.select({
				id: workOrders.id,
				woNumber: workOrders.woNumber,
				title: workOrders.title,
				status: workOrders.status,
				priority: workOrders.priority,
				scheduledStart: workOrders.scheduledStart,
				siteName: sites.name
			})
			.from(workOrders)
			.innerJoin(sites, eq(workOrders.siteId, sites.id))
			.where(and(woFilter, inArray(workOrders.status, OPEN_STATUSES)))
			// Yang terjadwal duluan di atas; yang belum dijadwalkan di bawah.
			.orderBy(sql`${workOrders.scheduledStart} is null`, asc(workOrders.scheduledStart))
			.limit(8),

		db
			.select({
				id: fieldActivities.id,
				checkInAt: fieldActivities.checkInAt,
				userName: users.name,
				woId: workOrders.id,
				woNumber: workOrders.woNumber,
				woTitle: workOrders.title
			})
			.from(fieldActivities)
			.innerJoin(users, eq(fieldActivities.userId, users.id))
			.innerJoin(workOrders, eq(fieldActivities.workOrderId, workOrders.id))
			.where(and(eq(fieldActivities.status, 'ongoing'), ownActivities))
			.orderBy(desc(fieldActivities.checkInAt))
			.limit(10),

		db
			.select({ total: count() })
			.from(fieldActivities)
			.where(and(gte(fieldActivities.checkInAt, startOfTodayWib()), ownActivities))
	]);

	const statusCounts = Object.fromEntries(WO_STATUSES.map((s) => [s, 0])) as Record<
		WoStatus,
		number
	>;
	for (const row of statusRows) statusCounts[row.status] = row.total;

	return { statusCounts, upcoming, ongoing, activitiesToday: today?.total ?? 0, manager };
};
