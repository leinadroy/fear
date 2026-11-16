import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, count, desc, eq, inArray, notInArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import {
	activityPhotos,
	activityTypes,
	customers,
	fieldActivities,
	sites,
	users,
	workOrderAssignees,
	workOrders
} from '#lib/server/db/schema.ts';
import { enumOf, optDecimal, parseForm, ref } from '#lib/server/form.ts';
import { parseId, requireUser } from '#lib/server/guard.ts';
import { isAssigned } from '#lib/server/work-orders.ts';
import {
	ASSIGNEE_ROLES,
	isManager,
	MANAGER_ROLES,
	WO_STATUSES,
	type WoStatus
} from '#lib/enums.ts';
import type { Actions, PageServerLoad } from './$types';

const CLOSED: WoStatus[] = ['completed', 'cancelled'];

async function getWorkOrder(id: number) {
	const creator = alias(users, 'creator');
	const [wo] = await db
		.select({
			wo: workOrders,
			site: sites,
			customer: { id: customers.id, name: customers.name, phone: customers.phone },
			typeName: activityTypes.name,
			creatorName: creator.name
		})
		.from(workOrders)
		.innerJoin(sites, eq(workOrders.siteId, sites.id))
		.innerJoin(customers, eq(sites.customerId, customers.id))
		.innerJoin(activityTypes, eq(workOrders.activityTypeId, activityTypes.id))
		.innerJoin(creator, eq(workOrders.createdBy, creator.id))
		.where(eq(workOrders.id, id))
		.limit(1);
	if (!wo) error(404, 'Work order tidak ditemukan.');
	return wo;
}

/** Ongoing activity milik user (di WO mana pun), untuk mencegah check-in ganda. */
async function ongoingActivityOf(userId: number) {
	const [row] = await db
		.select({ id: fieldActivities.id, workOrderId: fieldActivities.workOrderId })
		.from(fieldActivities)
		.where(and(eq(fieldActivities.userId, userId), eq(fieldActivities.status, 'ongoing')))
		.limit(1);
	return row ?? null;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const id = parseId(params.id);
	const manager = isManager(user.role);
	const assigned = await isAssigned(id, user.id);
	if (!manager && !assigned) error(403, 'Work order ini tidak ditugaskan kepada Anda.');

	const [detail, assignees, activities, myOngoing] = await Promise.all([
		getWorkOrder(id),
		db
			.select({
				userId: users.id,
				name: users.name,
				phone: users.phone,
				role: workOrderAssignees.role
			})
			.from(workOrderAssignees)
			.innerJoin(users, eq(workOrderAssignees.userId, users.id))
			.where(eq(workOrderAssignees.workOrderId, id))
			.orderBy(desc(eq(workOrderAssignees.role, 'lead')), asc(users.name)),
		db
			.select({
				id: fieldActivities.id,
				userName: users.name,
				checkInAt: fieldActivities.checkInAt,
				checkOutAt: fieldActivities.checkOutAt,
				status: fieldActivities.status,
				notes: fieldActivities.notes,
				photoCount: count(activityPhotos.id)
			})
			.from(fieldActivities)
			.innerJoin(users, eq(fieldActivities.userId, users.id))
			.leftJoin(activityPhotos, eq(activityPhotos.fieldActivityId, fieldActivities.id))
			.where(eq(fieldActivities.workOrderId, id))
			.groupBy(fieldActivities.id)
			.orderBy(desc(fieldActivities.checkInAt)),
		ongoingActivityOf(user.id)
	]);

	// Kandidat petugas: user aktif (engineer/supervisor) yang belum ditugaskan.
	const candidates = manager
		? await db
				.select({ id: users.id, name: users.name, role: users.role })
				.from(users)
				.where(
					and(
						eq(users.isActive, true),
						inArray(users.role, ['engineer', 'supervisor']),
						assignees.length
							? notInArray(
									users.id,
									assignees.map((a) => a.userId)
								)
							: undefined
					)
				)
				.orderBy(asc(users.name))
		: [];

	return {
		...detail,
		assignees,
		activities,
		candidates,
		manager,
		myOngoing,
		canCheckIn: assigned && !CLOSED.includes(detail.wo.status) && !myOngoing
	};
};

