import { expect, type Page, type Route, test } from '@playwright/test';

/**
 * 安全控制台浏览器冒烟（BFF 全量桩）。
 *
 * 为什么要有这一层：站点是**纯 API 控制台**，单测把 `@autional/shared` 的 auth /
 * bootstrap / 租户白名单链全 mock 掉了，于是「路由白屏」「租户 slug 漏斗断裂」
 * 「shared 升级后 401 抢跑」「控制台报错」这类问题单测永远发现不了。
 *
 * 做法：不发真后端、不登录 —— 用 localStorage 预置一份持久化会话（zustand persist 的
 * `autional-auth-v1`），再把 `/bff/**` 全量拦截成**源码验证过的真实信封形状**：
 *   - axios 客户端（identity / audit / compliance / session / profile）走
 *     `{ code, message, data, timestamp }`，拦截器会解 `data` 并转 camelCase；
 *   - 公开租户名单走裸 `fetch`，后端是 dto_base.ListResponse，数组在**顶层 `items`**
 *     （见 shared/components/TenantIndexGuard.tsx 的解析顺序 items → data → 原对象）。
 * 形状写错的代价是假绿（页面拿到 undefined 仍然能渲染标题），所以这两个信封不是猜的。
 */

const SLUG = 'demo';
const TENANT_ID = '01JDEMOTENANT000000000001';
/** zustand persist 的存储键（shared/auth/create-auth-store.ts 默认 name）。 */
const AUTH_STORAGE_KEY = 'autional-auth-v1';
/** 角色集与 shared/auth/portal-config.ts 的 SECURITY_GUARDS.security 对齐（security_admin 直通）。 */
const ROLE = 'security_admin';
/**
 * 刻意不含 `tenant:admin`：AppLayout 的 PortalSwitcher 会因此不发目录请求，
 * 冒烟面收敛到「首屏能不能渲染」，不把无关接口的成败混进断言。
 */
const PERMISSIONS = ['audit:read', 'session:read', 'compliance:read'];

/** exp = 2100-01-01：避免被 shared 的 isTokenExpired 判过期，触发 refresh 分支跑偏。 */
const ACCESS_TOKEN = (() => {
	const encode = (payload: Record<string, unknown>) =>
		Buffer.from(JSON.stringify(payload)).toString('base64url');
	return [
		encode({ alg: 'none', typ: 'JWT' }),
		encode({ sub: 'user-smoke', exp: 4102444800, tenant_id: TENANT_ID }),
		'smoke',
	].join('.');
})();

const TIMESTAMP = '2026-01-01T00:00:00Z';

const json = (data: unknown) => ({
	status: 200,
	contentType: 'application/json',
	body: JSON.stringify(data),
});

/** 标准信封（axios 拦截器解 data 后转 camelCase）。 */
const envelope = (data: unknown) => json({ code: 0, message: 'ok', data, timestamp: TIMESTAMP });

/**
 * 控制台错误噪声白名单。
 * 只放「不是本次冒烟要抓的问题」的噪声；其余一律必须为 0 —— 否则这条断言就失去意义。
 *
 * - 资源类：404 favicon / 被桩短接的连接失败（浏览器自己打的，非应用代码）。
 * - 组件库弃用告警：antd 6 用 console.error 发 deprecation 提示，本仓 `PageLoader`
 *   仍在用 `<Spin tip>`（源码 src/App.tsx），修它要改应用源码 —— 不在本卡范围，
 *   已在交付报告里登记为既有问题；不拦它会让整套冒烟永久红。
 */
