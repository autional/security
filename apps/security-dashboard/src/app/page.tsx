'use client';

import React, { useMemo } from 'react';
import { Card, Col, Row, Statistic, List, Tag, Empty, Spin, Progress, Badge, Timeline, Button, Skeleton } from 'antd';
import {
	AlertCircle,
	AlertTriangle,
	BadgeCheck,
	CheckCircle2,
	Cloud,
	FileSearch,
	FileText,
	HelpCircle,
	Network,
	Plug,
	Radar,
	XCircle,
	Zap,
} from 'lucide-react';
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
	Legend,
} from 'recharts';
import {
	useAuditStats,
	useAnomaliesPreview,
	useActiveSessionCount,
	useGatewayStatus,
} from '@/hooks/use-overview';
import { useHashChain, useComplianceSelfScore } from '@/hooks/use-security-queries';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAuth, useTenantSlug } from '@autional/shared';
import { Alert, ConsolePageHeader } from '@autional/ui';
import { UserIdentity } from '@/components/UserIdentity';
import { anomalyDescription } from '@/lib/anomaly';
import { anomalyTypeLabel, severityColor, severityLabel } from '@/lib/enums';
import { eventActionLabel, eventMessage } from '@/lib/timeline';

interface SecurityEvent {
	id: string;
	time: number;
	title: string;
	description: string;
	type: 'anomaly' | 'audit' | 'compliance' | 'session';
	userId?: string;
}

function buildEventsFromData(
	auditLogs: any[],
	anomalyItems: any[],
	t: (k: string) => string,
): SecurityEvent[] {
	const events: SecurityEvent[] = [];
	if (anomalyItems?.length) {
		for (const a of anomalyItems.slice(0, 3)) {
			events.push({
				id: a.id || `anomaly-${Date.now()}`,
				time: a.detectedAt ? new Date(a.detectedAt).getTime() : Date.now(),
				// S-05（fix-security-w5）：标题按 type 本地化（原恒为通用「异常检测」），
				// 描述走 anomalyDescription 重排模板（原渲染英文原文）
				title:
					a.title ||
					(a.type ? anomalyTypeLabel(t, a.type) : t('anomalyTypes.anomaly_detection')),
				description: anomalyDescription(t, {
					type: a.type,
					description: a.description || a.message,
				}),
				type: 'anomaly',
				userId: a.userId || a.user_id,
			});
		}
	}
	if (auditLogs?.length) {
		for (const log of auditLogs.slice(0, 2)) {
			events.push({
				id: log.id || log.requestId || `audit-${Date.now()}`,
				time: log.timestamp ? log.timestamp * 1000 : Date.now(),
				title: `${log.module || ''} - ${eventActionLabel(t, log.action || '')}`,
				description: eventMessage(t, log.message || log.action || ''),
				type: 'audit',
				userId: log.userId || log.user_id,
			});
		}
	}
	if (events.length === 0) {
		events.push({
			id: 'init-1',
			time: Date.now(),
			title: t('overview.systemReady'),
			description: t('overview.systemMonitoringDesc'),
			type: 'audit',
		});
	}
	return events;
}

const PIE_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)'];
const SEVERITY_COLORS: Record<string, string> = {
	critical: '#ef4444',
	high: '#f97316',
	medium: '#f59e0b',
	low: 'var(--color-primary-700)',
};
const EVENT_TYPE_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
	anomaly: { color: 'red', icon: <AlertTriangle size="1em" /> },
	audit: { color: 'blue', icon: <FileText size="1em" /> },
	compliance: { color: 'green', icon: <BadgeCheck size="1em" /> },
	session: { color: 'cyan', icon: <Network size="1em" /> },
};

