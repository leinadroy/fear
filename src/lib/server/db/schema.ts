import { relations } from 'drizzle-orm';
import {
	bigint,
	boolean,
	datetime,
	decimal,
	index,
	mysqlEnum,
	mysqlTable,
	primaryKey,
	text,
	timestamp,
	varchar
} from 'drizzle-orm/mysql-core';

/** Primary key BIGINT UNSIGNED AUTO_INCREMENT (`serial` Drizzle tidak valid di MariaDB). */
const pk = () => bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey();

/** FK ke primary key di atas. */
const fk = (name: string) => bigint(name, { mode: 'number', unsigned: true });

const timestamps = {
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow()
};

const lat = (name: string) => decimal(name, { precision: 10, scale: 7 });
const lng = (name: string) => decimal(name, { precision: 10, scale: 7 });

// ─── Pengguna ────────────────────────────────────────────────────────────────

export const USER_ROLES = ['admin', 'supervisor', 'engineer'] as const;

export const users = mysqlTable('users', {
	id: pk(),
	name: varchar('name', { length: 100 }).notNull(),
	email: varchar('email', { length: 150 }).notNull().unique(),
	phone: varchar('phone', { length: 30 }),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	role: mysqlEnum('role', USER_ROLES).notNull().default('engineer'),
	isActive: boolean('is_active').notNull().default(true),
	...timestamps
});

// ─── Master: pelanggan, lokasi, jenis aktivitas, material ────────────────────

export const customers = mysqlTable('customers', {
	id: pk(),
	code: varchar('code', { length: 30 }).notNull().unique(),
	name: varchar('name', { length: 150 }).notNull(),
	contactPerson: varchar('contact_person', { length: 100 }),
	phone: varchar('phone', { length: 30 }),
	email: varchar('email', { length: 150 }),
	address: text('address'),
	...timestamps
});

export const sites = mysqlTable(
	'sites',
	{
		id: pk(),
		customerId: fk('customer_id')
			.notNull()
			.references(() => customers.id, { onDelete: 'restrict' }),
		code: varchar('code', { length: 30 }).notNull().unique(),
		name: varchar('name', { length: 150 }).notNull(),
		address: text('address'),
		latitude: lat('latitude'),
		longitude: lng('longitude'),
		...timestamps
	},
	(t) => [index('sites_customer_idx').on(t.customerId)]
);

export const activityTypes = mysqlTable('activity_types', {
	id: pk(),
	code: varchar('code', { length: 30 }).notNull().unique(),
	name: varchar('name', { length: 100 }).notNull(),
	description: text('description'),
	isActive: boolean('is_active').notNull().default(true)
});

export const materials = mysqlTable('materials', {
	id: pk(),
	code: varchar('code', { length: 30 }).notNull().unique(),
	name: varchar('name', { length: 150 }).notNull(),
	unit: varchar('unit', { length: 20 }).notNull(),
	...timestamps
});

// ─── Work order (penugasan pekerjaan) ────────────────────────────────────────

export const WO_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const WO_STATUSES = [
	'draft',
	'assigned',
	'in_progress',
	'on_hold',
	'completed',
	'cancelled'
] as const;

export const workOrders = mysqlTable(
	'work_orders',
	{
		id: pk(),
		woNumber: varchar('wo_number', { length: 30 }).notNull().unique(),
		title: varchar('title', { length: 200 }).notNull(),
		description: text('description'),
		siteId: fk('site_id')
			.notNull()
			.references(() => sites.id, { onDelete: 'restrict' }),
		activityTypeId: fk('activity_type_id')
			.notNull()
			.references(() => activityTypes.id, { onDelete: 'restrict' }),
		priority: mysqlEnum('priority', WO_PRIORITIES).notNull().default('medium'),
		status: mysqlEnum('status', WO_STATUSES).notNull().default('draft'),
		scheduledStart: datetime('scheduled_start'),
		scheduledEnd: datetime('scheduled_end'),
		completedAt: datetime('completed_at'),
		createdBy: fk('created_by')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		...timestamps
	},
	(t) => [
		index('wo_site_idx').on(t.siteId),
		index('wo_status_idx').on(t.status),
		index('wo_scheduled_idx').on(t.scheduledStart)
	]
);

export const ASSIGNEE_ROLES = ['lead', 'member'] as const;

export const workOrderAssignees = mysqlTable(
	'work_order_assignees',
	{
		workOrderId: fk('work_order_id')
			.notNull()
			.references(() => workOrders.id, { onDelete: 'cascade' }),
		userId: fk('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		role: mysqlEnum('role', ASSIGNEE_ROLES).notNull().default('member'),
		assignedAt: timestamp('assigned_at').notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.workOrderId, t.userId] }), index('woa_user_idx').on(t.userId)]
);

