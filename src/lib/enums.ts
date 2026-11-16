/** Nilai enum yang dipakai bersama oleh database (schema) dan tampilan. */
export const USER_ROLES = ['admin', 'supervisor', 'engineer'] as const;
export const WO_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const WO_STATUSES = [
	'draft',
	'assigned',
	'in_progress',
	'on_hold',
	'completed',
	'cancelled'
] as const;
export const ASSIGNEE_ROLES = ['lead', 'member'] as const;
export const ACTIVITY_STATUSES = ['ongoing', 'done', 'failed'] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type WoPriority = (typeof WO_PRIORITIES)[number];
export type WoStatus = (typeof WO_STATUSES)[number];
export type AssigneeRole = (typeof ASSIGNEE_ROLES)[number];
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

/** Peran yang boleh mengelola master data & work order. */
export const MANAGER_ROLES: readonly UserRole[] = ['admin', 'supervisor'];
export const isManager = (role: UserRole) => MANAGER_ROLES.includes(role);
