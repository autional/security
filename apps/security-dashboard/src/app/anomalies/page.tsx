'use client';

import React, { useState, useMemo } from 'react';
import { DataTable } from '@autional/ui/antd';
import type { DataTableColumns } from '@autional/ui/antd';
import { AppPageHeader } from '@autional/ui';
import { Card, Select, Tag, Button, Spin, Empty, Space, Badge, Row, Col, Statistic, Segmented } from 'antd';
import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	RefreshCw,
} from 'lucide-react';

import dayjs from 'dayjs';
import { useAnomalies, useUpdateAnomalyStatus } from '@/hooks/use-security-queries';
import { message, modal } from '@/lib/antd-app';
import { useTranslation } from 'react-i18next';
import AnomalyDetailDrawer from '@/components/anomaly/AnomalyDetailDrawer';
import AssignAnomalyModal from '@/components/anomaly/AssignAnomalyModal';
import { Can } from '@/components/Can';
import { UserIdentity } from '@/components/UserIdentity';
import { PageScopeHint } from '@/components/PageScopeHint';
import { severityColor, severityLabel } from '@/lib/enums';
import { anomalyDescription } from '@/lib/anomaly';

interface AnomalyItem {
	id: string;
	type: string;
	severity: 'low' | 'medium' | 'high' | 'critical';
	description: string;
	userId: string;
	tenantId: string;
	status: 'open' | 'investigating' | 'resolved' | 'false_positive';
	detectedAt: number;
}

