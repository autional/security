'use client';

import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { Result } from '@autional/ui';
import { useLogout, useTenantSlugFromUrl } from '@autional/shared';

interface NoAccessPageProps {
	/**
	 * 内层守卫（SecurityAdminGuard）场景显示「返回首页」。
	 * 顶层准入被拒时门户内无任何可达页面（首页同样被拒 → 点击即回环），故默认不显示。
	 */
	showHome?: boolean;
}

/**
 * NoAccessPage — 守卫拒绝兜底页（S-75：角色不符时 RequireAuth 需 fallback 承接，
 * 取代原先未传 fallback 的 `return null` 整页白屏死路）。
 * 出口 = 切换账号（AuthService.logout 清本域 4 键 + best-effort 吊销 + 漏斗落回 auth 域登录）；
 * 兼容顶层全页（替代 LayoutWrapper）与 AppLayout 内容区两种上下文。
 */
export default function NoAccessPage({ showHome = false }: NoAccessPageProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const logout = useLogout();
	const slug = useTenantSlugFromUrl();
	const home = slug ? `/${slug}` : '/';

	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<Result
				variant="warning"
				className="w-full max-w-md"
				title={<span className="text-4xl font-bold">403</span>}
				description={t(
					'roleGuard.noAccess',
					'抱歉，您当前账号的角色无权访问此页面。如需访问，请切换具备相应权限的账号。',
				)}
				action={[
					<Button type="primary" key="switch-account" onClick={logout}>
						{t('roleGuard.switchAccount', '切换账号')}
					</Button>,
					showHome ? (
						<Button key="back-home" onClick={() => navigate(home)}>
							{t('roleGuard.backHome', '返回首页')}
						</Button>
					) : null,
				]}
			/>
		</div>
	);
}
