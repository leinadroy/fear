import { and, asc, eq, inArray, like, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './db';
import {
	activityTypes,
	customers,
	sites,
	users,
	workOrderAssignees,
	workOrders
} from './db/schema';
import { isManager, WO_PRIORITIES } from '../enums';
import type { SessionUser } from './auth';
import { isDuplicate } from './db/errors';
import { enumOf, optText, ref, text } from './form';
import { fromInputDateTime } from '../datetime';

// ─── Form buat / edit WO ─────────────────────────────────────────────────────

const dateTime = (label: string) =>
	z
		.string()
		.optional()
		.transform((v, ctx) => {
			if (!v) return null;
			const d = fromInputDateTime(v);
			if (!d) {
				ctx.addIssue({ code: 'custom', message: `${label} tidak valid.` });
				return z.NEVER;
			}
			return d;
		});

export const workOrderSchema = z
	.object({
		title: text('Judul', 200),
		description: optText(),
		siteId: ref('Lokasi'),
		activityTypeId: ref('Jenis aktivitas'),
		priority: enumOf(WO_PRIORITIES, 'Prioritas'),
		scheduledStart: dateTime('Jadwal mulai'),
		scheduledEnd: dateTime('Jadwal selesai')
	})
	.refine((d) => !d.scheduledStart || !d.scheduledEnd || d.scheduledEnd >= d.scheduledStart, {
		message: 'Jadwal selesai harus setelah jadwal mulai.',
		path: ['scheduledEnd']
	});

/** Pilihan lokasi & jenis aktivitas untuk form. `includeTypeId` = jenis lama walau nonaktif. */
export async function workOrderFormOptions(includeTypeId?: number) {
	const [siteOptions, typeOptions] = await Promise.all([
		db
			.select({ id: sites.id, name: sites.name, code: sites.code, customerName: customers.name })
			.from(sites)
			.innerJoin(customers, eq(sites.customerId, customers.id))
			.orderBy(asc(customers.name), asc(sites.name)),
		db
			.select({ id: activityTypes.id, name: activityTypes.name })
			.from(activityTypes)
			.where(
				includeTypeId
					? or(eq(activityTypes.isActive, true), eq(activityTypes.id, includeTypeId))
					: eq(activityTypes.isActive, true)
			)
			.orderBy(asc(activityTypes.name))
	]);
	return { siteOptions, typeOptions };
}

/** Nama-nama petugas WO, dipisah koma (ketua tim di depan). Dipakai sebagai kolom select. */
export const assigneeNames = sql<string | null>`(
	select group_concat(${users.name} order by ${workOrderAssignees.role} = 'lead' desc, ${users.name} separator ', ')
	from ${workOrderAssignees}
	join ${users} on ${users.id} = ${workOrderAssignees.userId}
	where ${workOrderAssignees.workOrderId} = ${workOrders.id}
)`;

/**
 * Filter WO yang boleh dilihat user: admin/supervisor melihat semua,
 * engineer hanya WO yang ditugaskan kepadanya.
 */
export function visibleWorkOrders(user: SessionUser): SQL | undefined {
	if (isManager(user.role)) return undefined;
	return inArray(
		workOrders.id,
		db
			.select({ id: workOrderAssignees.workOrderId })
			.from(workOrderAssignees)
			.where(eq(workOrderAssignees.userId, user.id))
	);
}

export async function isAssigned(workOrderId: number, userId: number): Promise<boolean> {
	const [row] = await db
		.select({ x: sql`1` })
		.from(workOrderAssignees)
		.where(
			and(eq(workOrderAssignees.workOrderId, workOrderId), eq(workOrderAssignees.userId, userId))
		)
		.limit(1);
	return !!row;
}

/** Nomor WO berikutnya: WO-YYYYMM-0001 (bulan menurut WIB). */
async function nextWoNumber(now = new Date()): Promise<string> {
	const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
	const prefix = `WO-${wib.getUTCFullYear()}${String(wib.getUTCMonth() + 1).padStart(2, '0')}-`;
	const [row] = await db
		.select({ max: sql<string | null>`max(${workOrders.woNumber})` })
		.from(workOrders)
		.where(like(workOrders.woNumber, `${prefix}%`));
	const last = row?.max ? Number(row.max.slice(prefix.length)) : 0;
	return prefix + String(last + 1).padStart(4, '0');
}

/**
 * Insert WO dengan nomor otomatis. Jika dua orang membuat WO bersamaan dan nomornya
 * bentrok (UNIQUE), coba lagi dengan nomor berikutnya.
 */
export async function insertWorkOrder(
	values: Omit<typeof workOrders.$inferInsert, 'woNumber'>
): Promise<number> {
	for (let attempt = 0; attempt < 5; attempt++) {
		const woNumber = await nextWoNumber();
		try {
			const [res] = await db.insert(workOrders).values({ ...values, woNumber });
			return res.insertId;
		} catch (e) {
			if (!isDuplicate(e)) throw e;
		}
	}
	throw new Error('Gagal membuat nomor WO unik, silakan coba lagi.');
}
