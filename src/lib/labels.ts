import type { ActivityStatus, AssigneeRole, UserRole, WoPriority, WoStatus } from './enums';

export const ROLE_LABEL: Readonly<Record<string, string>> = {
	admin: 'Admin',
	supervisor: 'Supervisor',
	engineer: 'Engineer'
} satisfies Record<UserRole, string>;

export const WO_STATUS_LABEL: Readonly<Record<string, string>> = {
	draft: 'Draft',
	assigned: 'Ditugaskan',
	in_progress: 'Dikerjakan',
	on_hold: 'Ditunda',
	completed: 'Selesai',
	cancelled: 'Dibatalkan'
} satisfies Record<WoStatus, string>;

export const WO_STATUS_COLOR: Readonly<Record<string, string>> = {
	draft: 'bg-slate-100 text-slate-700',
	assigned: 'bg-blue-100 text-blue-700',
	in_progress: 'bg-amber-100 text-amber-800',
	on_hold: 'bg-orange-100 text-orange-700',
	completed: 'bg-green-100 text-green-700',
	cancelled: 'bg-red-100 text-red-700'
} satisfies Record<WoStatus, string>;

export const PRIORITY_LABEL: Readonly<Record<string, string>> = {
	low: 'Rendah',
	medium: 'Sedang',
	high: 'Tinggi',
	urgent: 'Mendesak'
} satisfies Record<WoPriority, string>;

export const PRIORITY_COLOR: Readonly<Record<string, string>> = {
	low: 'bg-slate-100 text-slate-600',
	medium: 'bg-sky-100 text-sky-700',
	high: 'bg-orange-100 text-orange-700',
	urgent: 'bg-red-100 text-red-700'
} satisfies Record<WoPriority, string>;

export const ASSIGNEE_ROLE_LABEL: Readonly<Record<string, string>> = {
	lead: 'Ketua tim',
	member: 'Anggota'
} satisfies Record<AssigneeRole, string>;

export const ACTIVITY_STATUS_LABEL: Readonly<Record<string, string>> = {
	ongoing: 'Berlangsung',
	done: 'Selesai',
	failed: 'Gagal'
} satisfies Record<ActivityStatus, string>;

export const ACTIVITY_STATUS_COLOR: Readonly<Record<string, string>> = {
	ongoing: 'bg-amber-100 text-amber-800',
	done: 'bg-green-100 text-green-700',
	failed: 'bg-red-100 text-red-700'
} satisfies Record<ActivityStatus, string>;