const CONSOLE_NOISE = [
	/Failed to load resource/i,
	/net::ERR_/i,
	/\[antd: [^\]]+\] `[^`]+` is deprecated/i,
];

function collectErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
	page.on('console', (msg) => {
		if (msg.type() !== 'error') return;
		const text = msg.text();
		if (CONSOLE_NOISE.some((re) => re.test(text))) return;
		errors.push(`[console.error] ${text}`);
	});
	return errors;
}

/** 预置持久化会话：localStorage 在每次导航前写入（addInitScript 每条文档都执行）。 */
async function seedSession(page: Page) {
	await page.addInitScript(
		({ key, token, tenantId, role, permissions }) => {
			window.localStorage.setItem(
				key,
				JSON.stringify({
					state: {
						user: {
							id: 'user-smoke',
							email: 'smoke@example.com',
							username: 'smoke',
							status: 'active',
						},
						accessToken: token,
						refreshToken: token,
						tenants: [{ id: tenantId, name: 'Demo Tenant', role }],
						currentTenantId: tenantId,
						permissions,
						isAuthenticated: true,
					},
					version: 1,
				}),
			);
		},
		{
			key: AUTH_STORAGE_KEY,
			token: ACCESS_TOKEN,
			tenantId: TENANT_ID,
			role: ROLE,
			permissions: PERMISSIONS,
		},
	);
}

/** `/bff/**` 全量桩。未知端点兜底返回空 data（保证不出现 4xx/5xx 噪声）。 */
async function mockApi(page: Page) {
	// 网关健康端点走裸 fetch('/ready')，不在 /bff 前缀下；content-type 必须是 JSON
	// （页面有守卫：非 JSON 直接抛错，把 SPA fallback 的 index.html 当故障）。
	await page.route('**/ready', (route) =>
		route.fulfill(
			json({
				status: 'ok',
				checks: { identity: 'healthy', audit: 'healthy', compliance: 'healthy' },
				checks_latency: { identity: 12, audit: 21, compliance: 34 },
			}),
		),
	);

	await page.route('**/bff/**', async (route: Route) => {
		const path = new URL(route.request().url()).pathname.replace(/^\/bff/, '');

		// ── 启动链（useBootstrap / TenantRootRedirect / TenantIndexGuard）──────────
		// 公开租户名单：裸 fetch + ListResponse（`items` 在顶层，不是 `data`）
		if (path === '/tenant/api/v1/tenant/public/tenants') {
			return route.fulfill(
				json({
					code: 0,
					message: 'ok',
					items: [{ id: TENANT_ID, name: SLUG, slug: SLUG }],
					total: 1,
					timestamp: TIMESTAMP,
				}),
			);
		}
		if (path === '/identity/api/v1/auth/me/permissions') {
			return route.fulfill(envelope(PERMISSIONS));
		}
		if (path === '/identity/api/v1/auth/me/tenants') {
			return route.fulfill(
				envelope([{ id: TENANT_ID, name: 'Demo Tenant', role: ROLE }]),
			);
		}
		if (path === '/identity/api/v1/auth/me') {
			return route.fulfill(
				envelope({ id: 'user-smoke', email: 'smoke@example.com', username: 'smoke' }),
			);
		}
		if (path === '/profile/api/v1/profile/avatar') {
			return route.fulfill(envelope({ avatarUrl: '' }));
		}

		// ── 总览页数据（shape 对齐页面读取的字段名：camelCase）──────────────────
		if (path === '/audit/api/v1/admin/audit/stats') {
			return route.fulfill(
				envelope({
					totalLogs: 128,
					trend: [
						{ timestamp: Date.parse('2026-01-01T00:00:00Z'), count: 12 },
						{ timestamp: Date.parse('2026-01-02T00:00:00Z'), count: 18 },
					],
					byModule: { identity: 80, session: 48 },
				}),
			);
		}
		if (path === '/audit/api/v1/admin/audit/anomalies') {
			return route.fulfill(envelope({ items: [], total: 0 }));
		}
		if (path.startsWith('/audit/api/v1/admin/audit/hashchain/')) {
			return route.fulfill(
				envelope({ tenantId: TENANT_ID, isValid: true, logCount: 128 }),
			);
		}
		if (path === '/compliance/api/v1/admin/compliance/tenants/self/score') {
			return route.fulfill(envelope({ overallScore: 90, grade: 'A' }));
		}
		if (path === '/session/api/v1/admin/sessions/active-count') {
			return route.fulfill(envelope({ count: 4 }));
		}

		// ── SSE 事件流：给一段合法的空流，让页面正常收尾而不是打成一堆网络错 ────
		if (path === '/gateway/api/v1/stream/security-events') {
			return route.fulfill({
				status: 200,
				contentType: 'text/event-stream',
				body: ': connected\n\n',
			});
		}

		return route.fulfill(envelope({}));
	});
}