export default function AnomaliesPage() {
	const { t } = useTranslation();

	const statusLabels: Record<string, string> = {
		open: t('anomalies.statusOpen'),
		investigating: t('anomalies.statusInvestigating'),
		resolved: t('anomalies.statusResolved'),
		false_positive: t('anomalies.statusFalsePositive'),
	};

	const typeLabels: Record<string, string> = {
		brute_force: t('anomalyTypes.brute_force'),
		impossible_travel: t('anomalyTypes.impossible_travel'),
		unusual_location: t('anomalyTypes.unusual_location'),
		unusual_time: t('anomalyTypes.unusual_time'),
		privilege_escalation: t('anomalyTypes.privilege_escalation'),
	};

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [filters, setFilters] = useState<Record<string, any>>({});
	const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
	const [drawerVisible, setDrawerVisible] = useState(false);
	const [assignModalVisible, setAssignModalVisible] = useState(false);

	const { data, isLoading, refetch } = useAnomalies({ page, pageSize, filters });
	const updateMutation = useUpdateAnomalyStatus();

	const items = useMemo(() => (data as any)?.items || [], [data]);
	const total = useMemo(
		() => (data as any)?.total || (data as any)?.pagination?.total || items.length,
		[data, items.length],
	);

	const stats = useMemo(() => {
		const open = items.filter((i: AnomalyItem) => i.status === 'open').length;
		const investigating = items.filter((i: AnomalyItem) => i.status === 'investigating').length;
		const resolved = items.filter((i: AnomalyItem) => i.status === 'resolved').length;
		const critical = items.filter((i: AnomalyItem) => i.severity === 'critical').length;
		return { open, investigating, resolved, critical };
	}, [items]);

	// S-37（2026-10-04）：状态流转为直接落库写操作，先弹确认；误报标记确认按钮用 danger 呈现。
	const confirmContentKey: Record<'investigating' | 'resolved' | 'false_positive', string> = {
		investigating: 'anomalies.confirmInvestigate',
		resolved: 'anomalies.confirmResolve',
		false_positive: 'anomalies.confirmFalsePositive',
	};

	const handleStatusChange = (id: string, status: 'investigating' | 'resolved' | 'false_positive') => {
		modal.confirm({
			title: t('anomalies.confirmTitle'),
			content: t(confirmContentKey[status]),
			okText: t('common.confirm'),
			cancelText: t('common.cancel'),
			okButtonProps: status === 'false_positive' ? { danger: true } : undefined,
			onOk: async () => {
				try {
					await updateMutation.mutateAsync({ id, status });
					message.success(t('anomalies.statusUpdated'));
				} catch {
					message.error(t('anomalies.updateFailed'));
				}
			},
		});
	};

	const openDetail = (id: string) => {
		setSelectedAnomalyId(id);
		setDrawerVisible(true);
	};

	const openAssign = (id: string) => {
		setSelectedAnomalyId(id);
		setAssignModalVisible(true);
	};

	const handleQuickRange = (value: string) => {
		const newFilters = value ? { ...filters, timeRange: value } : { ...filters };
		if (!value) delete newFilters.timeRange;
		setFilters(newFilters);
		setPage(1);
	};

	const quickRanges = [
		{ label: t('anomalies.rangeAll'), value: '' },
		{ label: t('anomalies.range1h'), value: '1h' },
		{ label: t('anomalies.range24h'), value: '24h' },
		{ label: t('anomalies.range7d'), value: '7d' },
		{ label: t('anomalies.range30d'), value: '30d' },
	];

	const columns: DataTableColumns<AnomalyItem> = [
		{ title: t('anomalies.columnId'), dataIndex: 'id', width: 180 },
		{
			title: t('anomalies.columnType'),
			dataIndex: 'type',
			width: 130,
			render: (v: string) => typeLabels[v] || v,
		},
		{
			title: t('anomalies.columnSeverity'),
			dataIndex: 'severity',
			width: 110,
			render: (v: string) => <Tag color={severityColor(v)}>{severityLabel(t, v)}</Tag>,
		},
		{
			title: t('anomalies.columnDescription'),
			dataIndex: 'description',
			ellipsis: true,
			render: (_: unknown, record: AnomalyItem) => anomalyDescription(t, record),
		},
		{
			title: t('anomalies.columnUser'),
			dataIndex: 'userId',
			width: 170,
			render: (v: string) => <UserIdentity userId={v} />,
		},
		{ title: t('anomalies.columnTenant'), dataIndex: 'tenantId', width: 120 },
		{
			title: t('anomalies.columnStatus'),
			dataIndex: 'status',
			width: 110,
			render: (v: string) => (
				<Badge
					status={v === 'open' ? 'error' : v === 'investigating' ? 'warning' : 'success'}
					text={statusLabels[v] || v}
				/>
			),
		},
		{
			title: t('anomalies.columnDetectedAt'),
			dataIndex: 'detectedAt',
			width: 180,
			render: (v: number) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
		},
		{
			title: t('common.actions'),
			width: 200,
			fixed: 'right',
			render: (_: any, record: AnomalyItem) => (
				<Space size="small">
					<Button size="small" onClick={() => openDetail(record.id)}>
						{t('anomalies.actionDetail')}
					</Button>
					<Can denyAuditor>
						{record.status === 'open' && (
							<>
								<Button size="small" onClick={() => handleStatusChange(record.id, 'investigating')}>
									{t('anomalies.actionInvestigate')}
								</Button>
								<Button size="small" onClick={() => openAssign(record.id)}>
									{t('anomalies.actionAssign')}
								</Button>
							</>
						)}
						{(record.status === 'open' || record.status === 'investigating') && (
							<>
								<Button
									size="small"
									type="primary"
									onClick={() => handleStatusChange(record.id, 'resolved')}
								>
									{t('anomalies.actionResolve')}
								</Button>
								{/* S-37：误报按状态收窄（终态行不再提供该动作） */}
								<Button
									size="small"
									danger
									onClick={() => handleStatusChange(record.id, 'false_positive')}
								>
									{t('anomalies.actionFalsePositive')}
								</Button>
							</>
						)}
					</Can>
				</Space>
			),
		},
	];

	return (
		<div>
			<AppPageHeader
				title={t('anomalies.title')}
				actions={
					<>
						<Button icon={<RefreshCw size="1em" />} onClick={() => refetch()}>
							{t('common.refresh')}
						</Button>
					</>
				}
			/>

			<Row gutter={[16, 16]} className="mb-4">
				<Col xs={12} sm={6}>
					<Card>
						<Statistic
							title={<span>{t('anomalies.statsOpen')}<PageScopeHint /></span>}
							value={stats.open}
							prefix={<AlertTriangle size="1em" className="text-danger" />}
						/>
					</Card>
				</Col>
				<Col xs={12} sm={6}>
					<Card>
						<Statistic
							title={<span>{t('anomalies.statsInvestigating')}<PageScopeHint /></span>}
							value={stats.investigating}
							prefix={<AlertCircle size="1em" className="text-warning" />}
						/>
					</Card>
				</Col>
				<Col xs={12} sm={6}>
					<Card>
						<Statistic
							title={<span>{t('anomalies.statsResolved')}<PageScopeHint /></span>}
							value={stats.resolved}
							prefix={<CheckCircle2 size="1em" className="text-success" />}
						/>
					</Card>
				</Col>
				<Col xs={12} sm={6}>
					<Card>
						<Statistic
							title={<span>{t('anomalies.statsCritical')}<PageScopeHint /></span>}
							value={stats.critical}
							prefix={<AlertTriangle size="1em" className="text-chart-7" />}
						/>
					</Card>
				</Col>
			</Row>

			<Card className="mb-4">
				<Space direction="vertical" className="w-full" size="middle">
					<Segmented
						options={quickRanges}
						value={filters.timeRange || ''}
						onChange={(v) => handleQuickRange(v as string)}
					/>
					<Space wrap>
						<Select
							placeholder={t('anomalies.filterSeverity')}
							allowClear
							value={filters.severity || undefined}
							onChange={(v) => {
								setFilters({ ...filters, severity: v });
								setPage(1);
							}}
							style={{ width: 130 }}
							options={(['low', 'medium', 'high', 'critical'] as const).map((v) => ({
								label: severityLabel(t, v),
								value: v,
							}))}
						/>
						<Select
							placeholder={t('anomalies.filterStatus')}
							allowClear
							value={filters.status || undefined}
							onChange={(v) => {
								setFilters({ ...filters, status: v });
								setPage(1);
							}}
							style={{ width: 130 }}
							options={[
								{ label: t('anomalies.statusOpen'), value: 'open' },
								{ label: t('anomalies.statusInvestigating'), value: 'investigating' },
								{ label: t('anomalies.statusResolved'), value: 'resolved' },
								{ label: t('anomalies.statusFalsePositive'), value: 'false_positive' },
							]}
						/>
						{/* S-39：筛选控件 onChange 即时生效（无草稿输入），移除语义误导的「搜索」按钮 */}
						<Button
							onClick={() => {
								setFilters({});
								setPage(1);
							}}
						>
							{t('common.reset')}
						</Button>
					</Space>
				</Space>
			</Card>

			<Spin spinning={isLoading}>
				<DataTable
					columns={columns}
					dataSource={items}
					rowKey="id"
					pagination={{
						current: page,
						pageSize,
						total,
						showSizeChanger: true,
						showTotal: (cnt) => t('common.total', { count: cnt }),
						onChange: (p, ps) => {
							setPage(p);
							setPageSize(ps);
						},
					}}
					scroll={{ x: 1200 }}
					locale={{ emptyText: <Empty description={t('anomalies.empty')} /> }}
				/>
			</Spin>

			<AnomalyDetailDrawer
				anomalyId={selectedAnomalyId}
				visible={drawerVisible}
				onClose={() => setDrawerVisible(false)}
				onStatusChange={refetch}
			/>

			<AssignAnomalyModal
				anomalyId={selectedAnomalyId}
				visible={assignModalVisible}
				onClose={() => setAssignModalVisible(false)}
				onSuccess={refetch}
			/>
		</div>
	);
}
