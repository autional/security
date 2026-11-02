// 2026-11-02（方案 W2/W3）：安全控制台顶部控件的站外出口与切换器收窄回归锁。
//
// 与 admin/platform 同口径：用户菜单必须有 文档/服务状态/官方网站 三条出口，
// 切换器必须把内容站（status/trust/developer/brand）过滤掉，只留控制台。
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AppLayout from '../AppLayout';
import zhCN from '@/i18n/locales/zh-CN.json';
import enUS from '@/i18n/locales/en-US.json';

const mockCatalog = vi.hoisted(() => ({
	value: { portals: [] as Array<{ code: string; name?: string; url: string }>, isError: false, isLoading: false },
}));
const mockLogout = vi.hoisted(() => vi.fn());

vi.mock('@autional/shared', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@autional/shared')>();
	return {
		...actual,
		useAuth: () => ({
			user: { id: 'u1', username: 'tester', email: 'tester@example.com' },
			currentTenantId: 't1',
			isAuthenticated: true,
		}),
		useLogout: () => mockLogout,
		usePermission: () => ({ can: () => true }),
		useTenantSlug: () => 'demo',
		usePortalCatalog: () => ({
			portals: mockCatalog.value.portals,
			allPortals: mockCatalog.value.portals,
			isLoading: false,
			isError: mockCatalog.value.isError,
			refetch: () => {},
		}),
		// getter 必须在模块边界覆盖（内部引用真实 getPortalUrl，只覆盖 getPortalUrl 无效）
		getDEVELOPER_PORTAL_URL: () => 'https://developer.example.com',
		getSTATUS_PAGE_URL: () => 'https://status.example.com',
		getLANDING_SITE_URL: () => 'https://www.example.com',
	};
});

// 布局里挂的实时流与全局提示不参与本测试，直接打桩。
vi.mock('../SSEEventStream', () => ({ default: () => null }));
vi.mock('@/lib/antd-app', () => ({
	message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
	notification: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/session-degrade', () => ({
	consumeSessionDegraded: () => null,
	SESSION_DEGRADED_NOTICE_KEY: 'session-degraded',
}));

function renderLayout() {
	return render(
		<MemoryRouter initialEntries={['/demo']}>
			<AppLayout>
				<div>content</div>
			</AppLayout>
		</MemoryRouter>,
	);
}

describe('安全控制台 · 站外出口与切换器收窄', () => {
	beforeEach(() => {
		mockCatalog.value = { portals: [], isError: false, isLoading: false };
		mockLogout.mockClear();
	});

	it('i18n 键是顶层平铺键（keySeparator:false 口径）', () => {
		for (const key of ['nav.docs', 'nav.statusPage', 'nav.officialSite']) {
			expect(Object.prototype.hasOwnProperty.call(zhCN, key), key + ' 必须在 zh-CN 顶层').toBe(true);
			expect(Object.prototype.hasOwnProperty.call(enUS, key), key + ' 必须在 en-US 顶层').toBe(true);
		}
	});

	it('用户菜单有三条站外出口，登出为末项', async () => {
		const user = userEvent.setup();
		renderLayout();

		await user.click(screen.getByLabelText('用户菜单'));

		expect(screen.getByRole('menuitem', { name: '文档' })).toHaveAttribute(
			'href',
			'https://developer.example.com',
		);
		expect(screen.getByRole('menuitem', { name: '服务状态' })).toHaveAttribute(
			'href',
			'https://status.example.com',
		);
		expect(screen.getByRole('menuitem', { name: '官方网站' })).toHaveAttribute(
			'href',
			'https://www.example.com',
		);

		const items = screen.getAllByRole('menuitem');
		expect(items[items.length - 1]).toHaveTextContent('退出登录');
	});

	it('切换器只保留控制台', async () => {
		mockCatalog.value = {
			portals: [
				{ code: 'admin', name: '管理后台', url: 'https://admin.example.com/demo' },
				{ code: 'security', name: '安全中心', url: 'https://security.example.com/demo' },
				{ code: 'status', name: '状态页', url: 'https://status.example.com' },
				{ code: 'trust', name: '信任中心', url: 'https://trust.example.com' },
				{ code: 'developer', name: '开发者门户', url: 'https://developer.example.com' },
				{ code: 'brand', name: '品牌入口', url: 'https://brand.example.com' },
			],
			isError: false,
			isLoading: false,
		};
		const user = userEvent.setup();
		renderLayout();

		await user.click(screen.getByLabelText('切换门户'));

		expect(screen.getByRole('menuitem', { name: '管理后台' })).toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: '安全中心' })).toBeInTheDocument();
		expect(screen.queryByRole('menuitem', { name: '状态页' })).not.toBeInTheDocument();
		expect(screen.queryByRole('menuitem', { name: '信任中心' })).not.toBeInTheDocument();
		expect(screen.queryByRole('menuitem', { name: '开发者门户' })).not.toBeInTheDocument();
		expect(screen.queryByRole('menuitem', { name: '品牌入口' })).not.toBeInTheDocument();
	});
});
