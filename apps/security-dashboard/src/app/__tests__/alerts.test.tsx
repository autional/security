import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockUseAnomalies = vi.fn();
const mockUseUpdateAnomalyStatus = vi.fn();

vi.mock('@/hooks/use-security-queries', () => ({
	useAnomalies: (...args: any[]) => mockUseAnomalies(...args),
	useUpdateAnomalyStatus: () => mockUseUpdateAnomalyStatus(),
	useAdminUsers: () => ({ data: { items: [] }, isFetching: false }),
}));

vi.mock('@autional/shared', () => ({
	useAuthStore: vi.fn(() => ({
		user: { tenant_id: 'test-tenant' },
		currentTenantId: 'test-tenant',
		isAuthenticated: true,
		tenants: [{ id: 'test-tenant', role: 'security_admin' }],
		getState: () => ({
			currentTenantId: 'test-tenant',
			tenants: [{ id: 'test-tenant', role: 'security_admin' }],
		}),
	})),
	usePermission: vi.fn(() => ({
		can: vi.fn(() => true),
		canAny: vi.fn(() => true),
		canAll: vi.fn(() => true),
		isSuperAdmin: false,
		isTenantAdmin: false,
		isAuditor: false,
		isDeveloper: false,
		isEndUser: false,
	})),
	AuthService: {
		getAccessToken: vi.fn(() => 'mock-token'),
		getPermissions: vi.fn(() => []),
		subscribe: vi.fn(() => vi.fn()),
	},
	useCurrentRole: () => 'security_admin',
	useTenantSlug: () => 'test-tenant',
}));

vi.mock('@/lib/antd-app', () => ({
	message: { success: vi.fn(), error: vi.fn() },
	modal: { confirm: vi.fn() },
}));

// UserIdentity（S-71 画像入口）内 Link 需 Router 上下文，测试环境用 a 标签 stub
vi.mock('react-router', () => ({
	Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
		<a href={to}>{children}</a>
	),
}));

import AnomaliesPage from '../anomalies/page';

function mockQueryResult(overrides: Record<string, any> = {}) {
	mockUseAnomalies.mockReturnValue({
		data: null,
		isLoading: false,
		refetch: vi.fn(),
		...overrides,
	});
	mockUseUpdateAnomalyStatus.mockReturnValue({
		mutateAsync: vi.fn().mockResolvedValue(undefined),
	});
}

describe('AlertsPage (anomalies)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockQueryResult();
	});

	it('renders the alert page heading', () => {
		render(<AnomaliesPage />);
		expect(screen.getByText('异常事件检测')).toBeInTheDocument();
	});

	it('shows loading spinner when data is loading', () => {
		mockUseAnomalies.mockReturnValue({
			data: null,
			isLoading: true,
			refetch: vi.fn(),
		});
		render(<AnomaliesPage />);
		expect(document.querySelector('.ant-spin')).toBeTruthy();
	});

	it('renders alert rows when data available', () => {
		mockUseAnomalies.mockReturnValue({
			data: {
				items: [
					{
						id: '1',
						type: 'brute_force',
						severity: 'critical',
						description: 'Brute force detected',
						userId: 'u1',
						tenantId: 't1',
						status: 'open',
						detectedAt: Date.now(),
					},
					{
						id: '2',
						type: 'impossible_travel',
						severity: 'high',
						description: 'Impossible travel',
						userId: 'u2',
						tenantId: 't1',
						status: 'investigating',
						detectedAt: Date.now(),
					},
				],
				total: 2,
			},
			isLoading: false,
			refetch: vi.fn(),
		});
		render(<AnomaliesPage />);
		expect(screen.getByText('Brute force detected')).toBeInTheDocument();
		expect(screen.getByText('Impossible travel')).toBeInTheDocument();
	});

	it('shows empty state when no alerts', () => {
		mockUseAnomalies.mockReturnValue({
			data: { items: [], total: 0 },
			isLoading: false,
			refetch: vi.fn(),
		});
		render(<AnomaliesPage />);
		expect(screen.getByText('暂无异常事件')).toBeInTheDocument();
	});

	it('shows filter dropdowns (severity, status)', () => {
		render(<AnomaliesPage />);
		const selects = document.querySelectorAll('.ant-select');
		expect(selects.length).toBeGreaterThanOrEqual(2);
	});

	it('renders stats summary cards', () => {
		mockUseAnomalies.mockReturnValue({
			data: {
				items: [
					{
						id: '1',
						type: 'brute_force',
						severity: 'critical',
						description: 'Test',
						userId: 'u1',
						tenantId: 't1',
						status: 'open',
						detectedAt: Date.now(),
					},
					{
						id: '2',
						type: 'brute_force',
						severity: 'low',
						description: 'Test',
						userId: 'u2',
						tenantId: 't1',
						status: 'resolved',
						detectedAt: Date.now(),
					},
				],
				total: 2,
			},
			isLoading: false,
			refetch: vi.fn(),
		});
		render(<AnomaliesPage />);
		const pendingElements = screen.getAllByText('待处理');
		expect(pendingElements.length).toBeGreaterThanOrEqual(1);
		const resolvedElements = screen.getAllByText('已解决');
		expect(resolvedElements.length).toBeGreaterThanOrEqual(1);
	});
});
