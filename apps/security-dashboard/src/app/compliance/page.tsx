'use client';

import React, { useState } from 'react';
import { DataTable } from '@autional/ui/antd';
import type { DataTableColumns } from '@autional/ui/antd';
import { AppPageHeader } from '@autional/ui';
import { Alert, Card, Tag, Spin, Empty, Progress, Row, Col, Statistic, Tabs, Badge } from 'antd';
import {
	AlertCircle,
	BadgeCheck,
	Bug,
	CheckCircle2,
	Database,
	FileText,
	Globe,
	XCircle,
} from 'lucide-react';

import dayjs from 'dayjs';
import {
	useComplianceDashboard,
	useComplianceProfile,
	useComplianceSelfScore,
	useDSARsTab,
	useRetentionPoliciesTab,
	useISOControlsTab,
	useSOXControlsTab,
	usePenTestReportsTab,
} from '@/hooks/use-security-queries';
import { useTranslation } from 'react-i18next';
import type { AdminFrameworkAssessmentSnapshot } from '@/lib/api.generated';

interface ComplianceCheckItem {
	item: string;
	passed: boolean;
	status: string;
	description?: string;
	issues?: string[];
	severity?: string;
}

/**
 * 四态词表（后端 assessment-v2）：compliant / non_compliant / not_assessed / evaluation_error。
 * 未知值一律按 not_assessed 展示：不臆断为通过或失败。
 */
const STATE_META: Record<string, { labelKey: string; color: string }> = {
	compliant: { labelKey: 'compliance.state.compliant', color: 'success' },
	non_compliant: { labelKey: 'compliance.state.non_compliant', color: 'error' },
	not_assessed: { labelKey: 'compliance.state.not_assessed', color: 'default' },
	evaluation_error: { labelKey: 'compliance.state.evaluation_error', color: 'warning' },
};

function stateMeta(status?: string) {
	return STATE_META[status ?? ''] ?? STATE_META.not_assessed;
}

/** 框架评估卡片组（门禁框架 / 独立标准 / 门禁未启用 三组共用）。 */
function FrameworkAssessmentCards({
	title,
	items,
}: {
	title: string;
	items?: AdminFrameworkAssessmentSnapshot[];
}) {
	const { t } = useTranslation();
	if (!items || items.length === 0) return null;
	return (
		<Card title={title} className="mt-4">
			<Row gutter={[16, 16]}>
				{items.map((item) => {
					const meta = stateMeta(item.status);
					const total = item.controlsTotal ?? 0;
					const assessed = item.controlsAssessed ?? 0;
					return (
						<Col
							key={`${item.framework ?? ''}-${item.standardId ?? item.displayName ?? ''}`}
							xs={24}
							sm={12}
							lg={8}
						>
							<Card size="small" className="h-full">
								<div className="flex items-center justify-between gap-2">
									<span className="font-medium">
										{item.displayName || item.framework || item.standardId}
									</span>
									<Tag color={meta.color}>{t(meta.labelKey)}</Tag>
								</div>
								<div className="mt-2 text-xs text-secondary">
									{total > 0
										? t('compliance.frameworkCoverage', { assessed, total })
										: t('compliance.coverageUnavailable')}
								</div>
								{item.evaluationError && (
									<div className="mt-2 text-xs text-warning">{item.evaluationError}</div>
								)}
							</Card>
						</Col>
					);
				})}
			</Row>
		</Card>
	);
}

