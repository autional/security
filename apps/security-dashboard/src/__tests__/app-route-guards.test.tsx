// 2026-11-19（QA F-02 回归锁）：**路由表级**守卫覆盖。
//
// 背景：`src/components/__tests__/guard-fallback.test.tsx` 只覆盖 SecurityAdminGuard /
// SecurityGuard 的**组件行为**（describe 名写的是 archives / soc-kpi），不保证 `App.tsx`
// 里某条 `<Route>` 真的被守卫包住。F-02（risk-dashboard 对 auditor 可进入、页面全 403）
// 正是"守卫组件没问题、但路由没用它"这类缺陷 ⇒ 必须断言**路由表**本身。
//
// 口径：渲染真实 `<App/>`（真实 App 路由表 + 真实 shared 守卫链），
// 只把与本缺陷无关的重壳打桩（AppLayout 侧栏/SSE、品牌查询、risk 数据面 API）。
// 断言的是"非管理员进不去 + 管理员进得去"，不是"页面渲染成功"。
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import { useAuthStore } from '@autional/shared';
// 会话夹具与 guard-fallback 统一：真能解码、未过期的 token。
// 占位 token 会被判「已过期」→ 预判式刷新 → jsdom 下 refresh 必然 Network Error →
// onUnauthorized() 清空会话；于是用例断言的分支从「按角色判」漂移成「空会话 fail-closed」
// （负例假绿、正例偶发红）。
import { seedSession, readSeedSession } from '@/test/auth-fixture';

const NO_ACCESS_TEXT = '抱歉，您当前账号的角色无权访问此页面。如需访问，请切换具备相应权限的账号。';

/** 风险看板主体标识（AppPageHeader title = t('risk.title')） */
const RISK_TITLE = '风险仪表盘';
const ARCHIVES_TITLE = '归档与完整性管理';
const SOC_KPI_TITLE = 'SOC 关键指标';

// 数据面 API 打桩：negative 用例根本不该走到它（走了即说明守卫失效），
// positive 用例给一份空数据集，避免真发请求。
const mockRiskDashboard = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/lib/api')>();
	return { ...actual, getRiskDashboard: mockRiskDashboard };
});

// 布局重壳（侧栏/门户目录/SSE/会话活跃上报）与被测路由守卫无关，直接透传 children。
vi.mock('@/components/AppLayout', () => ({
	default: ({ children }: { children: React.ReactNode }) => children,
}));

// 品牌初始化会按 slug 请求租户品牌，与守卫无关；useBranding 只做样式副作用。
vi.mock('@autional/shared', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@autional/shared')>();
	return {
		...actual,
		useBranding: () => {},
		BrandingInitializer: () => null,
	};
});

// 网络全挂起（不发真请求，也绝不应答）：避免 jsdom 真发请求的噪声。
// 注意：**不再**把 XMLHttpRequest.prototype.send 打空。旧写法用空实现吞掉请求，
// 等于把「会话是否被 401 清空」这一层证据一并抹掉；现在会话稳定性由「未过期 token」
// 保证：refresh 不会被触发，也就不会有 onUnauthorized() 清会话。
vi.stubGlobal('fetch', () => new Promise(() => {}));

function renderApp(path: string) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<MemoryRouter initialEntries={[path]}>
				<App />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe('App route table — SecurityAdminGuard coverage (QA F-02)', () => {
	beforeEach(() => {
		localStorage.clear();
		useAuthStore.getState().clearAuth();
		mockRiskDashboard.mockResolvedValue({
			tenantId: 't-1',
			todayTotal: 0,
			scoreRanges: [],
			topEventTypes: [],
			topRiskUsers: [],
			dayCounts: [],
		});
	});

	afterEach(() => {
		localStorage.clear();
		useAuthStore.getState().clearAuth();
		mockRiskDashboard.mockReset();
	});

	// F-02 的核心回归：auditor 是准入角色（过得了 SecurityGuard），
	// 但数据面对它 403 ⇒ /risk-dashboard 必须落到 NoAccessPage 兜底。
	it('route /:slug/risk-dashboard blocks auditor: NoAccessPage, no dashboard body', async () => {
		seedSession('auditor', ['audit:read']);
		renderApp('/acme-corp/risk-dashboard');

		expect(await screen.findByText(NO_ACCESS_TEXT)).toBeInTheDocument();
		expect(screen.queryByText(RISK_TITLE)).not.toBeInTheDocument();
		// 内层守卫场景给「返回首页」出口
		expect(screen.getByRole('button', { name: '返回首页' })).toBeInTheDocument();
		// 守卫在渲染前就短路，数据面不应被调用
		expect(mockRiskDashboard).not.toHaveBeenCalled();
		// 反作弊锁：断言时必须仍是「已就绪的 auditor 会话」，而不是被 401/late-refresh
		// 清成空会话后 fail-closed 的假绿（空会话同样会显示兜底页）。
		expect(readSeedSession()).toEqual({ role: 'auditor', permissions: ['audit:read'], hasToken: true });
	});

	it('route /:slug/risk-dashboard admits security_admin (dashboard body visible)', async () => {
		seedSession('security_admin', ['audit:read']);
		renderApp('/acme-corp/risk-dashboard');

		expect(await screen.findByText(RISK_TITLE)).toBeInTheDocument();
		expect(screen.queryByText(NO_ACCESS_TEXT)).not.toBeInTheDocument();
	});

	// 同族路由各断言一次：防止"只给 risk-dashboard 加了守卫"或反向回归。
	it('route /:slug/archives blocks auditor: NoAccessPage, no archives body', async () => {
		seedSession('auditor', ['audit:read']);
		renderApp('/acme-corp/archives');

		expect(await screen.findByText(NO_ACCESS_TEXT)).toBeInTheDocument();
		expect(screen.queryByText(ARCHIVES_TITLE)).not.toBeInTheDocument();
	});

	it('route /:slug/soc-kpi blocks auditor: NoAccessPage, no soc-kpi body', async () => {
		seedSession('auditor', ['audit:read']);
		renderApp('/acme-corp/soc-kpi');

		expect(await screen.findByText(NO_ACCESS_TEXT)).toBeInTheDocument();
		expect(screen.queryByText(SOC_KPI_TITLE)).not.toBeInTheDocument();
	});
});