test.describe('安全控制台冒烟', () => {
	test.beforeEach(async ({ page }) => {
		await seedSession(page);
		await mockApi(page);
	});

	test('裸根 / 返回 200，且有会话时漏斗到租户总览', async ({ page }) => {
		const errors = collectErrors(page);

		// waitUntil: 'commit' —— 该页是一条「立即整页跳走」的漏斗路由，
		// 等 load 会在跳转中途被中断（假红），只取文档响应状态这一件事。
		const response = await page.goto('/', { waitUntil: 'commit' });
		expect(response?.status(), 'GET / 的 HTTP 状态').toBe(200);

		// 裸根不得停在空白页：有会话 + 公开名单命中 → /<slug>/（源码 TenantRootRedirect 口径）。
		// 注意 URL 上会带一跳溯源参数 `?rt=<层>.funnel-slug.<id>`（auth-trace 的 decorateTarget），
		// 断言因此只认路径 /demo/，不认整个字符串。
		await expect(page).toHaveURL(new RegExp(`/${SLUG}/(\\?.*)?$`));
		await expect(page.locator('main h1')).toHaveText('安全运营总览');

		// 跳转后仍有接口在路上（bootstrap/总览），给它们落定再判控制台干净。
		await page.waitForTimeout(1_500);
		expect(errors.join('\n'), '控制台/pageerror').toBe('');
	});

	test('租户总览渲染：标题与统计卡可见，且无未捕获异常', async ({ page }) => {
		const errors = collectErrors(page);

		const response = await page.goto(`/${SLUG}/`);
		expect(response?.status()).toBe(200);

		// ④ 稳定元素：AppPageHeader 的 h1（i18n zh-CN 的 overview.title）。
		//    它是「真的渲染出来了」的证据，而不是 Suspense 的 Spin 占位。
		//    统计卡标题限定在 main 内：这些词在左侧菜单里也有一份（严格模式会命中 2 个）。
		await expect(page.locator('main h1')).toHaveText('安全运营总览');
		await expect(page.locator('main').getByText('审计日志总数')).toBeVisible();
		await expect(page.locator('main').getByText('哈希链完整性')).toBeVisible();

		// ② 非白屏：主体有可见文本，且没有把 undefined 直接喷到脸上。
		const text = await page.locator('main').innerText();
		expect(text.trim().length).toBeGreaterThan(0);
		expect(text).not.toContain('undefined');

		// ③ 给迟到的报错留窗口（SSE 重连 / 头像补读 / react-query 重试都在这之后落定）。
		await page.waitForTimeout(2_000);
		expect(errors.join('\n'), '控制台/pageerror').toBe('');
	});

	test('未知租户 slug 渲染 404（白名单守卫没被绕过）', async ({ page }) => {
		const errors = collectErrors(page);

		const response = await page.goto('/not-a-tenant/');
		// SPA 由 vite 回落 index.html，HTTP 仍 200；404 是前端按公开名单判定的
		expect(response?.status()).toBe(200);

		await expect(page.getByText('页面不存在或租户无效，请检查访问地址。')).toBeVisible();
		await expect(page.getByRole('button', { name: '返回首页' })).toBeVisible();
		await page.waitForTimeout(1_000);
		expect(errors.join('\n'), '控制台/pageerror').toBe('');
	});
});
