import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		// 第二参为字符串 → 回落文案；为插值 options 对象（如 common.total 带 count）→ 返回 key 字符串，
		// 避免对象被当作 React child 渲染
		t: (key: string, fallbackOrOptions?: unknown) =>
			typeof fallbackOrOptions === 'string' ? fallbackOrOptions : key,
		i18n: { language: 'en', changeLanguage: vi.fn() },
	}),
}));

vi.mock('@/components/nhi/NhiDetailDrawer', () => ({
	default: () => null,
}));

vi.mock('@autional/shared', () => ({
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
	extractList: (data: any) => data?.items ?? data ?? [],
	extractItem: (data: any) => data,
}));

const mockUseAgents = vi.fn();
const mockUseRobots = vi.fn();
const mockUseIots = vi.fn();

vi.mock('@/hooks/use-security-queries', () => ({
	useAgents: (...args: any[]) => mockUseAgents(...args),
	useRobots: (...args: any[]) => mockUseRobots(...args),
	useIots: (...args: any[]) => mockUseIots(...args),
	useDeleteAgent: () => ({ mutate: vi.fn(), isPending: false }),
	useCommissionRobot: () => ({ mutate: vi.fn(), isPending: false }),
	useDecommissionRobot: () => ({ mutate: vi.fn(), isPending: false }),
	useDeleteRobot: () => ({ mutate: vi.fn(), isPending: false }),
	useDeleteDevice: () => ({ mutate: vi.fn(), isPending: false }),
	useAgentById: () => ({ data: null, isLoading: false }),
	useRobotById: () => ({ data: null, isLoading: false }),
	useDeviceById: () => ({ data: null, isLoading: false }),
}));

import NhiPage from '../nhi/page';

// S-51：mock 需感知 status 过滤参数——统计卡读服务端 filtered total，
// 若忽略参数则「活跃数」回归 items 计数即无法区分修复与否
function mockLoaded(agents: any[] = [], robots: any[] = [], iots: any[] = []) {
	mockUseAgents.mockImplementation((params?: any) => {
		const items =
			params?.status === 'active'
				? agents.filter((a: any) => a.status === 'active')
				: agents;
		return { data: { items, total: items.length }, isLoading: false };
	});
	mockUseRobots.mockImplementation((params?: any) => {
		const items =
			params?.status === 'active'
				? robots.filter((r: any) => r.status === 'active')
				: robots;
		return { data: { items, total: items.length }, isLoading: false };
	});
	mockUseIots.mockImplementation((params?: any) => {
		const items =
			params?.status === 'active'
				? iots.filter((d: any) => d.status === 'active')
				: iots;
		return { data: { items, total: items.length }, isLoading: false };
	});
}

describe('NhiPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders NHI heading', () => {
		mockLoaded();
		render(<NhiPage />);
		expect(screen.getByText('NHI Monitoring')).toBeInTheDocument();
	});

	it('shows tab labels with counts', () => {
		mockLoaded(
			[
				{ id: 'a1', name: 'Agent1', status: 'active' },
				{ id: 'a2', name: 'Agent2', status: 'provisioning' },
			],
			[{ id: 'r1', name: 'Robot1', status: 'active' }],
			[
				{ id: 'd1', name: 'Device1', status: 'active' },
				{ id: 'd2', name: 'Device2', status: 'unpaired' },
				{ id: 'd3', name: 'Device3', status: 'transferring' },
			],
		);
		render(<NhiPage />);
		expect(screen.getByText('Agents (2)')).toBeInTheDocument();
		expect(screen.getByText('Robots (1)')).toBeInTheDocument();
		expect(screen.getByText('IoT Devices (3)')).toBeInTheDocument();
	});

	it('shows statistics cards', () => {
		mockLoaded(
			[
				{ id: 'a1', name: 'Agent1', status: 'active' },
				{ id: 'a2', name: 'Agent2', status: 'revoked' },
			],
			[{ id: 'r1', name: 'Robot1', status: 'active' }],
			[],
		);
		render(<NhiPage />);
		expect(screen.getByText('Total Agents')).toBeInTheDocument();
		expect(screen.getByText('Active Agents')).toBeInTheDocument();
		expect(screen.getByText('Total Robots')).toBeInTheDocument();
		expect(screen.getByText('Total Devices')).toBeInTheDocument();
		const statValues = document.querySelectorAll('.ant-statistic-content-value');
		expect(statValues.length).toBeGreaterThanOrEqual(4);
	});

	it('shows empty state when no data', () => {
		mockLoaded([], [], []);
		render(<NhiPage />);
		expect(screen.getByText('NHI Monitoring')).toBeInTheDocument();
		expect(screen.getByText('Agents (0)')).toBeInTheDocument();
		expect(screen.getByText('Robots (0)')).toBeInTheDocument();
		expect(screen.getByText('IoT Devices (0)')).toBeInTheDocument();
	});

	// S-51（fix-security-w5）：活跃数取服务端 status=active 的 total（非当页 items 计数）；
	// 表格请求带服务端分页参数（原 page_size:100 拉取 + 客户端分页 → >100 截断/翻页漂移）
	it('S-51：活跃 Agent 数取服务端 total + 表格服务端分页', () => {
		mockLoaded(
			[
				{ id: 'a1', name: 'Agent1', status: 'active' },
				{ id: 'a2', name: 'Agent2', status: 'revoked' },
			],
			[{ id: 'r1', name: 'Robot1', status: 'active' }],
			[],
		);
		render(<NhiPage />);
		const statValues = document.querySelectorAll('.ant-statistic-content-value');
		// 卡序：Total Agents / Active Agents / Total Robots / Total Devices
		expect(statValues[1].textContent).toBe('1');
		expect(mockUseAgents).toHaveBeenCalledWith(
			expect.objectContaining({ status: 'active', page_size: 1 }),
		);
		expect(mockUseAgents).toHaveBeenCalledWith(
			expect.objectContaining({ page: 1, page_size: 20 }),
		);
	});
});
