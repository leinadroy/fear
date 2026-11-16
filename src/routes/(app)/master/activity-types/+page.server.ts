import { asc } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { activityTypes } from '#lib/server/db/schema.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	items: await db.select().from(activityTypes).orderBy(asc(activityTypes.name))
});
