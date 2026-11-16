import { and, asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { users } from '#lib/server/db/schema.ts';
import { search } from '#lib/server/db/search.ts';
import { USER_ROLES, type UserRole } from '#lib/enums.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	const roleParam = url.searchParams.get('role');
	const role = USER_ROLES.includes(roleParam as UserRole) ? (roleParam as UserRole) : null;

	const items = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			phone: users.phone,
			role: users.role,
			isActive: users.isActive
		})
		.from(users)
		.where(and(search(q, users.name, users.email), role ? eq(users.role, role) : undefined))
		.orderBy(asc(users.name))
		.limit(300);

	return { items, q, role };
};
