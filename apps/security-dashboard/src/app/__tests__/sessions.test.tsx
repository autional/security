import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockUseSessions = vi.fn();
const mockUseActiveSessions = vi.fn();
const mockUseTerminateSession = vi.fn();

vi.mock('@/hooks/use-security-queries', () => ({
	useSessions: (...args: any[]) => mockUseSessions(...args),
	useActiveSessions: () => mockUseActiveSessions(),
	useTerminateSession: () => mockUseTerminateSession(),
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
}));

vi.mock('@/lib/antd-app', () => ({
	message: { success: vi.fn(), error: vi.fn() },
}));

import SessionsPage from '../sessions/page';

function mockLoaded(items: any[] = []) {
	mockUseSessions.mockReturnValue({
		data: { items, total: items.length },
		isLoading: false,
		refetch: vi.fn(),
	});
	mockUseActiveSessions.mockReturnValue({
		data: { count: 42 },
		refetch: vi.fn(),
	});
	mockUseTerminateSession.mockReturnValue({
		mutateAsync: vi.fn().mockResolvedValue(undefined),
	});
}

describe('SessionsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders sessions page with table', () => {
		mockLoaded([
			{
				id: 's1',
				username: 'alice',
				userId: 'u1',
				ipAddress: '10.0.0.1',
				device: 'Chrome',
				browser: 'Chrome 120',
				location: 'Beijing',
				riskScore: 30,
				createdAt: '2025-01-01T00:00:00Z',
				lastActiveAt: '2025-01-01T01:00:00Z',
			},
		]);
		render(<SessionsPage />);
		expect(screen.getByText('会话安全监控')).toBeInTheDocument();
		expect(screen.getByText('alice')).toBeInTheDocument();
	});

	it('terminate button exists', () => {
		mockLoaded([
			{
				id: 's1',
				username: 'alice',
				userId: 'u1',
				ipAddress: '10.0.0.1',
				device: 'Chrome',
				browser: 'Chrome 120',
				location: 'Beijing',
				riskScore: 30,
				createdAt: '2025-01-01T00:00:00Z',
				lastActiveAt: '2025-01-01T01:00:00Z',
			},
		]);
		render(<SessionsPage />);
		expect(screen.getByText('终止')).toBeInTheDocument();
	});

	it('shows stat cards with active session count', () => {
		mockLoaded([]);
		render(<SessionsPage />);
		expect(screen.getByText('活跃会话')).toBeInTheDocument();
		expect(screen.getByText('高风险会话')).toBeInTheDocument();
	});

	it('shows search input', () => {
		mockLoaded([]);
		render(<SessionsPage />);
		// S-47：检索实际仅按用户过滤（IP/设备参数被服务端忽略），占位文案同步收窄
		expect(screen.getByPlaceholderText('搜索用户')).toBeInTheDocument();
	});
});
