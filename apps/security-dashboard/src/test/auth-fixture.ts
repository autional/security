/**
 * 共享会话夹具 —— 守卫类测试统一使用（rc.71 起）。
 *
 * 为什么需要它：`isTokenExpired()` 解不出 `exp` 就把 token 当「已过期」→ axios 请求拦截器
 * 「预判式刷新」→ jsdom 下 refresh 请求必然 Network Error → `refreshToken()` 失败 →
 * `onUnauthorized()` → 清空会话。种子会话的 `tenants` / `permissions` 会在断言前被清掉，
 * 用例于是静默退化：守卫看到 `role === null`，负例依旧（fail-closed）显示兜底页而"绿"，
 * 正例则红/偶发红。这类「占位 token」写法已被 rc.70 的事故和 F-02 回归锁一并证伪。
 *
 * 口径：给一个 **payload 可解码且远未过期** 的 JWT 形状 token，让种子会话保持「已就绪」；
 * 需要断言「会话未被清空」的用例可直接读 `useAuthStore.getState()` 做反作弊锁。
 */
import { cleanup } from '@testing-library/react';
import { useAuthStore } from '@autional/shared';

/** 2286 年，测试期内永不过期（秒级 exp）。 */
export const TEST_TOKEN_EXP = 9_999_999_999;

/** 生成测试用 access token —— payload 必须是可解码且未过期的 JSON。 */
export function makeTestAccessToken(): string {
	const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
	const payload = btoa(JSON.stringify({ sub: 'u-test', exp: TEST_TOKEN_EXP }));
	return `${header}.${payload}.test-signature`;
}

/**
 * 播种一个「已就绪」会话：token（未过期）+ 单租户 + 权限。
 *
 * 注意：`permissions` 非空是 shared bootstrap 短路 `ready` 的前提之一，
 * 也决定了守卫走「按角色/权限判」而不是「未就绪」分支——传空数组会改变被测分支。
 */
export function seedSession(role: string, permissions: string[]) {
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

/** 断言用：会话是否仍是种子态（供反作弊锁使用）。 */
export function readSeedSession() {
	const state = useAuthStore.getState();
	return {
		role: state.tenants.find((t) => t.id === 't-1')?.role ?? null,
		permissions: state.permissions,
		hasToken: !!state.accessToken,
	};
}

/**
 * 用例收尾：**先卸载组件，再清会话**（顺序不可颠倒）。
 *
 * 为什么顺序重要：`useAuthStore.getState().clearAuth()` 是 zustand 的 setState，
 * 会同步通知所有已挂载的订阅者（`useSyncExternalStore` → `forceStoreRerender`）。
 * RTL 的自动 cleanup 注册在**测试文件导入时**，而 `afterEach` 钩子在 vitest 里按
 * 注册的**逆序**执行 ⇒ 测试文件自己写的 `afterEach` 先跑，此刻组件**还挂在树上**；
 * 于是清会话会在 act(...) 之外触发一批重渲染，stderr 刷出
 * 「An update to RequireAuth/LayoutWrapper inside a test was not wrapped in act(...)」
 * ——噪声掩盖真警告，且与断言无关（rc.71 全量约 100 条即来源于此）。
 *
 * 正确姿势：`cleanup()`（RTL，内部 act 包裹卸载）先卸载，再清 localStorage / 会话；
 * 此时已无订阅者，setState 不再引发渲染。
 *
 * 不得用 console.error 静音 / `IS_REACT_ACT_ENVIRONMENT=false` 之类的方式"消音"。
 */
export function resetAuthAfterTest() {
	cleanup();
	localStorage.clear();
	useAuthStore.getState().clearAuth();
}
