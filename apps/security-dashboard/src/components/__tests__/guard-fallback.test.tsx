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

/**
 * 测试用 access token —— payload 必须是**可解码且未过期**的 JSON。
 *
 * 为什么不能用 `'header.payload.signature'` 这种占位串：`isTokenExpired()` 解不出 `exp`
 * 就按「已过期」处理 → axios 请求拦截器「预判式刷新」→ jsdom 下 refresh 请求必然
 * Network Error → `refreshToken()` 失败 → `onUnauthorized()` → `clearSession()`：
 * 种子会话的 `tenants` / `permissions` 在断言前就被清空。此时守卫看到的是
 * `role === null` + `permissions === []`，用例名说的是「验 `'*'` 豁免」，实际断言的是
 * 别的分支（rc.70 靠当时「role === null 穿透」的旧口径侥幸放行，rc.71 改成
 * 未就绪/已就绪两态后即失效）。给一个真能解码、且远未过期的 token，播种会话才
 * 是「已就绪会话」，本文件各用例才真正落在自己声称的分支上。
 */
const TEST_TOKEN_EXP = 9_999_999_999; // 2286 年，测试期内永不过期
function makeTestAccessToken(): string {
	const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
	const payload = btoa(JSON.stringify({ sub: 'u-test', exp: TEST_TOKEN_EXP }));
	return `${header}.${payload}.test-signature`;
}

function seedSession(role: string, permissions: string[]) {
	const store = useAuthStore.getState();
	store.setAuth(makeTestAccessToken(), 'refresh-token', {
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

			// 反作弊锁：断言时种子会话必须**仍然完整**（未被 clearAuth 清空），
			// 否则本用例会退化成「空权限 fail-closed 的反面」——就算把 shared 里的
			// `'*'` 豁免整段删掉，用例也照样绿，等于没锁住。
			const state = useAuthStore.getState();
			expect(state.permissions).toEqual(['*']);
			expect(state.tenants.find((t) => t.id === 't-1')?.role).toBe('admin');
			// 角色确实不在 allowlist 内（'admin' ∉ security 准入角色）——豁免才有意义。
			expect(['super_admin', 'security_admin', 'auditor']).not.toContain('admin');
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
