import type { ActivityStatus, AssigneeRole, UserRole, WoPriority, WoStatus } from './enums';

export const ROLE_LABEL: Record<UserRole, string> = {
	admin: 'Admin',
	supervisor: 'Supervisor',
	engineer: 'Engineer'
};

export const WO_STATUS_LABEL: Record<WoStatus, string> = {
	draft: 'Draft',
	assigned: 'Ditugaskan',
	in_progress: 'Dikerjakan',
	on_hold: 'Ditunda',
	completed: 'Selesai',
	cancelled: 'Dibatalkan'
};

export const WO_STATUS_COLOR: Record<WoStatus, string> = {
	draft: 'bg-slate-100 text-slate-700',
	assigned: 'bg-blue-100 text-blue-700',
	in_progress: 'bg-amber-100 text-amber-800',
	on_hold: 'bg-orange-100 text-orange-700',
	completed: 'bg-green-100 text-green-700',
	cancelled: 'bg-red-100 text-red-700'
};

export const PRIORITY_LABEL: Record<WoPriority, string> = {
	low: 'Rendah',
	medium: 'Sedang',
	high: 'Tinggi',
	urgent: 'Mendesak'
};

export const PRIORITY_COLOR: Record<WoPriority, string> = {
	low: 'bg-slate-100 text-slate-600',
	medium: 'bg-sky-100 text-sky-700',
	high: 'bg-orange-100 text-orange-700',
	urgent: 'bg-red-100 text-red-700'
};

export const ASSIGNEE_ROLE_LABEL: Record<AssigneeRole, string> = {
	lead: 'Ketua tim',
	member: 'Anggota'
};

export const ACTIVITY_STATUS_LABEL: Record<ActivityStatus, string> = {
	ongoing: 'Berlangsung',
	done: 'Selesai',
	failed: 'Gagal'
};

export const ACTIVITY_STATUS_COLOR: Record<ActivityStatus, string> = {
	ongoing: 'bg-amber-100 text-amber-800',
	done: 'bg-green-100 text-green-700',
	failed: 'bg-red-100 text-red-700'
};
