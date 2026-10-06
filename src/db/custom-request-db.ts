import db from '@/db/db';
import type { CleanCustomRequest, RequestStatus } from '@/lib/custom-request-rules';

export const createCustomRequest = async (
	request: CleanCustomRequest,
	userId: string | null
) =>
	db.customRequest.create({
		data: { ...request, userId },
		select: { id: true },
	});

export type CustomRequestRow = {
	id: string;
	createdAt: Date;
	name: string;
	email: string | null;
	phone: string | null;
	description: string;
	budget: string | null;
	neededBy: string | null;
	status: string;
};

// The admin list, newest first, optionally one status only. Only what the
// table shows (and searches) leaves the database.
export const getCustomRequests = async (
	status?: RequestStatus
): Promise<CustomRequestRow[]> =>
	db.customRequest.findMany({
		where: status ? { status } : undefined,
		orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
		select: {
			id: true,
			createdAt: true,
			name: true,
			email: true,
			phone: true,
			description: true,
			budget: true,
			neededBy: true,
			status: true,
		},
	});

export const getCustomRequestCounts = async () => {
	const groups = await db.customRequest.groupBy({
		by: ['status'],
		_count: { _all: true },
	});
	const counts = { all: 0, NEW: 0, REPLIED: 0, CLOSED: 0 };
	for (const group of groups) {
		counts.all += group._count._all;
		if (group.status in counts) {
			counts[group.status as RequestStatus] += group._count._all;
		}
	}
	return counts;
};

export const countNewCustomRequests = async () =>
	db.customRequest.count({ where: { status: 'NEW' } });

export const getCustomRequest = async (id: string) =>
	db.customRequest.findUnique({
		where: { id },
		select: {
			id: true,
			createdAt: true,
			updatedAt: true,
			name: true,
			email: true,
			phone: true,
			preferredContact: true,
			description: true,
			budget: true,
			neededBy: true,
			status: true,
			userId: true,
		},
	});

// Changes the status; resolves to the request's name and old status, or null
// when there's no such request. Throws on a database error.
export const setCustomRequestStatus = async (id: string, status: RequestStatus) =>
	db.$transaction(async (tx) => {
		const current = await tx.customRequest.findUnique({
			where: { id },
			select: { name: true, status: true },
		});
		if (!current) return null;
		if (current.status !== status) {
			await tx.customRequest.update({ where: { id }, data: { status } });
		}
		return current;
	});
