import { error, fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import {
	activityMaterials,
	activityPhotos,
	fieldActivities,
	materials,
	sites,
	users,
	workOrderAssignees,
	workOrders
} from '#lib/server/db/schema.ts';
import { enumOf, optDecimal, optText, parseForm, ref } from '#lib/server/form.ts';
import { parseId, requireUser } from '#lib/server/guard.ts';
import { deleteUpload, savePhoto, validatePhoto } from '#lib/server/uploads.ts';
import { isManager } from '#lib/enums.ts';
import type { SessionUser } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

const MAX_PHOTOS_PER_UPLOAD = 10;

async function getActivity(id: number) {
	const [row] = await db
		.select({
			activity: fieldActivities,
			userName: users.name,
			wo: {
				id: workOrders.id,
				woNumber: workOrders.woNumber,
				title: workOrders.title,
				status: workOrders.status
			},
			site: {
				name: sites.name,
				address: sites.address,
				latitude: sites.latitude,
				longitude: sites.longitude
			}
		})
		.from(fieldActivities)
		.innerJoin(users, eq(fieldActivities.userId, users.id))
		.innerJoin(workOrders, eq(fieldActivities.workOrderId, workOrders.id))
		.innerJoin(sites, eq(workOrders.siteId, sites.id))
		.where(eq(fieldActivities.id, id))
		.limit(1);
	if (!row) error(404, 'Kunjungan tidak ditemukan.');
	return row;
}

/**
 * Siapa boleh mengubah kunjungan: pemiliknya selama masih berlangsung,
 * atau admin/supervisor kapan saja (koreksi data).
 */
function canEdit(user: SessionUser, activity: { userId: number; status: string }) {
	return isManager(user.role) || (activity.userId === user.id && activity.status === 'ongoing');
}

/** Ambil kunjungan + pastikan user boleh mengubahnya. */
async function editableActivity(locals: App.Locals, idParam: string) {
	const user = requireUser(locals);
	const row = await getActivity(parseId(idParam));
	if (!canEdit(user, row.activity)) error(403, 'Kunjungan ini tidak bisa diubah lagi.');
	return { user, ...row };
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const id = parseId(params.id);
	const row = await getActivity(id);
	if (!isManager(user.role) && row.activity.userId !== user.id) {
		error(403, 'Ini bukan kunjungan Anda.');
	}

	const [photos, usedMaterials, materialOptions, [lead]] = await Promise.all([
		db
			.select()
			.from(activityPhotos)
			.where(eq(activityPhotos.fieldActivityId, id))
			.orderBy(asc(activityPhotos.createdAt)),
		db
			.select({
				id: activityMaterials.id,
				quantity: activityMaterials.quantity,
				notes: activityMaterials.notes,
				name: materials.name,
				code: materials.code,
				unit: materials.unit
			})
			.from(activityMaterials)
			.innerJoin(materials, eq(activityMaterials.materialId, materials.id))
			.where(eq(activityMaterials.fieldActivityId, id))
			.orderBy(asc(activityMaterials.id)),
		db
			.select({ id: materials.id, name: materials.name, unit: materials.unit })
			.from(materials)
			.orderBy(asc(materials.name)),
		db
			.select({ userId: workOrderAssignees.userId })
			.from(workOrderAssignees)
			.where(
				and(
					eq(workOrderAssignees.workOrderId, row.wo.id),
					eq(workOrderAssignees.userId, user.id),
					eq(workOrderAssignees.role, 'lead')
				)
			)
			.limit(1)
	]);

	const isOwner = row.activity.userId === user.id;
	return {
		...row,
		photos,
		usedMaterials,
		materialOptions,
		isOwner,
		editable: canEdit(user, row.activity),
		// Ketua tim / manager boleh langsung menandai WO selesai saat check-out.
		canCompleteWo: isManager(user.role) || !!lead
	};
};

export const actions: Actions = {
	checkOut: async ({ request, locals, params }) => {
		const user = requireUser(locals);
		const { activity, wo } = await getActivity(parseId(params.id));
		if (activity.userId !== user.id)
			return fail(403, { checkOutError: 'Ini bukan kunjungan Anda.' });
		if (activity.status !== 'ongoing') return fail(400, { checkOutError: 'Sudah check-out.' });

		const { data, failure } = parseForm(
			z
				.object({
					status: enumOf(['done', 'failed'] as const, 'Hasil'),
					notes: optText(),
					lat: optDecimal(-90, 90, 'Latitude'),
					lng: optDecimal(-180, 180, 'Longitude'),
					completeWo: z.string().optional()
				})
				.refine((d) => d.status !== 'failed' || d.notes, {
					message: 'Jelaskan kenapa pekerjaan gagal / tertunda.',
					path: ['notes']
				}),
			await request.formData()
		);
		if (failure)
			return fail(400, { checkOutErrors: failure.data.errors, values: failure.data.values });

		const [lead] = await db
			.select({ x: workOrderAssignees.userId })
			.from(workOrderAssignees)
			.where(
				and(
					eq(workOrderAssignees.workOrderId, wo.id),
					eq(workOrderAssignees.userId, user.id),
					eq(workOrderAssignees.role, 'lead')
				)
			)
			.limit(1);
		const completeWo =
			data.completeWo === 'on' && data.status === 'done' && (isManager(user.role) || !!lead);

		await db.transaction(async (tx) => {
			await tx
				.update(fieldActivities)
				.set({
					status: data.status,
					notes: data.notes,
					checkOutAt: new Date(),
					checkOutLat: data.lat,
					checkOutLng: data.lng
				})
				.where(eq(fieldActivities.id, activity.id));
			if (completeWo) {
				await tx
					.update(workOrders)
					.set({ status: 'completed', completedAt: new Date() })
					.where(eq(workOrders.id, wo.id));
			} else if (data.status === 'failed' && wo.status === 'in_progress') {
				await tx.update(workOrders).set({ status: 'on_hold' }).where(eq(workOrders.id, wo.id));
			}
		});
		return { checkedOut: true };
	},

	uploadPhoto: async ({ request, locals, params }) => {
		const { activity } = await editableActivity(locals, params.id);
		const formData = await request.formData();
		const files = formData
			.getAll('photos')
			.filter((f): f is File => f instanceof File && f.size > 0);
		const caption =
			String(formData.get('caption') ?? '')
				.trim()
				.slice(0, 255) || null;

		if (files.length === 0) return fail(400, { photoError: 'Pilih minimal satu foto.' });
		if (files.length > MAX_PHOTOS_PER_UPLOAD)
			return fail(400, { photoError: `Maksimal ${MAX_PHOTOS_PER_UPLOAD} foto sekali upload.` });
		for (const file of files) {
			const problem = validatePhoto(file);
			if (problem) return fail(400, { photoError: problem });
		}

		for (const file of files) {
			const filePath = await savePhoto(activity.id, file);
			await db.insert(activityPhotos).values({
				fieldActivityId: activity.id,
				filePath,
				caption,
				takenAt: file.lastModified ? new Date(file.lastModified) : null
			});
		}
		return { photosUploaded: files.length };
	},

	deletePhoto: async ({ request, locals, params }) => {
		const { activity } = await editableActivity(locals, params.id);
		const photoId = parseId(String((await request.formData()).get('photoId')));
		const [photo] = await db
			.select()
			.from(activityPhotos)
			.where(and(eq(activityPhotos.id, photoId), eq(activityPhotos.fieldActivityId, activity.id)))
			.limit(1);
		if (!photo) return fail(404, { photoError: 'Foto tidak ditemukan.' });

		await db.delete(activityPhotos).where(eq(activityPhotos.id, photo.id));
		await deleteUpload(photo.filePath);
		return { photoDeleted: true };
	},

	addMaterial: async ({ request, locals, params }) => {
		const { activity } = await editableActivity(locals, params.id);
		const { data, failure } = parseForm(
			z.object({
				materialId: ref('Material'),
				quantity: z.coerce
					.number({ error: 'Jumlah harus angka.' })
					.positive('Jumlah harus lebih dari 0.')
					.max(9_999_999_999, 'Jumlah terlalu besar.'),
				notes: optText(255)
			}),
			await request.formData()
		);
		if (failure) return fail(400, { materialError: Object.values(failure.data.errors)[0] });

		await db.insert(activityMaterials).values({
			fieldActivityId: activity.id,
			materialId: data.materialId,
			quantity: data.quantity.toFixed(2),
			notes: data.notes
		});
		return { materialAdded: true };
	},

	deleteMaterial: async ({ request, locals, params }) => {
		const { activity } = await editableActivity(locals, params.id);
		const rowId = parseId(String((await request.formData()).get('rowId')));
		await db
			.delete(activityMaterials)
			.where(
				and(eq(activityMaterials.id, rowId), eq(activityMaterials.fieldActivityId, activity.id))
			);
		return { materialDeleted: true };
	}
};
