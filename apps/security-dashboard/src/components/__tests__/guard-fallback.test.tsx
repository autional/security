import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
// 真 shared 守卫链（rc.21 精确角色 + fallback 透传）——验证 S-75 修复的落点：
// 非准入角色渲染 NoAccessPage 而非 `return null` 白屏。
import { SecurityGuard, SecurityAdminGuard, useAuthStore } from '@autional/shared';
import NoAccessPage from '../NoAccessPage';

const NO_ACCESS_TEXT = '抱歉，您当前账号的角色无权访问此页面。如需访问，请切换具备相应权限的账号。';

vi.stubGlobal('fetch', () => new Promise(() => {}));

function seedSession(role: string, permissions: string[]) {
	const store = useAuthStore.getState();
	store.setAuth('header.payload.signature', 'refresh-token', {
		id: 'u-test',
		username: 'tester',
		email: 'tester@test.dev',
		status: 'active',
	} as never);
	useAuthStore.setState({
		tenants: [{ id: 't-1', name: 'Tenant One', role }],
		currentTenantId: 't-1',
		permissions,
	});
}

function renderGuarded(ui: React.ReactNode) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<MemoryRouter initialEntries={['/acme-corp/archives']}>{ui}</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe('guard fallback chain (S-75)', () => {
	beforeEach(() => {
		localStorage.clear();
		useAuthStore.getState().clearAuth();
	});

	afterEach(() => {
		localStorage.clear();
		useAuthStore.getState().clearAuth();
	});

	describe('SecurityGuard (top-level entry)', () => {
		it('renders children for an entry role (security_admin)', async () => {
			seedSession('security_admin', ['audit:read']);
			renderGuarded(
				<SecurityGuard fallback={<NoAccessPage />}>
					<div>ENTRY OK</div>
				</SecurityGuard>,
			);
			expect(await screen.findByText('ENTRY OK')).toBeInTheDocument();
		});

		it('renders NoAccessPage (not white screen) for admin without wildcard', async () => {
			seedSession('admin', ['audit:read']);
			renderGuarded(
				<SecurityGuard fallback={<NoAccessPage />}>
					<div>ENTRY OK</div>
				</SecurityGuard>,
			);
			expect(await screen.findByText(NO_ACCESS_TEXT)).toBeInTheDocument();
			expect(screen.queryByText('ENTRY OK')).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: '切换账号' })).toBeInTheDocument();
			// 顶层拒绝：不显示「返回首页」（会立即回环）
			expect(screen.queryByRole('button', { name: '返回首页' })).not.toBeInTheDocument();
		});

		it('renders NoAccessPage for guest', async () => {
			// 真实 guest 会话持 user:read；permissions 非空是 shared bootstrap 短路 'ready' 的前提
			seedSession('guest', ['user:read']);
			renderGuarded(
				<SecurityGuard fallback={<NoAccessPage />}>
					<div>ENTRY OK</div>
				</SecurityGuard>,
			);
			expect(await screen.findByText(NO_ACCESS_TEXT)).toBeInTheDocument();
		});

		it("wildcard '*' permission still passes non-allowlisted role", async () => {
			seedSession('admin', ['*']);
			renderGuarded(
				<SecurityGuard fallback={<NoAccessPage />}>
					<div>ENTRY OK</div>
				</SecurityGuard>,
			);
			expect(await screen.findByText('ENTRY OK')).toBeInTheDocument();
		});
	});

	describe('SecurityAdminGuard (inner pages: archives / soc-kpi)', () => {
		it('renders NoAccessPage with back-home for auditor', async () => {
			seedSession('auditor', ['audit:read']);
			renderGuarded(
				<SecurityAdminGuard fallback={<NoAccessPage showHome />}>
					<div>ARCHIVES</div>
				</SecurityAdminGuard>,
			);
			expect(await screen.findByText(NO_ACCESS_TEXT)).toBeInTheDocument();
			expect(screen.queryByText('ARCHIVES')).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: '返回首页' })).toBeInTheDocument();
		});

		it('renders children for security_admin', async () => {
			seedSession('security_admin', ['audit:read']);
			renderGuarded(
				<SecurityAdminGuard fallback={<NoAccessPage showHome />}>
					<div>ARCHIVES</div>
				</SecurityAdminGuard>,
			);
			expect(await screen.findByText('ARCHIVES')).toBeInTheDocument();
		});
	});
});
