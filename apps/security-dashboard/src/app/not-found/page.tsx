'use client';

import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { Result } from '@autional/ui';
import { useTenantSlugFromUrl } from '@autional/shared';

/**
 * NotFoundPage — 404 页（TASK-427，AC-002）
 * 仿 end-user-portal app/not-found/page.tsx 模板，适配 security antd 设计体系。
 * 返回链接带 slug（basename 恒 "/" 后裸路径会再次落入顶层 *）：
 * - 带 slug 场景（子级 404，如 /acme-corp/xyz）→ 返回 /{slug} 租户首页
 * - 无 slug 场景（顶层 404，如裸 "/"）→ 返回根路径（模板同款语义）
 * i18n key 缺失时用默认文案兜底（不新增 locale 文件，保持改动清单不变）。
 */
export default function NotFoundPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const slug = useTenantSlugFromUrl();
	const home = slug ? `/${slug}` : '/';

	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<Result
				variant="info"
				className="w-full max-w-md"
				title={<span className="text-4xl font-bold">404</span>}
				description={t('notFound.description', '页面不存在或租户无效，请检查访问地址。')}
				action={
					<Button type="primary" onClick={() => navigate(home)}>
						{t('notFound.back', '返回首页')}
					</Button>
				}
			/>
		</div>
	);
}
