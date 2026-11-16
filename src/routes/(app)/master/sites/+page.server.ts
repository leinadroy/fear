import { and, asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { customers, sites } from '#lib/server/db/schema.ts';
import { search } from '#lib/server/db/search.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	const customerId = Number(url.searchParams.get('customer')) || null;

	const [items, customerOptions] = await Promise.all([
		db
			.select({
				id: sites.id,
				code: sites.code,
				name: sites.name,
				address: sites.address,
				latitude: sites.latitude,
				longitude: sites.longitude,
				customerName: customers.name
			})
			.from(sites)
			.innerJoin(customers, eq(sites.customerId, customers.id))
			.where(
				and(
					search(q, sites.code, sites.name, sites.address),
					customerId ? eq(sites.customerId, customerId) : undefined
				)
			)
			.orderBy(asc(customers.name), asc(sites.name))
			.limit(200),
		db
			.select({ id: customers.id, name: customers.name })
			.from(customers)
			.orderBy(asc(customers.name))
	]);

	return { items, q, customerId, customerOptions };
};
