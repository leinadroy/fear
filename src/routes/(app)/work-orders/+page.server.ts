import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { activityTypes, customers, sites, workOrders } from '#lib/server/db/schema.ts';
import { search } from '#lib/server/db/search.ts';
import { requireUser } from '#lib/server/guard.ts';
import { assigneeNames, visibleWorkOrders } from '#lib/server/work-orders.ts';
import {
	isManager,
	WO_PRIORITIES,
	WO_STATUSES,
	type WoPriority,
	type WoStatus
} from '#lib/enums.ts';
import type { PageServerLoad } from './$types';

const OPEN: WoStatus[] = ['draft', 'assigned', 'in_progress', 'on_hold'];

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals);
	const q = url.searchParams.get('q') ?? '';
	const status = url.searchParams.get('status') ?? '';
	const priority = url.searchParams.get('priority') ?? '';

	const statusFilter =
		status === 'open'
			? inArray(workOrders.status, OPEN)
			: WO_STATUSES.includes(status as WoStatus)
				? eq(workOrders.status, status as WoStatus)
				: undefined;
	const priorityFilter = WO_PRIORITIES.includes(priority as WoPriority)
		? eq(workOrders.priority, priority as WoPriority)
		: undefined;

	const items = await db
		.select({
			id: workOrders.id,
			woNumber: workOrders.woNumber,
			title: workOrders.title,
			status: workOrders.status,
			priority: workOrders.priority,
			scheduledStart: workOrders.scheduledStart,
			siteName: sites.name,
			customerName: customers.name,
			typeName: activityTypes.name,
			assignees: assigneeNames
		})
		.from(workOrders)
		.innerJoin(sites, eq(workOrders.siteId, sites.id))
		.innerJoin(customers, eq(sites.customerId, customers.id))
		.innerJoin(activityTypes, eq(workOrders.activityTypeId, activityTypes.id))
		.where(
			and(
				visibleWorkOrders(user),
				statusFilter,
				priorityFilter,
				search(q, workOrders.woNumber, workOrders.title, sites.name, customers.name)
			)
		)
		.orderBy(desc(workOrders.createdAt))
		.limit(200);

	return { items, q, status, priority, manager: isManager(user.role) };
};
