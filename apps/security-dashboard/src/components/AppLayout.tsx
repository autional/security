'use client';

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
	AlertTriangle,
	FileArchive,
	FileLock,
	FileSearch,
	FileText,
	LayoutDashboard,
	PanelLeftClose,
	PanelLeftOpen,
	Plug,
	RefreshCw,
	Settings,
	Shield,
} from 'lucide-react';
import { Layout, Menu, Button, Typography, Breadcrumb } from 'antd';
import { useAuth, useLogout, usePortalCatalog, useTenantSlug } from '@autional/shared';
import { AppShell, LanguageSwitcher, PortalSwitcher, ThemeToggle, UserMenu } from '@autional/ui';
import SSEEventStream from './SSEEventStream';
import { message, notification } from '@/lib/antd-app';
import { consumeSessionDegraded, SESSION_DEGRADED_NOTICE_KEY } from '@/lib/session-degrade';

const { Text } = Typography;

export default function AppLayout({ children }: { children: React.ReactNode }) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	const pathname = location.pathname;
	const [collapsed, setCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const handleLogout = useLogout();
	const { user, currentTenantId, isAuthenticated } = useAuth();
	// basename 恒 "/" 后 pathname 含租户 slug（如 /acme-corp/audit-logs），
	// slug 用于导航拼接 + 内部路径匹配（菜单高亮/面包屑）剥离前缀。
	const slug = useTenantSlug();
	// 管理面平面（audiences [admin, platform]）：安全控制台走 admin 受众端点
	const { portals } = usePortalCatalog({ tenantId: currentTenantId, slug, audience: 'admin' });
	const internalPath = slug ? pathname.replace(new RegExp(`^/${slug}`), '') || '/' : pathname;

	// S-74：会话过期降级标记 ∈ 已重新认证 → 恢复告知（toast + 关闭降级提示）。
	// 标记一次性消费；正常首次登录/无降级历史时不打扰。
	useEffect(() => {
		if (!isAuthenticated) return;
		if (!consumeSessionDegraded()) return;
		notification.destroy(SESSION_DEGRADED_NOTICE_KEY);
		message.success(t('sse.sessionRestored'));
	}, [isAuthenticated, t]);

	const menuItems = [
		{ key: '/', icon: <LayoutDashboard size="1em" />, label: t('nav.overview') },
		{
			key: 'audit',
			icon: <FileSearch size="1em" />,
			label: t('nav.auditAndTracking'),
			children: [
				{ key: '/audit-logs', label: t('nav.auditLogs') },
				{ key: '/export-jobs', label: t('nav.exportJobs') },
				{ key: '/hash-chain', label: t('nav.hashChain') },
			],
		},
		{
			key: 'threats',
			icon: <AlertTriangle size="1em" />,
			label: t('nav.threatDetection'),
			children: [
				{ key: '/risk-dashboard', label: t('nav.riskDashboard') },
				{ key: '/anomalies', label: t('nav.anomalies') },
				{ key: '/alerts', label: t('nav.alerts') },
				{ key: '/sessions', label: t('nav.sessionSecurity') },
			],
		},
		{
			key: 'identity',
			icon: <Plug size="1em" />,
			label: t('nav.identityCenter', 'Identity Center'),
			children: [
				{ key: '/nhi', label: t('nav.nhi', 'NHI Monitoring') },
				{ key: '/soc-kpi', label: t('nav.socKpi', 'SOC KPIs') },
			],
		},
		{
			key: 'compliance',
			icon: <FileLock size="1em" />,
			label: t('nav.complianceCenter'),
			children: [
				{ key: '/compliance', label: t('nav.complianceDashboard') },
				{ key: '/dsars', label: t('nav.dsar') },
				{ key: '/breaches', label: t('nav.breaches') },
				{ key: '/evidence', label: t('nav.evidence') },
				{ key: '/audit-findings', label: t('nav.auditFindings') },
			],
		},
		{
			key: 'archives',
			icon: <FileArchive size="1em" />,
			label: t('nav.archiveMgmt'),
			children: [{ key: '/archives', label: t('nav.archives') }],
		},
		{
			key: 'reports',
			icon: <FileText size="1em" />,
			label: t('nav.reportCenter'),
			children: [
				{ key: '/reports', label: t('nav.reports') },
				{ key: '/notifications/delivery-stats', label: t('nav.deliveryStats') },
			],
		},
		{ key: '/settings', icon: <Settings size="1em" />, label: t('nav.settings') },
	];

	function buildBreadcrumbs(): Array<{ title: React.ReactNode }> {
		const crumbs: Array<{ title: React.ReactNode }> = [{ title: <LayoutDashboard size="1em" /> }];
		const pathMap: Record<string, string> = {
			'/': t('bc.overview'),
			'/audit-logs': t('bc.auditLogs'),
			'/export-jobs': t('bc.exportJobs'),
			'/hash-chain': t('bc.hashChain'),
			'/anomalies': t('bc.anomalies'),
			'/alerts': t('bc.alerts'),
			'/sessions': t('bc.sessions'),
			'/compliance': t('bc.compliance'),
			'/dsars': t('bc.dsar'),
			'/breaches': t('bc.breaches'),
			'/evidence': t('bc.evidence'),
			'/audit-findings': t('bc.auditFindings'),
			'/notifications/delivery-stats': t('bc.deliveryStats'),
			'/nhi': t('nav.nhi', 'NHI Monitoring'),
			'/soc-kpi': t('nav.socKpi', 'SOC KPIs'),
			'/archives': t('bc.archives'),
			'/reports': t('bc.reports'),
			'/settings': t('bc.settings'),
		};
		if (internalPath !== '/' && pathMap[internalPath]) {
			crumbs.push({ title: pathMap[internalPath] });
		}
		return crumbs;
	}

	return (
		<AppShell
			brand={
				<span className="flex items-center gap-2 text-lg font-bold">
					{collapsed ? (
						t('app.titleShort')
					) : (
						<>
							<Shield size="1em" /> {t('app.title')}
						</>
					)}
				</span>
			}
			sidebarCollapsed={collapsed}
			nav={
				<Menu
					mode="inline"
					selectedKeys={[internalPath]}
					defaultOpenKeys={['audit', 'threats', 'identity', 'compliance', 'reports']}
					items={menuItems}
					onClick={({ key }) => {
						if (key.startsWith('/')) {
							// AC-005：basename 恒 "/" 后导航必须带 slug 前缀，否则落入顶层 * → 404。
							// key 均以 "/" 开头（menuItems 定义），`/${slug}${key}` 无双斜杠；
							// key === '/' 时 → `/${slug}/` 即租户首页。slug 兜底 ''（理论不可达，LayoutWrapper 仅在 /:tenantSlug 下渲染）。
							navigate(`/${slug ?? ''}${key}`);
						}
					}}
					className="border-r-0"
				/>
			}
			headerLeft={
				<>
					<Button
						type="text"
						className="lg:hidden"
						icon={<PanelLeftOpen size="1em" />}
						onClick={() => setMobileOpen(true)}
						aria-label={t('nav.openMenu', '打开菜单')}
					/>
					<Button
						type="text"
						className="hidden lg:inline-flex"
						icon={collapsed ? <PanelLeftOpen size="1em" /> : <PanelLeftClose size="1em" />}
						onClick={() => setCollapsed(!collapsed)}
					/>
					<Breadcrumb items={buildBreadcrumbs()} />
				</>
			}
			headerRight={
				<>
					<PortalSwitcher portals={portals} currentPortal="security" />
					<SSEEventStream />
					<LanguageSwitcher />
					<ThemeToggle />
					<Button
						type="text"
						icon={<RefreshCw size="1em" />}
						onClick={() => window.location.reload()}
						title={t('common.refresh')}
					/>
					<UserMenu
						user={user}
						items={[{ key: 'logout', type: 'logout', onClick: handleLogout }]}
					/>
				</>
			}
			mobileOpen={mobileOpen}
			onMobileClose={() => setMobileOpen(false)}
			closeLabel={t('nav.closeMenu', '关闭菜单')}
		>
			{children}
		</AppShell>
	);
}