export default function CompliancePage() {
	const { t } = useTranslation();
	const [activeTab, setActiveTab] = useState('overview');

	const {
		data: compliance,
		isLoading: overviewLoading,
		isError: overviewError,
	} = useComplianceDashboard();
	const { data: scoreData, isLoading: scoreLoading, isError: scoreError } = useComplianceSelfScore();
	const overallScore: number | null = scoreData?.overallScore ?? null;

	// 框架门禁：profile.enabledFrameworks 是唯一权威（门禁键词表）。
	// 加载中：页签先全显但不发数据请求；404/加载失败：按“未配置”处理（后端默认全部启用）。
	const {
		data: profile,
		isLoading: profileLoading,
		isError: profileError,
	} = useComplianceProfile();
	const frameworkKeys = profile?.enabledFrameworks ?? [];
	const tabVisible = (keys: string[]) =>
		profileLoading || profileError || keys.some((k) => frameworkKeys.includes(k));
	const tabQueryEnabled = (keys: string[]) =>
		!profileLoading && (profileError || keys.some((k) => frameworkKeys.includes(k)));
	const gdprTabVisible = tabVisible(['gdpr']);
	const isoTabVisible = tabVisible(['iso27001', 'iso27001_2022']);
	const soxTabVisible = tabVisible(['sox']);

	const { data: dsars, isLoading: dsarLoading } = useDSARsTab(tabQueryEnabled(['gdpr']));
	const { data: retentionPolicies, isLoading: retentionLoading } = useRetentionPoliciesTab();
	const { data: isoControls, isLoading: isoLoading } = useISOControlsTab(
		tabQueryEnabled(['iso27001', 'iso27001_2022']),
	);
	const { data: soxControls, isLoading: soxLoading } = useSOXControlsTab(tabQueryEnabled(['sox']));
	const { data: penTests, isLoading: penTestLoading } = usePenTestReportsTab();

	const tabLoadingMap: Record<string, boolean> = {
		overview: overviewLoading || scoreLoading,
		dsar: dsarLoading,
		retention: retentionLoading,
		iso: isoLoading,
		sox: soxLoading,
		pentest: penTestLoading,
	};

	// 控制表状态：四态走本地词表；历史/未知值原样展示（不臆断为通过或失败）
	const controlStatusTag = (value?: string) => {
		if (!value) return '-';
		const meta = STATE_META[value];
		return meta ? <Tag color={meta.color}>{t(meta.labelKey)}</Tag> : <Tag>{value}</Tag>;
	};

	const checkColumns: DataTableColumns<ComplianceCheckItem> = [
		{ title: t('compliance.columnItem'), dataIndex: 'item' },
		{
			title: t('compliance.columnStatus'),
			dataIndex: 'status',
			width: 120,
			render: (_: string, record: ComplianceCheckItem) =>
				record.passed ? (
					<Badge status="success" text={t('status.passed')} />
				) : (
					<Badge status="error" text={t('status.failed')} />
				),
		},
		{ title: t('compliance.columnDescription'), dataIndex: 'description', ellipsis: true },
		{
			title: t('compliance.columnSeverity'),
			dataIndex: 'severity',
			width: 100,
			render: (v?: string) =>
				v ? <Tag color={v === 'high' ? 'red' : v === 'medium' ? 'orange' : 'blue'}>{v}</Tag> : '-',
		},
	];

	// checks 字段当前契约不提供（S-54 诚实空态）；若未来契约提供则自动启用通过数卡与明细表
	const checks: ComplianceCheckItem[] = (compliance as any)?.checks || [];
	const passedCount = checks.filter((c) => c.passed).length;
	const totalChecks = checks.length;

	const tabItems = [
		{
			key: 'overview',
			label: (
				<span>
					<BadgeCheck size="1em" /> {t('compliance.overviewTab')}
				</span>
			),
			children: compliance ? (
				<div>
					<Row gutter={[16, 16]} className="mb-4">
						<Col xs={24} sm={6}>
							<Card>
								<Statistic
									title={t('compliance.complianceScore')}
									value={overallScore ?? '--'}
									suffix={overallScore != null ? '/ 100' : undefined}
								/>
								{overallScore != null && (
									<Progress
										percent={overallScore}
										status={
											overallScore >= 80
												? 'success'
												: overallScore >= 60
													? 'normal'
													: 'exception'
										}
										className="mt-2"
									/>
								)}
								{scoreError && (
									<div className="text-xs text-danger mt-1">
										{t('common.loadFailed', 'Load failed')}
									</div>
								)}
							</Card>
						</Col>
						<Col xs={24} sm={6}>
							<Card>
								{/* 四态词表；未知值按"待评估"渲染而非臆断为失败 */}
								<Statistic
									title={t('compliance.overallStatus')}
									value={t(stateMeta(compliance.overallStatus).labelKey)}
									prefix={
										compliance.overallStatus === 'compliant' ? (
											<CheckCircle2 size="1em" className="text-success" />
										) : compliance.overallStatus === 'evaluation_error' ? (
											<AlertCircle size="1em" className="text-warning" />
										) : compliance.overallStatus === 'non_compliant' ? (
											<XCircle size="1em" className="text-danger" />
										) : undefined
									}
								/>
							</Card>
						</Col>
						<Col xs={24} sm={6}>
							<Card>
								<Statistic
									title={t('compliance.coverageTitle')}
									value={
										compliance.assessmentCoverage &&
										(compliance.assessmentCoverage.total ?? 0) > 0
											? t('compliance.coverageValue', {
													assessed: compliance.assessmentCoverage.assessed ?? 0,
													total: compliance.assessmentCoverage.total ?? 0,
													percent: Math.round(compliance.assessmentCoverage.percent ?? 0),
												})
											: t('compliance.coverageUnavailable')
									}
								/>
							</Card>
						</Col>
						{totalChecks > 0 && (
							<Col xs={24} sm={6}>
								<Card>
									<Statistic
										title={t('compliance.checksPassed')}
										value={`${passedCount} / ${totalChecks}`}
										prefix={<FileText size="1em" className="text-info" />}
									/>
								</Card>
							</Col>
						)}
					</Row>

					{compliance.evaluationError && (
						<Alert
							type="warning"
							showIcon
							className="mb-4"
							message={t('compliance.evaluationErrorTitle')}
							description={compliance.evaluationError}
						/>
					)}
					{(compliance.unknownStandards?.length ?? 0) > 0 && (
						<Alert
							type="warning"
							showIcon
							className="mb-4"
							message={t('compliance.unknownStandards', {
								list: (compliance.unknownStandards ?? []).join(', '),
							})}
						/>
					)}
					{(compliance.invalidOverrides?.length ?? 0) > 0 && (
						<Alert
							type="warning"
							showIcon
							className="mb-4"
							message={t('compliance.invalidOverrides', {
								list: (compliance.invalidOverrides ?? [])
									.map((item) => item.parameter ?? '')
									.filter(Boolean)
									.join(', '),
							})}
						/>
					)}

					<FrameworkAssessmentCards
						title={t('compliance.frameworkCardsTitle')}
						items={compliance.frameworkAssessments}
					/>
					<FrameworkAssessmentCards
						title={t('compliance.standaloneTitle')}
						items={compliance.standaloneAssessments}
					/>
					<FrameworkAssessmentCards
						title={t('compliance.gateDisabledTitle')}
						items={compliance.gateDisabledAssessments}
					/>

					<Card title={t('compliance.checkDetail')} className="mt-4">
						<DataTable
							columns={checkColumns}
							dataSource={checks}
							rowKey="item"
							pagination={false}
							locale={{ emptyText: <Empty description={t('compliance.noChecks')} /> }}
						/>
					</Card>

					{compliance.assessmentVersion && (
						<div className="mt-2 text-xs text-secondary">
							{t('compliance.assessmentVersion', { version: compliance.assessmentVersion })}
						</div>
					)}

					{(compliance as any).recommendations &&
						(compliance as any).recommendations.length > 0 && (
							<Card title={t('compliance.recommendations')} className="mt-4">
								<ul className="list-disc pl-5 space-y-1">
									{(compliance as any).recommendations.map((r: string, i: number) => (
										<li key={i} className="text-sm">
											{r}
										</li>
									))}
								</ul>
							</Card>
						)}
				</div>
			) : (
				<Empty
					description={
						overviewError ? t('common.loadFailed', 'Load failed') : t('compliance.noComplianceData')
					}
				/>
			),
		},
		{
			key: 'dsar',
			label: (
				<span>
					<Globe size="1em" /> {t('compliance.dsarTab')}
				</span>
			),
			children: (
				<DataTable
					columns={[
						{ title: t('dsars.columnId'), dataIndex: 'id' },
						{ title: t('dsars.columnUserId'), dataIndex: 'userId' },
						{ title: t('dsars.columnType'), dataIndex: 'type' },
						{
							title: t('dsars.columnStatus'),
							dataIndex: 'status',
							render: (v: string) => <Tag>{v}</Tag>,
						},
						{
							title: t('dsars.columnCreatedAt'),
							dataIndex: 'createdAt',
							render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
						},
					]}
					dataSource={dsars || []}
					rowKey="id"
					pagination={{ pageSize: 10 }}
					locale={{ emptyText: <Empty description={t('compliance.noDsaRecords')} /> }}
				/>
			),
		},
		{
			key: 'retention',
			label: (
				<span>
					<Database size="1em" /> {t('compliance.retentionTab')}
				</span>
			),
			children: (
				<DataTable
					columns={[
						{ title: t('settings.retentionDays'), dataIndex: 'retentionPeriodDays' },
						{ title: t('settings.dataRetention'), dataIndex: 'dataType' },
						{ title: t('settings.purpose'), dataIndex: 'purpose' },
						{ title: t('settings.legalBasis'), dataIndex: 'legalBasis' },
						{
							title: t('anomalies.columnStatus'),
							dataIndex: 'status',
							render: (v: string) =>
								v ? (
									<Tag color={v === 'active' ? 'success' : 'default'}>{v}</Tag>
								) : (
									'-'
								),
						},
					]}
					dataSource={retentionPolicies || []}
					rowKey="policyId"
					pagination={{ pageSize: 10 }}
					locale={{ emptyText: <Empty description={t('compliance.noRetentionPolicies')} /> }}
				/>
			),
		},
		{
			key: 'iso',
			label: (
				<span>
					<BadgeCheck size="1em" /> {t('compliance.isoTab')}
				</span>
			),
			children: (
				<DataTable
					columns={[
						{ title: t('evidence.columnControlId'), dataIndex: 'controlId' },
						{ title: t('settings.connectorName'), dataIndex: 'controlName' },
						{ title: t('anomalies.columnType'), dataIndex: 'category' },
						{
							title: t('anomalies.columnStatus'),
							dataIndex: 'status',
							render: (v: string) => controlStatusTag(v),
						},
						{
							title: t('compliance.columnLastReviewed'),
							dataIndex: 'lastReviewed',
							render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '-'),
						},
					]}
					dataSource={isoControls || []}
					rowKey="id"
					pagination={{ pageSize: 10 }}
					locale={{ emptyText: <Empty description={t('compliance.noIsoControls')} /> }}
				/>
			),
		},
		{
			key: 'sox',
			label: (
				<span>
					<FileText size="1em" /> {t('compliance.soxTab')}
				</span>
			),
			children: (
				<DataTable
					columns={[
						{ title: t('evidence.columnControlId'), dataIndex: 'controlId' },
						{ title: t('anomalies.columnDescription'), dataIndex: 'description' },
						{ title: t('anomalies.columnType'), dataIndex: 'controlType' },
						{
							title: t('anomalies.columnStatus'),
							dataIndex: 'status',
							render: (v: string) => controlStatusTag(v),
						},
						{
							title: t('compliance.columnTestResult'),
							dataIndex: 'testResult',
							// S-55②：域值为自由文本（历史行含 通过/passed 混杂），归一为本地标签；未知值原样回落
							render: (v: string) => {
								if (!v) return '-';
								const norm = v.trim().toLowerCase();
								const meta =
									norm === 'passed' || norm === 'pass' || v === '通过' // i18n-exempt: 服务端域值归一匹配（历史行含中文值），非显示文案
										? { label: t('status.passed'), color: 'success' as const }
										: norm === 'failed' || norm === 'fail' || v === '失败' // i18n-exempt: 服务端域值归一匹配（历史行含中文值），非显示文案
											? { label: t('status.failed'), color: 'error' as const }
											: { label: v, color: 'default' as const };
								return <Tag color={meta.color}>{meta.label}</Tag>;
							},
						},
						{
							title: t('compliance.columnLastTestDate'),
							dataIndex: 'lastTestDate',
							render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '-'),
						},
					]}
					dataSource={soxControls || []}
					rowKey="controlId"
					pagination={{ pageSize: 10 }}
					locale={{ emptyText: <Empty description={t('compliance.noSoxControls')} /> }}
				/>
			),
		},
		{
			key: 'pentest',
			label: (
				<span>
					<Bug size="1em" /> {t('compliance.pentestTab')}
				</span>
			),
			children: (
				<DataTable
					columns={[
						{ title: t('reports.title'), dataIndex: 'reportId' },
						{ title: t('alerts.columnTitle'), dataIndex: 'title' },
						{
							title: t('alerts.columnSeverity'),
							dataIndex: 'severity',
							render: (v: string) => (
								<Tag color={v === 'critical' ? 'red' : v === 'high' ? 'orange' : 'blue'}>{v}</Tag>
							),
						},
						{ title: t('compliance.columnFindings'), dataIndex: 'findings' },
						{
							title: t('compliance.columnTestedAt'),
							dataIndex: 'testedAt',
							render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '-'),
						},
						{
							title: t('compliance.columnNextTestDate'),
							dataIndex: 'nextTestDate',
							render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '-'),
						},
					]}
					dataSource={penTests || []}
					rowKey="reportId"
					pagination={{ pageSize: 10 }}
					locale={{ emptyText: <Empty description={t('compliance.noPentestReports')} /> }}
				/>
			),
		},
	];

	// 未启用的框架不出现页签；若当前激活页签被隐藏则回落到概览。
	const visibleTabItems = tabItems.filter((item) => {
		switch (item.key) {
			case 'dsar':
				return gdprTabVisible;
			case 'iso':
				return isoTabVisible;
			case 'sox':
				return soxTabVisible;
			default:
				return true;
		}
	});
	const activeTabKey = visibleTabItems.some((item) => item.key === activeTab) ? activeTab : 'overview';

	return (
		<div>
			<AppPageHeader title={t('compliance.title')} />

			<Spin spinning={tabLoadingMap[activeTabKey] || false}>
				<Tabs activeKey={activeTabKey} onChange={setActiveTab} items={visibleTabItems} />
			</Spin>
		</div>
	);
}
