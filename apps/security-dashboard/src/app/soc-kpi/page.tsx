'use client';

import React from 'react';
import { DataTable } from '@autional/ui/antd';
import { AppPageHeader } from '@autional/ui';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuditStats, useAnomalies, useAlerts } from '@/hooks/use-security-queries';

export default function SocKpiPage() {
	const { t } = useTranslation();

	const { data: statsData, isLoading: statsLoading } = useAuditStats();
	const { data: anomaliesData } = useAnomalies({ page: 1, pageSize: 1 });
	const { data: alertsData } = useAlerts({ page: 1, page_size: 1 });

	const stats = (statsData as any) || {};
	const anomalyCount = ((anomaliesData as any)?.total || 0) as number;
	const alertCount = ((alertsData as any)?.total || 0) as number;

	const statCards = [
		{
			key: 'totalLogs',
			title: t('socKpi.totalLogs', 'Total Logs'),
			value: stats?.totalLogs ?? stats?.total ?? 0,
			icon: <Clock size="1em" />,
			color: '#1677ff',
		},
		{
			key: 'totalAnomalies',
			title: t('socKpi.totalAnomalies', 'Total Anomalies'),
			value: anomalyCount,
			icon: <AlertTriangle size="1em" />,
			color: '#fa8c16',
		},
		{
			key: 'totalAlerts',
			title: t('socKpi.totalAlerts', 'Total Alerts'),
			value: alertCount,
			icon: <ShieldAlert size="1em" />,
			color: 'var(--color-danger)',
		},
	];

	return (
		<div>
			<AppPageHeader title={t('socKpi.title', 'SOC KPIs')} />

			<Row gutter={[16, 16]} className="mb-4">
				{statCards.map((c) => (
					<Col xs={24} sm={12} md={8} key={c.key}>
						<Card>
							{statsLoading ? (
								<div className="text-center py-4">
									<Spin />
								</div>
							) : (
								<Statistic
									title={c.title}
									value={c.value}
									prefix={<span style={{ color: c.color }}>{c.icon}</span>}
								/>
							)}
						</Card>
					</Col>
				))}
			</Row>

			<Card title={t('socKpi.auditStats', 'Audit Statistics')}>
				<DataTable
					rowKey="key"
					dataSource={[
						{
							key: 'total_entries',
							label: t('socKpi.totalEntries', 'Total Audit Entries'),
							value: stats?.totalLogs ?? stats?.total ?? '-',
						},
						{
							key: 'today_entries',
							label: t('socKpi.todayEntries', 'Today Entries'),
							value: stats?.todayEntries ?? '-',
						},
					]}
					columns={[
						{ title: t('socKpi.metric', 'Metric'), dataIndex: 'label', key: 'label' },
						{ title: t('socKpi.value', 'Value'), dataIndex: 'value', key: 'value' },
					]}
					pagination={false}
					size="small"
					loading={statsLoading}
				/>
			</Card>
		</div>
	);
}
