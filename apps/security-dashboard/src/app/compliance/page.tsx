'use client';

import React, { useState } from 'react';
import { DataTable } from '@autional/ui/antd';
import type { DataTableColumns } from '@autional/ui/antd';
import { AppPageHeader } from '@autional/ui';
import { Card, Tag, Spin, Empty, Progress, Row, Col, Statistic, Tabs, Badge } from 'antd';
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
	useComplianceSelfScore,
	useDSARsTab,
	useRetentionPoliciesTab,
	useISOControlsTab,
	useSOXControlsTab,
	usePenTestReportsTab,
} from '@/hooks/use-security-queries';
import { useTranslation } from 'react-i18next';

interface ComplianceCheckItem {
	item: string;
	passed: boolean;
	status: string;
	description?: string;
	issues?: string[];
	severity?: string;
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
	const { data: dsars, isLoading: dsarLoading } = useDSARsTab();
	const { data: retentionPolicies, isLoading: retentionLoading } = useRetentionPoliciesTab();
	const { data: isoControls, isLoading: isoLoading } = useISOControlsTab();
	const { data: soxControls, isLoading: soxLoading } = useSOXControlsTab();
	const { data: penTests, isLoading: penTestLoading } = usePenTestReportsTab();

	const tabLoadingMap: Record<string, boolean> = {
		overview: overviewLoading || scoreLoading,
		dsar: dsarLoading,
		retention: retentionLoading,
		iso: isoLoading,
		sox: soxLoading,
		pentest: penTestLoading,
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
						<Col xs={24} sm={8}>
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
						<Col xs={24} sm={8}>
							<Card>
								{/* 后端取值域为 compliant/non_compliant/evaluation_error（dto.go）；
									未知值按 '--' 渲染而非臆断为失败 */}
								<Statistic
									title={t('compliance.overallStatus')}
									value={
										(compliance as any).overallStatus === 'compliant'
											? t('status.passed')
											: (compliance as any).overallStatus === 'evaluation_error'
												? t('status.warning')
												: (compliance as any).overallStatus === 'non_compliant'
													? t('status.failed')
													: '--'
									}
									prefix={
										(compliance as any).overallStatus === 'compliant' ? (
											<CheckCircle2 size="1em" className="text-success" />
										) : (compliance as any).overallStatus === 'evaluation_error' ? (
											<AlertCircle size="1em" className="text-warning" />
										) : (compliance as any).overallStatus === 'non_compliant' ? (
											<XCircle size="1em" className="text-danger" />
										) : undefined
									}
								/>
							</Card>
						</Col>
						{totalChecks > 0 && (
							<Col xs={24} sm={8}>
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

					<Card title={t('compliance.checkDetail')} className="mt-4">
						<DataTable
							columns={checkColumns}
							dataSource={checks}
							rowKey="item"
							pagination={false}
							locale={{ emptyText: <Empty description={t('compliance.noChecks')} /> }}
						/>
					</Card>

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
							render: (v: string) => <Tag>{v}</Tag>,
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
							render: (v: string) => <Tag>{v}</Tag>,
						},
						{
							title: t('compliance.columnTestResult'),
							dataIndex: 'testResult',
							// S-55②：域值为自由文本（历史行含 通过/passed 混杂），归一为本地标签；未知值原样回落
							render: (v: string) => {
								if (!v) return '-';
								const norm = v.trim().toLowerCase();
								const meta =
									norm === 'passed' || norm === 'pass' || v === '通过'
										? { label: t('status.passed'), color: 'success' as const }
										: norm === 'failed' || norm === 'fail' || v === '失败'
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

	return (
		<div>
			<AppPageHeader title={t('compliance.title')} />

			<Spin spinning={tabLoadingMap[activeTab] || false}>
				<Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
			</Spin>
		</div>
	);
}
