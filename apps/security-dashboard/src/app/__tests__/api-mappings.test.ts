import { describe, it, expect, vi } from 'vitest';

vi.mock('@autional/shared', () => ({
	apiClient: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		patch: vi.fn(),
	},
	useAuthStore: vi.fn(() => ({})),
	extractList: vi.fn((x: any) => x?.data?.items ?? []),
	extractListResult: vi.fn(
		(x: any) => x ?? { items: [], total: 0, pagination: { page: 1, pageSize: 10, total: 0 } },
	),
	extractItem: vi.fn((x: any) => x?.data ?? null),
	API_PATHS: {},
}));

describe('api.generated mappings', () => {
	it('exports alert API functions', async () => {
		const mod = await import('@/lib/api.generated');
		expect(typeof mod.getAlerts).toBe('function');
		expect(typeof mod.getAlertById).toBe('function');
		expect(typeof mod.assignAlert).toBe('function');
		expect(typeof mod.updateAlertStatus).toBe('function');
	});

	it('exports NHI API functions', async () => {
		const mod = await import('@/lib/api.generated');
		expect(typeof mod.getAdminAgents).toBe('function');
		expect(typeof mod.getAdminRobots).toBe('function');
		expect(typeof mod.getAdminIots).toBe('function');
	});

	it('exports all required audit functions', async () => {
		const mod = await import('@/lib/api.generated');
		expect(typeof mod.getAuditLogs).toBe('function');
		expect(typeof mod.getAnomalies).toBe('function');
		expect(typeof mod.getSecurityReport).toBe('function');
		expect(typeof mod.getComplianceReport).toBe('function');
		expect(typeof mod.getAuditStats).toBe('function');
		expect(typeof mod.getSessions).toBe('function');
		expect(typeof mod.getSecurityUserProfile).toBe('function');
		expect(typeof mod.getSecurityUserTimeline).toBe('function');
		expect(typeof mod.getNotificationPlatformStats).toBe('function');
	});

	it('has no duplicate exports', async () => {
		const mod = await import('@/lib/api.generated');
		const keys = Object.keys(mod);
		const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
		expect(duplicates).toEqual([]);
	});
});
