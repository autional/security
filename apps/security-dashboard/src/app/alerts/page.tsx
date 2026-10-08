'use client';

import React, { useState, useMemo } from 'react';
import { DataTable, Drawer } from '@autional/ui/antd';
import type { DataTableColumns } from '@autional/ui/antd';
import { AppPageHeader } from '@autional/ui';
import { Card, Select, Tag, Button, Spin, Empty, Space, Row, Col, Statistic, Descriptions, Modal, Tooltip } from 'antd';
import {
	AlertTriangle,
	Ban,
	Bell,
	CheckCircle2,
	Eye,
	RefreshCw,
	TrendingUp,
	UserCheck,
} from 'lucide-react';

import dayjs from 'dayjs';
import { useAlerts, useUpdateAlertStatus, useAssignAlert, useAdminUsers } from '@/hooks/use-security-queries';
import { message } from '@/lib/antd-app';
import { Can } from '@/components/Can';
import { PageScopeHint } from '@/components/PageScopeHint';
import { useTranslation } from 'react-i18next';
import { severityColor, severityLabel } from '@/lib/enums';

interface AlertItem {
	id: string;
	type: string;
	severity: string;
	title: string;
	description: string;
	source?: string;
	tenantId: string;
	status: string;
	assignee?: string;
	createdAt: string;
	updatedAt?: string;
	acknowledgedAt?: string;
	escalatedAt?: string;
	resolvedAt?: string;
	resolvedBy?: string;
}

const statusColorMap: Record<string, string> = {
	open: 'error',
	acknowledged: 'processing',
	escalated: 'warning',
	resolved: 'success',
	dismissed: 'default',
};