// ─── Aktivitas lapangan (check-in / check-out per kunjungan) ─────────────────

export const ACTIVITY_STATUSES = ['ongoing', 'done', 'failed'] as const;

export const fieldActivities = mysqlTable(
	'field_activities',
	{
		id: pk(),
		workOrderId: fk('work_order_id')
			.notNull()
			.references(() => workOrders.id, { onDelete: 'cascade' }),
		userId: fk('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		checkInAt: datetime('check_in_at').notNull(),
		checkInLat: lat('check_in_lat'),
		checkInLng: lng('check_in_lng'),
		checkOutAt: datetime('check_out_at'),
		checkOutLat: lat('check_out_lat'),
		checkOutLng: lng('check_out_lng'),
		status: mysqlEnum('status', ACTIVITY_STATUSES).notNull().default('ongoing'),
		notes: text('notes'),
		...timestamps
	},
	(t) => [
		index('fa_wo_idx').on(t.workOrderId),
		index('fa_user_checkin_idx').on(t.userId, t.checkInAt)
	]
);

export const activityPhotos = mysqlTable(
	'activity_photos',
	{
		id: pk(),
		fieldActivityId: fk('field_activity_id')
			.notNull()
			.references(() => fieldActivities.id, { onDelete: 'cascade' }),
		filePath: varchar('file_path', { length: 500 }).notNull(),
		caption: varchar('caption', { length: 255 }),
		takenAt: datetime('taken_at'),
		latitude: lat('latitude'),
		longitude: lng('longitude'),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(t) => [index('ap_activity_idx').on(t.fieldActivityId)]
);

export const activityMaterials = mysqlTable(
	'activity_materials',
	{
		id: pk(),
		fieldActivityId: fk('field_activity_id')
			.notNull()
			.references(() => fieldActivities.id, { onDelete: 'cascade' }),
		materialId: fk('material_id')
			.notNull()
			.references(() => materials.id, { onDelete: 'restrict' }),
		quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
		notes: varchar('notes', { length: 255 })
	},
	(t) => [index('am_activity_idx').on(t.fieldActivityId)]
);

// ─── Relasi (untuk db.query.*.findMany({ with: ... })) ───────────────────────

export const usersRelations = relations(users, ({ many }) => ({
	createdWorkOrders: many(workOrders),
	assignments: many(workOrderAssignees),
	fieldActivities: many(fieldActivities)
}));

export const customersRelations = relations(customers, ({ many }) => ({
	sites: many(sites)
}));

export const sitesRelations = relations(sites, ({ one, many }) => ({
	customer: one(customers, { fields: [sites.customerId], references: [customers.id] }),
	workOrders: many(workOrders)
}));

export const activityTypesRelations = relations(activityTypes, ({ many }) => ({
	workOrders: many(workOrders)
}));

export const materialsRelations = relations(materials, ({ many }) => ({
	usages: many(activityMaterials)
}));

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
	site: one(sites, { fields: [workOrders.siteId], references: [sites.id] }),
	activityType: one(activityTypes, {
		fields: [workOrders.activityTypeId],
		references: [activityTypes.id]
	}),
	creator: one(users, { fields: [workOrders.createdBy], references: [users.id] }),
	assignees: many(workOrderAssignees),
	fieldActivities: many(fieldActivities)
}));

export const workOrderAssigneesRelations = relations(workOrderAssignees, ({ one }) => ({
	workOrder: one(workOrders, {
		fields: [workOrderAssignees.workOrderId],
		references: [workOrders.id]
	}),
	user: one(users, { fields: [workOrderAssignees.userId], references: [users.id] })
}));

export const fieldActivitiesRelations = relations(fieldActivities, ({ one, many }) => ({
	workOrder: one(workOrders, {
		fields: [fieldActivities.workOrderId],
		references: [workOrders.id]
	}),
	user: one(users, { fields: [fieldActivities.userId], references: [users.id] }),
	photos: many(activityPhotos),
	materials: many(activityMaterials)
}));

export const activityPhotosRelations = relations(activityPhotos, ({ one }) => ({
	fieldActivity: one(fieldActivities, {
		fields: [activityPhotos.fieldActivityId],
		references: [fieldActivities.id]
	})
}));

export const activityMaterialsRelations = relations(activityMaterials, ({ one }) => ({
	fieldActivity: one(fieldActivities, {
		fields: [activityMaterials.fieldActivityId],
		references: [fieldActivities.id]
	}),
	material: one(materials, {
		fields: [activityMaterials.materialId],
		references: [materials.id]
	})
}));
