import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('recharts', () => ({
	LineChart: () => <div data-testid="line-chart" />,
	Line: () => null,
	XAxis: () => null,
	YAxis: () => null,
	CartesianGrid: () => null,
	Tooltip: () => null,
	ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
	PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
	// S-08 回归需要读取实际喂给饼图的数据（top-N + 其他聚合）
	Pie: ({ data }: any) => <div data-testid="pie-data">{JSON.stringify(data)}</div>,
	Cell: () => null,
	BarChart: () => <div data-testid="bar-chart" />,
	Bar: () => null,
	Legend: () => null,
}));

vi.mock('@/hooks/use-overview', () => ({
	useAuditStats: vi.fn(),
	useAnomaliesPreview: vi.fn(),
	useActiveSessionCount: vi.fn(),
	useGatewayStatus: vi.fn(),
}));

vi.mock('@/hooks/use-security-queries', () => ({
	useHashChain: vi.fn(),
	useComplianceSelfScore: vi.fn(),
	// UserIdentity（S-05：事件/异常主体用户）数据源
	useAdminUsers: vi.fn(() => ({ data: { items: [] } })),
}));

// S-73：统计卡/事件标题改 Link（react-router），测试环境用 a 标签 stub
vi.mock('react-router', () => ({
	Link: ({ to, children, className }: any) => (
		<a href={to} className={className}>
			{children}
		</a>
	),
}));

