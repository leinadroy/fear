import { asc, count, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { customers, sites } from '#lib/server/db/schema.ts';
import { search } from '#lib/server/db/search.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	const items = await db
		.select({
			id: customers.id,
			code: customers.code,
			name: customers.name,
			contactPerson: customers.contactPerson,
			phone: customers.phone,
			siteCount: count(sites.id)
		})
		.from(customers)
		.leftJoin(sites, eq(sites.customerId, customers.id))
		.where(search(q, customers.code, customers.name, customers.contactPerson))
		.groupBy(customers.id)
		.orderBy(asc(customers.name))
		.limit(200);
	return { items, q };
};