export default function OverviewPage() {
	const { t, i18n } = useTranslation();
	const { currentTenantId } = useAuth();
	const slug = useTenantSlug();
	const { data: auditData, isLoading: auditLoading } = useAuditStats();
	const { data: anomalyData, isLoading: anomalyLoading } = useAnomaliesPreview();
	// 合规评分改走租户 self score（admin twin 租户级读族，S-03）——原用户面 complianceStatus
	// 对 security 角色恒 403，且其响应从未包含 complianceScore 字段
	const {
		data: selfScore,
		isLoading: selfScoreLoading,
		isError: selfScoreError,
	} = useComplianceSelfScore();
	const { data: chain, isLoading: verifyLoading } = useHashChain(currentTenantId);
	const { data: sessionData, isLoading: sessionLoading } = useActiveSessionCount();
	const {
		data: gatewayData,
		isLoading: gatewayLoading,
		isError: gatewayError,
		error: gatewayErrorObj,
		refetch: refetchGateway,
	} = useGatewayStatus();

	const loading =
		auditLoading || anomalyLoading || selfScoreLoading || verifyLoading || sessionLoading;

	const stats = useMemo(() => {
		const totalLogs = auditData?.totalLogs || 0;
		const openAnomalies = anomalyData?.total || anomalyData?.items?.length || 0;
		// 评分无数据时保持 null——0 分是会被误读的合规结论（S-03）
		const complianceScore: number | null = selfScore?.overallScore ?? null;
		const activeSessions = sessionData?.count || 0;

		// 本租户链快照三态（S-06）：加载中/无数据 = null（未知）——null 不得映射为「通过」
		// （安全面板上的假绿是危险默认值）；只有拿到链快照才给 通过/异常 结论，断裂计 1 项
		const hashChainValid: boolean | null = chain == null ? null : chain.isValid !== false;
		const criticalAlerts = chain?.isValid === false ? 1 : 0;

		return {
			totalLogs,
			openAnomalies,
			complianceScore,
			activeSessions,
			hashChainValid,
			criticalAlerts,
		};
	}, [auditData, anomalyData, selfScore, sessionData, chain]);

	const recentAnomalies = useMemo(() => {
		return anomalyData?.items?.slice(0, 5) || [];
	}, [anomalyData]);

	const severityData = useMemo(() => {
		const items = anomalyData?.items || [];
		const severityMap: Record<string, number> = {};
		items.forEach((a: any) => {
			severityMap[a.severity] = (severityMap[a.severity] || 0) + 1;
		});
		return Object.entries(severityMap).map(([name, value]) => ({ name, value }));
	}, [anomalyData]);

	const trendData = useMemo(() => {
		if (auditData?.trend) {
			return auditData.trend.slice(-7).map((td: any) => ({
				time: new Date(td.timestamp).toLocaleDateString(i18n.language, {
					month: 'short',
					day: 'numeric',
				}),
				count: td.count,
			}));
		}
		return [];
	}, [auditData, i18n.language]);

	// S-08（fix-security-w5）：原样映射 20 项 + 长尾图例（billing:1 等）淹没问题；
	// 且无数据时回落硬编码假 mock（假数据删除）。改按量降序前 5 + 其余聚合「其他模块」，
	// 无数据交 ChartEmpty 诚实空态。
	const moduleData = useMemo(() => {
		const byModule = auditData?.byModule;
		if (!byModule) return [];
		const entries = Object.entries(byModule)
			.map(([name, value]) => ({ name, value: Number(value) }))
			.sort((a, b) => b.value - a.value);
		const TOP_N = 5;
		if (entries.length <= TOP_N) return entries;
		const rest = entries.slice(TOP_N).reduce((sum, e) => sum + e.value, 0);
		if (rest <= 0) return entries.slice(0, TOP_N);
		return [...entries.slice(0, TOP_N), { name: t('overview.otherModules'), value: rest }];
	}, [auditData, t]);

	const serviceStatuses = useMemo(() => {
		const checks = gatewayData?.checks || {};
		const latencies = gatewayData?.checks_latency || {};
		return Object.entries(checks).map(([name, status]) => ({
			name,
			status,
			latency: latencies[name],
		}));
	}, [gatewayData]);

	const events = useMemo(
		() =>
			buildEventsFromData(
				auditData?.logs || auditData?.items || [],
				anomalyData?.items || anomalyData?.anomalies || [],
				t,
			),
		[auditData, anomalyData, t],
	);

	const ChartEmpty = ({ title }: { title: string }) => (
		<div className="flex flex-col items-center justify-center h-[250px]">
			<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`${title} ${t('common.noData')}`} />
		</div>
	);

	const serviceStatusColor = (status: string) => {
		switch (status) {
			case 'healthy':
				return 'bg-success';
			case 'degraded':
				return 'bg-warning';
			case 'unhealthy':
				return 'bg-danger';
			default:
				return 'bg-neutral-500';
		}
	};

	const serviceStatusText = (status: string) => {
		switch (status) {
			case 'healthy':
				return t('status.healthy');
			case 'degraded':
				return t('status.degraded');
			case 'unhealthy':
				return t('status.unhealthy');
			default:
				return t('status.unknown');
		}
	};

	return (
		<div>
			<ConsolePageHeader title={t('overview.title')} />

			<Spin spinning={loading}>
				<Row gutter={[16, 16]}>
					{/* S-73（fix-security-w5）：统计卡接对应路由（原全页零 pointer/零 href） */}
					<Col xs={24} sm={12} lg={4}>
						<Link to={`/${slug ?? ''}/audit-logs`} className="block h-full">
							<Card className="cursor-pointer h-full transition-shadow hover:shadow-md">
								<Statistic
									title={t('overview.totalAuditLogs')}
									value={stats.totalLogs}
									prefix={<FileSearch size="1em" className="text-info" />}
								/>
							</Card>
						</Link>
					</Col>
					<Col xs={24} sm={12} lg={4}>
						<Link to={`/${slug ?? ''}/anomalies`} className="block h-full">
							<Card className="cursor-pointer h-full transition-shadow hover:shadow-md">
								<Statistic
									title={t('overview.pendingAnomalies')}
									value={stats.openAnomalies}
									prefix={<AlertTriangle size="1em" className="text-warning" />}
									valueStyle={{ color: stats.openAnomalies > 0 ? '#f97316' : undefined }}
								/>
							</Card>
						</Link>
					</Col>
					<Col xs={24} sm={12} lg={4}>
						<Link to={`/${slug ?? ''}/sessions`} className="block h-full">
							<Card className="cursor-pointer h-full transition-shadow hover:shadow-md">
								<Statistic
									title={t('overview.activeSessions')}
									value={stats.activeSessions}
									prefix={<Network size="1em" className="text-info" />}
								/>
							</Card>
						</Link>
					</Col>
					<Col xs={24} sm={12} lg={4}>
						<Link to={`/${slug ?? ''}/compliance`} className="block h-full">
							<Card className="cursor-pointer h-full transition-shadow hover:shadow-md">
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm text-neutral-600">{t('overview.complianceScore')}</span>
									<BadgeCheck size="1em" className="text-success" />
								</div>
								{stats.complianceScore != null ? (
									<Progress
										percent={stats.complianceScore}
										status={
											stats.complianceScore >= 80
												? 'success'
												: stats.complianceScore >= 60
													? 'normal'
													: 'exception'
										}
										format={(percent) => t('overview.scoreFormat', { score: percent })}
									/>
								) : (
									<div className="text-2xl font-semibold text-neutral-900 dark:text-white">--</div>
								)}
								{selfScoreError && (
									<div className="text-xs text-danger mt-1">
										{t('common.loadFailed', 'Load failed')}
									</div>
								)}
							</Card>
						</Link>
					</Col>
					<Col xs={24} sm={12} lg={4}>
						<Link to={`/${slug ?? ''}/hash-chain`} className="block h-full">
							<Card className="cursor-pointer h-full transition-shadow hover:shadow-md">
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm text-neutral-600">{t('overview.hashChainIntegrity')}</span>
									{stats.hashChainValid === null ? (
										<HelpCircle size="1em" className="text-neutral-500" />
									) : stats.hashChainValid ? (
										<CheckCircle2 size="1em" className="text-success" />
									) : (
										<XCircle size="1em" className="text-danger" />
									)}
								</div>
								<div className="text-base font-semibold">
									{verifyLoading ? (
										<Skeleton.Input active size="small" style={{ minWidth: 140 }} />
									) : stats.hashChainValid === null ? (
										<Badge status="default" text={t('status.unknown')} />
									) : stats.hashChainValid ? (
										<Badge status="success" text={t('overview.allPassed')} />
									) : (
										<Badge
											status="error"
											text={t('overview.anomalyCount', { count: stats.criticalAlerts })}
										/>
									)}
								</div>
							</Card>
						</Link>
					</Col>
					<Col xs={24} sm={12} lg={4}>
						<Link to={`/${slug ?? ''}/risk-dashboard`} className="block h-full">
							<Card className="cursor-pointer h-full transition-shadow hover:shadow-md">
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm text-neutral-600">{t('overview.riskLevel')}</span>
									<AlertCircle size="1em" className="text-danger" />
								</div>
								<div className="text-base font-semibold">
									{stats.criticalAlerts > 0 ? (
										<Tag color="red">{t('risk.critical')}</Tag>
									) : stats.openAnomalies > 5 ? (
										<Tag color="orange">{t('risk.high')}</Tag>
									) : (
										<Tag color="green">{t('risk.normal')}</Tag>
									)}
								</div>
							</Card>
						</Link>
					</Col>
				</Row>

				<Row gutter={[16, 16]} className="mt-4">
					<Col xs={24} lg={8}>
						<Card title={t('overview.auditTrend7d')} className="h-full">
							{trendData.length > 0 ? (
								<ResponsiveContainer width="100%" height={250}>
									<LineChart data={trendData}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="time" fontSize={12} />
										<YAxis fontSize={12} />
										<Tooltip />
										<Line
											type="monotone"
											dataKey="count"
											stroke="var(--color-primary-700)"
											strokeWidth={2}
											dot={false}
										/>
									</LineChart>
								</ResponsiveContainer>
							) : (
								<ChartEmpty title={t('overview.auditTrend7d')} />
							)}
						</Card>
					</Col>
					<Col xs={24} lg={8}>
						<Card title={t('overview.moduleDistribution')} className="h-full">
							{moduleData.length > 0 ? (
								<ResponsiveContainer width="100%" height={250}>
									<PieChart>
										<Pie
											data={moduleData}
											cx="50%"
											cy="50%"
											innerRadius={60}
											outerRadius={90}
											paddingAngle={3}
											dataKey="value"
											nameKey="name"
										>
											{moduleData.map((_, index) => (
												<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
											))}
										</Pie>
										<Tooltip />
										<Legend fontSize={12} />
									</PieChart>
								</ResponsiveContainer>
							) : (
								<ChartEmpty title={t('overview.moduleDistribution')} />
							)}
						</Card>
					</Col>
					<Col xs={24} lg={8}>
						<Card title={t('overview.anomalySeverity')} className="h-full">
							{severityData.length > 0 ? (
								<ResponsiveContainer width="100%" height={250}>
									<BarChart data={severityData}>
										<CartesianGrid strokeDasharray="3 3" />
										{/* 严重度轴标签本地化（S-16 英文混杂族同源） */}
										<XAxis
											dataKey="name"
											fontSize={12}
											tickFormatter={(name: string) => severityLabel(t, name)}
										/>
										<YAxis fontSize={12} />
										<Tooltip />
										<Bar dataKey="value" radius={[4, 4, 0, 0]}>
											{severityData.map((entry, index) => (
												<Cell
													key={`cell-${index}`}
													fill={SEVERITY_COLORS[entry.name] || 'var(--color-primary-700)'}
												/>
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							) : (
								<ChartEmpty title={t('overview.anomalySeverity')} />
							)}
						</Card>
					</Col>
				</Row>

				<Row gutter={[16, 16]} className="mt-4">
					<Col xs={24} lg={16}>
						<Card title={t('overview.serviceHealth')} className="h-full">
							<Spin spinning={gatewayLoading}>
								{gatewayError ? (
									/* S-02：接口失败（非 JSON/网络错误）≠ 服务不健康——错误态 + 重试，不渲染空态假死 */
									<Alert
										variant="danger"
										title={t('overview.cannotGetStatus')}
										action={
											<Button size="small" onClick={() => refetchGateway()}>
												{t('common.retry')}
											</Button>
										}
									>
										{gatewayErrorObj instanceof Error ? gatewayErrorObj.message : undefined}
									</Alert>
								) : serviceStatuses.length > 0 ? (
									<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
										{serviceStatuses.map((svc: any) => (
											<div
												key={svc.name}
												className="flex flex-col items-center p-2 rounded border border-neutral-200 hover:bg-neutral-50 transition-colors"
											>
												<div
													className={`w-3 h-3 rounded-full mb-2 ${serviceStatusColor(svc.status)}`}
												/>
												<div className="text-xs font-medium text-center truncate w-full">
													{svc.name.replace('-service', '')}
												</div>
												<div className="text-xs text-neutral-600">{serviceStatusText(svc.status)}</div>
												{svc.latency && svc.latency !== 'timeout' && (
													<div className="text-xs text-neutral-600">{svc.latency}</div>
												)}
											</div>
										))}
									</div>
								) : (
									<Empty description={t('overview.cannotGetStatus')} />
								)}
							</Spin>
						</Card>
					</Col>
					<Col xs={24} lg={8}>
						<Card title={t('overview.alertChannelStatus')} className="h-full">
							<div className="space-y-3">
								<div className="flex items-center justify-between p-2 rounded border border-neutral-200">
									<div className="flex items-center gap-2">
										<Cloud size="1em" className="text-info" />
										<span className="text-sm">{t('overview.emailAlert')}</span>
									</div>
									<Tag color="success">{t('overview.healthy')}</Tag>
								</div>
								<div className="flex items-center justify-between p-2 rounded border border-neutral-200">
									<div className="flex items-center gap-2">
										<Zap size="1em" className="text-warning" />
										<span className="text-sm">{t('overview.smsAlert')}</span>
									</div>
									<Tag color="success">{t('overview.healthy')}</Tag>
								</div>
								<div className="flex items-center justify-between p-2 rounded border border-neutral-200">
									<div className="flex items-center gap-2">
										<Plug size="1em" className="text-purple-500" />
										<span className="text-sm">{t('overview.siemPush')}</span>
									</div>
									<Tag color="default">{t('overview.notConfigured')}</Tag>
								</div>
								<div className="flex items-center justify-between p-2 rounded border border-neutral-200">
									<div className="flex items-center gap-2">
										<Radar size="1em" className="text-info" />
										<span className="text-sm">{t('overview.webhook')}</span>
									</div>
									<Tag color="default">{t('overview.notConfigured')}</Tag>
								</div>
							</div>
						</Card>
					</Col>
				</Row>

				<Row gutter={[16, 16]} className="mt-4">
					<Col xs={24} lg={8}>
						<Card title={t('overview.recentEvents')} className="h-full">
							<Timeline
								mode="left"
								items={events.map((evt) => {
									const cfg = EVENT_TYPE_CONFIG[evt.type];
									// S-73：事件标题接对应列表页（审计→audit-logs / 异常→anomalies）
									const drillRoute = evt.type === 'audit' ? 'audit-logs' : 'anomalies';
									return {
										label: (
											<span className="text-xs text-neutral-600">
												{new Date(evt.time).toLocaleTimeString(i18n.language, {
													hour: '2-digit',
													minute: '2-digit',
												})}
											</span>
										),
										color: cfg.color,
										dot: cfg.icon,
										children: (
											<div>
												<Link
													to={`/${slug ?? ''}/${drillRoute}`}
													className="text-sm font-medium text-primary-600 hover:opacity-80"
												>
													{evt.title}
												</Link>
												<div className="text-xs text-neutral-600">{evt.description}</div>
												{/* S-05：事件主体用户显示可读身份（link=false 防嵌套锚点） */}
												{evt.userId && (
													<div className="text-xs mt-0.5">
														<UserIdentity userId={evt.userId} link={false} />
													</div>
												)}
											</div>
										),
									};
								})}
							/>
						</Card>
					</Col>
					<Col xs={24} lg={8}>
						<Card title={t('overview.recentAnomalies')} className="h-full">
							{recentAnomalies.length === 0 ? (
								<Empty description={t('overview.noAnomalies')} />
							) : (
								<List
									size="small"
									dataSource={recentAnomalies}
									renderItem={(item: any) => (
										<List.Item className="flex justify-between">
											<div className="flex flex-col gap-1 flex-1 min-w-0 pr-2">
												<div className="flex items-center gap-2">
													<Tag color={severityColor(item.severity)}>
														{severityLabel(t, item.severity)}
													</Tag>
													{/* S-73：类型标签接异常列表页；S-05：主体用户可读身份 */}
													<Link
														to={`/${slug ?? ''}/anomalies`}
														className="font-medium text-sm text-primary-600 hover:opacity-80"
													>
														{anomalyTypeLabel(t, item.type)}
													</Link>
													<UserIdentity userId={item.userId} />
												</div>
												<div className="text-xs text-neutral-600 truncate">
													{anomalyDescription(t, item)}
												</div>
											</div>
											<div className="text-xs text-neutral-600 shrink-0">
												{item.detectedAt
													? new Date(item.detectedAt).toLocaleString(i18n.language)
													: '-'}
											</div>
										</List.Item>
									)}
								/>
							)}
						</Card>
					</Col>
					<Col xs={24} lg={8}>
						<Card title={t('overview.complianceChecks')} className="h-full">
							{/* 检查项明细不在 ComplianceStatusResponse 契约中（S-03），诚实空态 */}
							<Empty description={t('overview.noComplianceData')} />
						</Card>
					</Col>
				</Row>
			</Spin>
		</div>
	);
}
