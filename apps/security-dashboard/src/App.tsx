import { Suspense, lazy } from 'react';
import { Routes, Route, Outlet, useLocation, useParams } from 'react-router';
import AppLayout from './components/AppLayout';
import NoAccessPage from './components/NoAccessPage';
import {
	SecurityGuard,
	SecurityAdminGuard,
	OAuthCallbackPage,
	useBootstrap,
	TenantSlugProvider,
	TenantIndexGuard,
	TenantRootRedirect,
	useBranding,
	BrandingInitializer,
} from '@autional/shared';
import { ErrorBoundary } from '@autional/ui';
import ScrollToTop from './components/ScrollToTop';
import { Spin } from 'antd';

// Lazy-loaded pages
const OverviewPage = lazy(() => import('./app/page'));
const AuditLogsPage = lazy(() => import('./app/audit-logs/page'));
const AnomaliesPage = lazy(() => import('./app/anomalies/page'));
const HashChainPage = lazy(() => import('./app/hash-chain/page'));
const CompliancePage = lazy(() => import('./app/compliance/page'));
const SessionsPage = lazy(() => import('./app/sessions/page'));
const ReportsPage = lazy(() => import('./app/reports/page'));
const SettingsPage = lazy(() => import('./app/settings/page'));
const ExportJobsPage = lazy(() => import('./app/export-jobs/page'));
const DSARsPage = lazy(() => import('./app/dsars/page'));
const BreachesPage = lazy(() => import('./app/breaches/page'));
const RiskDashboardPage = lazy(() => import('./app/risk-dashboard/page'));
const EvidencePage = lazy(() => import('./app/evidence/page'));
const ArchivesPage = lazy(() => import('./app/archives/page'));
const AuditFindingsPage = lazy(() => import('./app/audit-findings/page'));
const AlertsPage = lazy(() => import('./app/alerts/page'));
const UserSecurityProfilePage = lazy(() => import('./app/users/profile/page'));
const UserSecurityTimelinePage = lazy(() => import('./app/users/timeline/page'));
const NhiPage = lazy(() => import('./app/nhi/page'));
const SocKpiPage = lazy(() => import('./app/soc-kpi/page'));
const DeliveryStatsPage = lazy(() => import('./app/notifications/delivery-stats/page'));
const NotFoundPage = lazy(() => import('./app/not-found/page'));

function LayoutWrapper() {
	const bootstrap = useBootstrap();
	const { tenantSlug } = useParams();

	if (bootstrap === 'loading') {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Spin size="large" />
			</div>
		);
	}

	return (
		<TenantSlugProvider value={tenantSlug}>
			<AppLayout>
				<Outlet />
			</AppLayout>
		</TenantSlugProvider>
	);
}

function PageTransition({ children }: { children: React.ReactNode }) {
	const location = useLocation();
	return (
		<div key={location.pathname} className="animate-fade-in">
			{children}
		</div>
	);
}

function PageLoader() {
	return (
		<div className="flex items-center justify-center min-h-[60vh]">
			<Spin size="large" tip="加载中..." />
		</div>
	);
}

export default function App() {
	useBranding();

	return (
		<ErrorBoundary devMode={false}>
			<BrandingInitializer />
			<ScrollToTop />
			{/* 外层 Suspense 为 lazy NotFoundPage（顶层 * / TenantIndexGuard notFound）提供边界 */}
			<Suspense fallback={<PageLoader />}>
				<Routes>
					<Route path="/oauth/callback" element={<OAuthCallbackPage />} />

					{/* 裸根漏斗：有会话直达 /<slug>，否则整页跳 brand 选品牌（2026-09-28 起
					    裸 "/" 不再是 404；无 slug 的其它路径仍按 AC-002 → NotFoundPage） */}
					<Route path="/" element={<TenantRootRedirect />} />

					{/* 顶层未匹配（如无 slug 的深链）→ NotFoundPage（AC-002） */}
					<Route path="*" element={<NotFoundPage />} />

					<Route
						path="/:tenantSlug"
						element={
							/* notFound：确定性未知 slug（by-slug 404）原地渲染 404，不发弹跳（F-W6）
							   fallback：非准入角色的兜底页（S-75），取代整页白屏死路 */
							<SecurityGuard notFound={<NotFoundPage />} fallback={<NoAccessPage />}>
								<LayoutWrapper />
							</SecurityGuard>
						}
					>
						{appRoutes()}
					</Route>
				</Routes>
			</Suspense>
		</ErrorBoundary>
	);
}

function appRoutes() {
	return (
		<>
			<Route
				index
				element={
					<TenantIndexGuard notFound={<NotFoundPage />}>
						<PageTransition>
							<Suspense fallback={<PageLoader />}>
								<OverviewPage />
							</Suspense>
						</PageTransition>
					</TenantIndexGuard>
				}
			/>
			<Route
				path="audit-logs"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<AuditLogsPage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="anomalies"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<AnomaliesPage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="hash-chain"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<HashChainPage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="compliance"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<CompliancePage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="sessions"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<SessionsPage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="reports"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<ReportsPage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="settings"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<SettingsPage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="export-jobs"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<ExportJobsPage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="dsars"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<DSARsPage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="breaches"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<BreachesPage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="risk-dashboard"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<RiskDashboardPage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="evidence"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<EvidencePage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="archives"
				element={
					<SecurityAdminGuard fallback={<NoAccessPage showHome />}>
						<PageTransition>
							<Suspense fallback={<PageLoader />}>
								<ArchivesPage />
							</Suspense>
						</PageTransition>
					</SecurityAdminGuard>
				}
			/>
			<Route
				path="audit-findings"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<AuditFindingsPage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="alerts"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<AlertsPage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="users/:id/profile"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<UserSecurityProfilePage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="users/:id/timeline"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<UserSecurityTimelinePage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="nhi"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<NhiPage />
						</Suspense>
					</PageTransition>
				}
			/>
			<Route
				path="soc-kpi"
				element={
					<SecurityAdminGuard fallback={<NoAccessPage showHome />}>
						<PageTransition>
							<Suspense fallback={<PageLoader />}>
								<SocKpiPage />
							</Suspense>
						</PageTransition>
					</SecurityAdminGuard>
				}
			/>
			<Route
				path="notifications/delivery-stats"
				element={
					<PageTransition>
						<Suspense fallback={<PageLoader />}>
							<DeliveryStatsPage />
						</Suspense>
					</PageTransition>
				}
			/>
			{/* 子级兜底：/:tenantSlug 下未知子路径 → NotFoundPage（AC-002） */}
			<Route path="*" element={<NotFoundPage />} />
		</>
	);
}
