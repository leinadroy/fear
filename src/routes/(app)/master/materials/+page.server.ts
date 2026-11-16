import { asc } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { materials } from '#lib/server/db/schema.ts';
import { search } from '#lib/server/db/search.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	const items = await db
		.select()
		.from(materials)
		.where(search(q, materials.code, materials.name))
		.orderBy(asc(materials.name))
		.limit(300);
	return { items, q };
};
