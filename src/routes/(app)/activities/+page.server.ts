import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	activityPhotos,
	fieldActivities,
	sites,
	users,
	workOrders
} from '#lib/server/db/schema.ts';
import { search } from '#lib/server/db/search.ts';
import { requireUser } from '#lib/server/guard.ts';
import { ACTIVITY_STATUSES, isManager, type ActivityStatus } from '#lib/enums.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals);
	const manager = isManager(user.role);
	const q = url.searchParams.get('q') ?? '';
	const status = url.searchParams.get('status') ?? '';

	const items = await db
		.select({
			id: fieldActivities.id,
			checkInAt: fieldActivities.checkInAt,
			checkOutAt: fieldActivities.checkOutAt,
			status: fieldActivities.status,
			userName: users.name,
			woId: workOrders.id,
			woNumber: workOrders.woNumber,
			woTitle: workOrders.title,
			siteName: sites.name,
			photoCount: count(activityPhotos.id)
		})
		.from(fieldActivities)
		.innerJoin(users, eq(fieldActivities.userId, users.id))
		.innerJoin(workOrders, eq(fieldActivities.workOrderId, workOrders.id))
		.innerJoin(sites, eq(workOrders.siteId, sites.id))
		.leftJoin(activityPhotos, eq(activityPhotos.fieldActivityId, fieldActivities.id))
		.where(
			and(
				manager ? undefined : eq(fieldActivities.userId, user.id),
				ACTIVITY_STATUSES.includes(status as ActivityStatus)
					? eq(fieldActivities.status, status as ActivityStatus)
					: undefined,
				search(q, workOrders.woNumber, workOrders.title, users.name, sites.name)
			)
		)
		.groupBy(fieldActivities.id)
		.orderBy(desc(fieldActivities.checkInAt))
		.limit(200);

	return { items, q, status, manager };
};