export const actions: Actions = {
	assign: async ({ request, locals, params }) => {
		requireUser(locals, MANAGER_ROLES);
		const id = parseId(params.id);
		const { data, failure } = parseForm(
			z.object({ userId: ref('Petugas'), role: enumOf(ASSIGNEE_ROLES, 'Peran') }),
			await request.formData()
		);
		if (failure) return fail(400, { assignError: Object.values(failure.data.errors)[0] });

		await db.transaction(async (tx) => {
			// Hanya boleh satu ketua tim.
			if (data.role === 'lead') {
				await tx
					.update(workOrderAssignees)
					.set({ role: 'member' })
					.where(eq(workOrderAssignees.workOrderId, id));
			}
			await tx
				.insert(workOrderAssignees)
				.values({ workOrderId: id, userId: data.userId, role: data.role })
				.onDuplicateKeyUpdate({ set: { role: data.role } });
			await tx
				.update(workOrders)
				.set({ status: 'assigned' })
				.where(and(eq(workOrders.id, id), eq(workOrders.status, 'draft')));
		});
		return { assigned: true };
	},

	unassign: async ({ request, locals, params }) => {
		requireUser(locals, MANAGER_ROLES);
		const id = parseId(params.id);
		const userId = parseId(String((await request.formData()).get('userId')));

		await db.transaction(async (tx) => {
			await tx
				.delete(workOrderAssignees)
				.where(and(eq(workOrderAssignees.workOrderId, id), eq(workOrderAssignees.userId, userId)));
			const [left] = await tx
				.select({ n: count() })
				.from(workOrderAssignees)
				.where(eq(workOrderAssignees.workOrderId, id));
			if (!left?.n) {
				await tx
					.update(workOrders)
					.set({ status: 'draft' })
					.where(and(eq(workOrders.id, id), eq(workOrders.status, 'assigned')));
			}
		});
		return { unassigned: true };
	},

	status: async ({ request, locals, params }) => {
		requireUser(locals, MANAGER_ROLES);
		const id = parseId(params.id);
		const { data, failure } = parseForm(
			z.object({ status: enumOf(WO_STATUSES, 'Status') }),
			await request.formData()
		);
		if (failure) return fail(400, { statusError: 'Status tidak valid.' });

		await db
			.update(workOrders)
			.set({
				status: data.status,
				completedAt: data.status === 'completed' ? new Date() : null
			})
			.where(eq(workOrders.id, id));
		return { statusSaved: true };
	},

	checkIn: async ({ request, locals, params }) => {
		const user = requireUser(locals);
		const id = parseId(params.id);
		if (!(await isAssigned(id, user.id))) {
			return fail(403, { checkInError: 'Anda tidak ditugaskan di work order ini.' });
		}
		const { wo } = await getWorkOrder(id);
		if (CLOSED.includes(wo.status)) {
			return fail(400, { checkInError: 'Work order sudah ditutup.' });
		}
		const ongoing = await ongoingActivityOf(user.id);
		if (ongoing) {
			return fail(400, {
				checkInError: 'Anda masih check-in di kunjungan lain. Check-out dulu.',
				ongoingId: ongoing.id
			});
		}

		const { data } = parseForm(
			z.object({
				lat: optDecimal(-90, 90, 'Latitude'),
				lng: optDecimal(-180, 180, 'Longitude')
			}),
			await request.formData()
		);

		const activityId = await db.transaction(async (tx) => {
			const [res] = await tx.insert(fieldActivities).values({
				workOrderId: id,
				userId: user.id,
				checkInAt: new Date(),
				checkInLat: data?.lat ?? null,
				checkInLng: data?.lng ?? null
			});
			if (wo.status !== 'in_progress') {
				await tx.update(workOrders).set({ status: 'in_progress' }).where(eq(workOrders.id, id));
			}
			return res.insertId;
		});
		redirect(303, `/activities/${activityId}`);
	},

	delete: async ({ locals, params }) => {
		requireUser(locals, MANAGER_ROLES);
		const id = parseId(params.id);
		const [row] = await db
			.select({ n: count() })
			.from(fieldActivities)
			.where(eq(fieldActivities.workOrderId, id));
		if (row?.n) {
			return fail(409, {
				message: 'WO ini sudah punya riwayat kunjungan. Ubah statusnya jadi "Dibatalkan" saja.'
			});
		}
		await db.delete(workOrders).where(eq(workOrders.id, id));
		redirect(303, '/work-orders');
	}
};