export default function AlertsPage() {
	const { t } = useTranslation();

	const statusLabels: Record<string, string> = {
		open: t('alerts.statusOpen'),
		acknowledged: t('alerts.statusAcknowledged'),
		escalated: t('alerts.statusEscalated'),
		resolved: t('alerts.statusResolved'),
		dismissed: t('alerts.statusDismissed'),
	};

	const typeLabels: Record<string, string> = {
		threshold: t('alerts.typeThreshold'),
		anomaly: t('alerts.typeAnomaly'),
		compliance: t('alerts.typeCompliance'),
		security: t('alerts.typeSecurity'),
	};

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [filters, setFilters] = useState<Record<string, any>>({});
	const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
	const [drawerVisible, setDrawerVisible] = useState(false);
	const [assignModalVisible, setAssignModalVisible] = useState(false);
	const [assignee, setAssignee] = useState<string | undefined>(undefined);
	const [assignSearch, setAssignSearch] = useState('');
	const assignSearchTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	// S-44：筛选平铺下发（对齐 BE ListAlerts 的扁平 query 契约；
	// 原 nested filters 对象序列化为 filters[severity]=… 永不被 ShouldBindQuery 绑定 → 静默失效）
	const { data, isLoading, refetch } = useAlerts({ page, pageSize, ...filters });
	const statusMutation = useUpdateAlertStatus();
	const assignMutation = useAssignAlert();

	const items = useMemo(() => (data as any)?.items || [], [data]);
	const total = useMemo(
		() => (data as any)?.total || (data as any)?.pagination?.total || items.length,
		[data, items.length],
	);

	const stats = useMemo(() => {
		const open = items.filter((i: AlertItem) => i.status === 'open').length;
		const acknowledged = items.filter((i: AlertItem) => i.status === 'acknowledged').length;
		const escalated = items.filter((i: AlertItem) => i.status === 'escalated').length;
		const resolvedToday = items.filter((i: AlertItem) => {
			if (i.status !== 'resolved') return false;
			if (!i.resolvedAt) return false;
			return dayjs(i.resolvedAt).isSame(dayjs(), 'day');
		}).length;
		return { open, acknowledged, escalated, resolvedToday };
	}, [items]);

	const handleAction = async (id: string, action: string) => {
		try {
			await statusMutation.mutateAsync({ id, status: action });
			message.success(t('alerts.successAction'));
			setDrawerVisible(false);
		} catch {
			message.error(t('alerts.failAction'));
		}
	};

	// S-40 同族（2026-10-04）：分配改搜索式用户选择器（原为裸文本框手输用户 ID）。
	const { data: assignUsersData, isFetching: assignUsersLoading } = useAdminUsers(
		assignSearch,
		assignModalVisible,
	);
	const assignUserOptions = (((assignUsersData as any)?.items || []) as any[]).map((u) => ({
		value: u.id as string,
		label: u.username ? `${u.username}${u.email ? ` · ${u.email}` : ''}` : u.email || u.id,
	}));

	const handleAssignSearch = (value: string) => {
		clearTimeout(assignSearchTimer.current);
		assignSearchTimer.current = setTimeout(() => setAssignSearch(value), 300);
	};

	const handleAssign = async () => {
		if (!selectedAlert || !assignee) return;
		try {
			await assignMutation.mutateAsync({ id: selectedAlert.id, assignee });
			message.success(t('alerts.successAssign'));
			setAssignModalVisible(false);
			setAssignee(undefined);
			setAssignSearch('');
			setDrawerVisible(false);
		} catch {
			message.error(t('alerts.failAssign'));
		}
	};

	const openDetail = (alert: AlertItem) => {
		setSelectedAlert(alert);
		setDrawerVisible(true);
	};

	const openAssign = (alert: AlertItem) => {
		setSelectedAlert(alert);
		setAssignee(alert.assignee || undefined);
		setAssignSearch('');
		setAssignModalVisible(true);
	};

	const columns: DataTableColumns<AlertItem> = [
		{
			title: t('alerts.columnSeverity'),
			dataIndex: 'severity',
			width: 100,
			render: (v: string) => <Tag color={severityColor(v)}>{severityLabel(t, v)}</Tag>,
			filters: (['critical', 'high', 'medium', 'low', 'info'] as const).map((v) => ({
				text: severityLabel(t, v),
				value: v,
			})),
		},
		{
			title: t('alerts.columnType'),
			dataIndex: 'type',
			width: 110,
			render: (v: string) => typeLabels[v] || v,
		},
		{
			title: t('alerts.columnTitle'),
			dataIndex: 'title',
			ellipsis: true,
		},
		{
			title: t('alerts.columnStatus'),
			dataIndex: 'status',
			width: 100,
			render: (v: string) => <Tag color={statusColorMap[v]}>{statusLabels[v] || v}</Tag>,
		},
		{
			title: t('alerts.columnAssignee'),
			dataIndex: 'assignee',
			width: 120,
			render: (v: string) => v || '-',
		},
		{
			title: t('alerts.columnCreatedAt'),
			dataIndex: 'createdAt',
			width: 170,
			render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
		},
		{
			title: t('common.actions'),
			width: 280,
			fixed: 'right',
			render: (_: any, record: AlertItem) => (
				<Space size="small">
					<Tooltip title={t('alerts.actionDetail')}>
						<Button size="small" icon={<Eye size="1em" />} onClick={() => openDetail(record)}>
							{t('alerts.actionDetail')}
						</Button>
					</Tooltip>
					<Can denyAuditor>
						{record.status === 'open' && (
							<>
								<Button size="small" onClick={() => handleAction(record.id, 'acknowledge')}>
									<CheckCircle2 size="1em" /> {t('alerts.actionAcknowledge')}
								</Button>
								<Button size="small" onClick={() => handleAction(record.id, 'escalate')}>
									<TrendingUp size="1em" /> {t('alerts.actionEscalate')}
								</Button>
							</>
						)}
						{record.status === 'acknowledged' && (
							<>
								<Button size="small" onClick={() => handleAction(record.id, 'escalate')}>
									<TrendingUp size="1em" /> {t('alerts.actionEscalate')}
								</Button>
								<Button
									size="small"
									type="primary"
									onClick={() => handleAction(record.id, 'resolve')}
								>
									{t('alerts.actionResolve')}
								</Button>
							</>
						)}
						{record.status === 'escalated' && (
							<Button
								size="small"
								type="primary"
								onClick={() => handleAction(record.id, 'resolve')}
							>
								{t('alerts.actionResolve')}
							</Button>
						)}
						{(record.status === 'open' || record.status === 'acknowledged') && (
							<Button size="small" danger onClick={() => handleAction(record.id, 'dismiss')}>
								<Ban size="1em" /> {t('alerts.actionDismiss')}
							</Button>
						)}
						<Button size="small" icon={<UserCheck size="1em" />} onClick={() => openAssign(record)}>
							{t('alerts.actionAssign')}
						</Button>
					</Can>
				</Space>
			),
		},
	];

	return (
		<div>
			<AppPageHeader
				title={<><Bell size="1em" className="mr-2" /> {t('alerts.title')}</>}
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
							title={<span>{t('alerts.statsOpen')}<PageScopeHint /></span>}
							value={stats.open}
							prefix={<AlertTriangle size="1em" className="text-danger" />}
							valueStyle={{ color: stats.open > 0 ? 'var(--color-danger-text)' : undefined }}
						/>
					</Card>
				</Col>
				<Col xs={12} sm={6}>
					<Card>
						<Statistic
							title={<span>{t('alerts.statsAcknowledged')}<PageScopeHint /></span>}
							value={stats.acknowledged}
							prefix={<CheckCircle2 size="1em" className="text-info" />}
						/>
					</Card>
				</Col>
				<Col xs={12} sm={6}>
					<Card>
						<Statistic
							title={<span>{t('alerts.statsEscalated')}<PageScopeHint /></span>}
							value={stats.escalated}
							prefix={<TrendingUp size="1em" className="text-warning" />}
						/>
					</Card>
				</Col>
				<Col xs={12} sm={6}>
					<Card>
						<Statistic
							title={<span>{t('alerts.statsResolvedToday')}<PageScopeHint /></span>}
							value={stats.resolvedToday}
							prefix={<CheckCircle2 size="1em" className="text-success" />}
						/>
					</Card>
				</Col>
			</Row>

			<Card className="mb-4">
				<Space wrap>
					<Select
						placeholder={t('alerts.filterStatus')}
						allowClear
						value={filters.status || undefined}
						onChange={(v) => {
							setFilters({ ...filters, status: v });
							setPage(1);
						}}
						style={{ width: 130 }}
						options={[
							{ label: statusLabels.open, value: 'open' },
							{ label: statusLabels.acknowledged, value: 'acknowledged' },
							{ label: statusLabels.escalated, value: 'escalated' },
							{ label: statusLabels.resolved, value: 'resolved' },
							{ label: statusLabels.dismissed, value: 'dismissed' },
						]}
					/>
					<Select
						placeholder={t('alerts.filterSeverity')}
						allowClear
						value={filters.severity || undefined}
						onChange={(v) => {
							setFilters({ ...filters, severity: v });
							setPage(1);
						}}
						style={{ width: 130 }}
						options={(['critical', 'high', 'medium', 'low', 'info'] as const).map((v) => ({
							label: severityLabel(t, v),
							value: v,
						}))}
					/>
					<Select
						placeholder={t('alerts.filterType')}
						allowClear
						value={filters.type || undefined}
						onChange={(v) => {
							setFilters({ ...filters, type: v });
							setPage(1);
						}}
						style={{ width: 130 }}
						options={[
							{ label: typeLabels.threshold, value: 'threshold' },
							{ label: typeLabels.anomaly, value: 'anomaly' },
							{ label: typeLabels.compliance, value: 'compliance' },
							{ label: typeLabels.security, value: 'security' },
						]}
					/>
					<Button
						onClick={() => {
							setFilters({});
							setPage(1);
						}}
					>
						{t('common.reset')}
					</Button>
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
					scroll={{ x: 1300 }}
					locale={{ emptyText: <Empty description={t('alerts.empty')} /> }}
				/>
			</Spin>

			<Drawer
				title={t('alerts.detailTitle')}
				size="md"
				open={drawerVisible}
				onClose={() => setDrawerVisible(false)}
				extra={
					selectedAlert && (
						<Space>
							<Can denyAuditor>
								{selectedAlert.status === 'open' && (
									<>
										<Button
											type="primary"
											onClick={() => handleAction(selectedAlert.id, 'acknowledge')}
										>
											<CheckCircle2 size="1em" /> {t('alerts.actionAcknowledge')}
										</Button>
										<Button onClick={() => handleAction(selectedAlert.id, 'escalate')}>
											<TrendingUp size="1em" /> {t('alerts.actionEscalate')}
										</Button>
									</>
								)}
								{selectedAlert.status === 'acknowledged' && (
									<>
										<Button onClick={() => handleAction(selectedAlert.id, 'escalate')}>
											<TrendingUp size="1em" /> {t('alerts.actionEscalate')}
										</Button>
										<Button
											type="primary"
											onClick={() => handleAction(selectedAlert.id, 'resolve')}
										>
											{t('alerts.actionResolve')}
										</Button>
									</>
								)}
								{selectedAlert.status === 'escalated' && (
									<Button type="primary" onClick={() => handleAction(selectedAlert.id, 'resolve')}>
										{t('alerts.actionResolve')}
									</Button>
								)}
								{(selectedAlert.status === 'open' || selectedAlert.status === 'acknowledged') && (
									<Button danger onClick={() => handleAction(selectedAlert.id, 'dismiss')}>
										<Ban size="1em" /> {t('alerts.actionDismiss')}
									</Button>
								)}
								<Button icon={<UserCheck size="1em" />} onClick={() => openAssign(selectedAlert)}>
									{t('alerts.actionAssign')}
								</Button>
							</Can>
						</Space>
					)
				}
			>
				{selectedAlert && (
					<Descriptions column={1} bordered size="small" labelStyle={{ width: 120 }}>
						<Descriptions.Item label={t('alerts.detailId')}>
							<code>{selectedAlert.id}</code>
						</Descriptions.Item>
						<Descriptions.Item label={t('alerts.columnType')}>
							<Tag>{typeLabels[selectedAlert.type] || selectedAlert.type}</Tag>
						</Descriptions.Item>
						<Descriptions.Item label={t('alerts.columnSeverity')}>
							<Tag color={severityColor(selectedAlert.severity)}>
								{severityLabel(t, selectedAlert.severity)}
							</Tag>
						</Descriptions.Item>
						<Descriptions.Item label={t('alerts.columnStatus')}>
							<Tag color={statusColorMap[selectedAlert.status]}>
								{statusLabels[selectedAlert.status] || selectedAlert.status}
							</Tag>
						</Descriptions.Item>
						<Descriptions.Item label={t('alerts.columnTitle')}>
							{selectedAlert.title}
						</Descriptions.Item>
						<Descriptions.Item label={t('alerts.detailDescription')}>
							{selectedAlert.description}
						</Descriptions.Item>
						{selectedAlert.source && (
							<Descriptions.Item label={t('alerts.detailSource')}>
								{selectedAlert.source}
							</Descriptions.Item>
						)}
						<Descriptions.Item label={t('alerts.detailTenant')}>
							{selectedAlert.tenantId}
						</Descriptions.Item>
						<Descriptions.Item label={t('alerts.columnAssignee')}>
							{selectedAlert.assignee || '-'}
						</Descriptions.Item>
						<Descriptions.Item label={t('alerts.detailCreatedAt')}>
							{selectedAlert.createdAt
								? dayjs(selectedAlert.createdAt).format('YYYY-MM-DD HH:mm:ss')
								: '-'}
						</Descriptions.Item>
						{selectedAlert.updatedAt && (
							<Descriptions.Item label={t('alerts.detailUpdatedAt')}>
								{dayjs(selectedAlert.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
							</Descriptions.Item>
						)}
						{selectedAlert.acknowledgedAt && (
							<Descriptions.Item label={t('alerts.detailConfirmedAt')}>
								{dayjs(selectedAlert.acknowledgedAt).format('YYYY-MM-DD HH:mm:ss')}
							</Descriptions.Item>
						)}
						{selectedAlert.escalatedAt && (
							<Descriptions.Item label={t('alerts.detailEscalatedAt')}>
								{dayjs(selectedAlert.escalatedAt).format('YYYY-MM-DD HH:mm:ss')}
							</Descriptions.Item>
						)}
						{selectedAlert.resolvedAt && (
							<Descriptions.Item label={t('alerts.detailResolvedAt')}>
								{dayjs(selectedAlert.resolvedAt).format('YYYY-MM-DD HH:mm:ss')}
							</Descriptions.Item>
						)}
						{selectedAlert.resolvedBy && (
							<Descriptions.Item label={t('alerts.detailResolvedBy')}>
								{selectedAlert.resolvedBy}
							</Descriptions.Item>
						)}
					</Descriptions>
				)}
			</Drawer>

			<Modal
				title={t('alerts.assignTitle')}
				open={assignModalVisible}
				onOk={handleAssign}
				onCancel={() => setAssignModalVisible(false)}
				okText={t('alerts.confirmAssign')}
				cancelText={t('common.cancel')}
				okButtonProps={{ disabled: !assignee }}
			>
				<div className="py-4">
					<label className="block mb-2 font-medium">{t('alerts.assignLabel')}</label>
					<Select
						showSearch
						allowClear
						style={{ width: '100%' }}
						placeholder={t('alerts.assignPlaceholder')}
						value={assignee}
						onChange={(v) => setAssignee(v)}
						onSearch={handleAssignSearch}
						filterOption={false}
						loading={assignUsersLoading}
						options={assignUserOptions}
						notFoundContent={assignUsersLoading ? <Spin size="small" /> : undefined}
					/>
				</div>
			</Modal>
		</div>
	);
}