vi.mock('@autional/shared', () => ({
	useAuth: vi.fn(() => ({
		user: { tenant_id: 'test-tenant' },
		currentTenantId: 'test-tenant',
		isAuthenticated: true,
	})),
	useTenantSlug: () => 'test-tenant',
	useAuthStore: vi.fn(() => ({
		user: { tenant_id: 'test-tenant' },
		currentTenantId: 'test-tenant',
		isAuthenticated: true,
		tenants: [{ id: 'test-tenant', role: 'security_admin' }],
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
}));

import * as useOverview from '@/hooks/use-overview';
import * as useSecurityQueries from '@/hooks/use-security-queries';
import OverviewPage from '../page';

function mockAllLoading() {
	const hooks = [
		'useAuditStats',
		'useAnomaliesPreview',
		'useActiveSessionCount',
		'useGatewayStatus',
	] as const;
	for (const h of hooks) {
		vi.mocked(useOverview[h]).mockReturnValue({ data: null, isLoading: true } as any);
	}
	vi.mocked(useSecurityQueries.useHashChain).mockReturnValue({
		data: null,
		isLoading: true,
	} as any);
	vi.mocked(useSecurityQueries.useComplianceSelfScore).mockReturnValue({
		data: null,
		isLoading: true,
	} as any);
}

function mockAllLoaded() {
	vi.mocked(useOverview.useAuditStats).mockReturnValue({
		data: {
			totalLogs: 5000,
			trend: [{ timestamp: Date.now(), count: 100 }],
			byModule: { identity: 2000, session: 1500 },
		},
		isLoading: false,
	} as any);
	vi.mocked(useOverview.useAnomaliesPreview).mockReturnValue({
		data: { items: [], total: 0 },
		isLoading: false,
	} as any);
	vi.mocked(useSecurityQueries.useComplianceSelfScore).mockReturnValue({
		data: { overallScore: 85, grade: 'A' },
		isLoading: false,
	} as any);
	vi.mocked(useSecurityQueries.useHashChain).mockReturnValue({
		data: { tenantId: 'test-tenant', isValid: true, logCount: 123 },
		isLoading: false,
	} as any);
	vi.mocked(useOverview.useActiveSessionCount).mockReturnValue({
		data: { count: 42 },
		isLoading: false,
	} as any);
	vi.mocked(useOverview.useGatewayStatus).mockReturnValue({
		data: { services: [] },
		isLoading: false,
	} as any);
}

describe('DashboardPage (overview)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders dashboard heading', () => {
		mockAllLoaded();
		render(<OverviewPage />);
		expect(screen.getByText('安全运营总览')).toBeInTheDocument();
	});

	it('renders dashboard KPIs when data loaded', () => {
		mockAllLoaded();
		render(<OverviewPage />);
		expect(screen.getByText('审计日志总数')).toBeInTheDocument();
		expect(screen.getByText('待处理异常')).toBeInTheDocument();
		expect(screen.getByText('活跃会话')).toBeInTheDocument();
		expect(screen.getByText('合规评分')).toBeInTheDocument();
	});

	it('wires hash chain to current tenant (tenant-scoped, A1)', () => {
		mockAllLoaded();
		render(<OverviewPage />);
		expect(useSecurityQueries.useHashChain).toHaveBeenCalledWith('test-tenant');
	});

	it('shows loading state', () => {
		mockAllLoading();
		render(<OverviewPage />);
		expect(document.querySelector('.ant-spin')).toBeTruthy();
	});

	it('renders service health grid', () => {
		mockAllLoaded();
		vi.mocked(useOverview.useGatewayStatus).mockReturnValue({
			data: {
				services: [
					{ name: 'identity-service', status: 'healthy', latency: '12ms' },
					{ name: 'session-service', status: 'degraded', latency: '230ms' },
				],
			},
			isLoading: false,
		} as any);
		render(<OverviewPage />);
		expect(screen.getByText('服务健康状态')).toBeInTheDocument();
	});

	it('handles missing gateway data', () => {
		mockAllLoaded();
		vi.mocked(useOverview.useGatewayStatus).mockReturnValue({
			data: { services: [] },
			isLoading: false,
		} as any);
		render(<OverviewPage />);
		expect(screen.getByText('无法获取服务状态')).toBeInTheDocument();
	});

	// S-73（fix-security-w5）：统计卡接对应路由（原全页零 pointer/零 href）
	it('S-73：统计卡/事件标题接对应路由', () => {
		mockAllLoaded();
		render(<OverviewPage />);
		const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
		expect(hrefs).toContain('/test-tenant/audit-logs');
		expect(hrefs).toContain('/test-tenant/anomalies');
		expect(hrefs).toContain('/test-tenant/sessions');
		expect(hrefs).toContain('/test-tenant/compliance');
		expect(hrefs).toContain('/test-tenant/hash-chain');
		expect(hrefs).toContain('/test-tenant/risk-dashboard');
	});

	// S-08（fix-security-w5）：前 5 + 其余聚合「其他模块」，长尾不淹没图例
	it('S-08：模块分布前 5 + 其他聚合', () => {
		mockAllLoaded();
		vi.mocked(useOverview.useAuditStats).mockReturnValue({
			data: {
				totalLogs: 451,
				trend: [],
				byModule: { a: 100, b: 90, c: 80, d: 70, e: 60, f: 50, g: 1 },
			},
			isLoading: false,
		} as any);
		render(<OverviewPage />);
		const pie = screen.getByTestId('pie-data');
		expect(pie.textContent).toContain('"name":"e","value":60');
		expect(pie.textContent).toContain('"name":"其他模块","value":51');
		expect(pie.textContent).not.toContain('"name":"f"');
	});

	it('S-08：无 byModule 时不渲染硬编码假 mock（诚实空态）', () => {
		mockAllLoaded();
		vi.mocked(useOverview.useAuditStats).mockReturnValue({
			data: { totalLogs: 100, trend: [] },
			isLoading: false,
		} as any);
		render(<OverviewPage />);
		expect(screen.queryByTestId('pie-data')).toBeNull();
	});

	// S-05（fix-security-w5）：异常事件描述本地化 + 主体用户可读身份（原英文原文 + 无主体）
	it('S-05：事件流/异常卡描述本地化 + 用户名', () => {
		mockAllLoaded();
		vi.mocked(useOverview.useAnomaliesPreview).mockReturnValue({
			data: {
				items: [
					{
						id: 'a1',
						type: 'unusual_time',
						severity: 'medium',
						description: 'User has 5 off-hours access events',
						userId: 'u1',
						detectedAt: Date.now(),
					},
				],
				total: 1,
			},
			isLoading: false,
		} as any);
		vi.mocked(useSecurityQueries.useAdminUsers).mockReturnValue({
			data: { items: [{ id: 'u1', username: 'alice' }] },
		} as any);
		render(<OverviewPage />);
		expect(screen.getAllByText('异常时间').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('用户在非工作时段有 5 次访问事件').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('alice').length).toBeGreaterThanOrEqual(1);
	});
});
