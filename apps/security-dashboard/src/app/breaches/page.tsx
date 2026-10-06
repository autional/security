'use client';

import React, { useState } from 'react';
import { DataTable, Drawer } from '@autional/ui/antd';
import { Card, Tag, Button, Space, Descriptions, Form, Select, Input, message, Typography, Badge, Row, Col, Statistic } from 'antd';
import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Eye,
} from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { useBreachNotifications, useUpdateBreach } from '@/hooks/use-security-queries';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/Can';
import { PageScopeHint } from '@/components/PageScopeHint';

const { Title, Text } = Typography;
const { TextArea } = Input;

type BreachItem = {
	id: string;
	title: string;
	severity: string;
	status: string;
	affectedUsers: number;
	reportedAt: string;
	reportedToDpa: boolean;
	description?: string;
};

export default function BreachesPage() {
	const { t } = useTranslation();

	const severityMap: Record<string, { color: string; label: string }> = {
		critical: { color: 'red', label: t('breaches.severityCritical') },
		high: { color: 'orange', label: t('breaches.severityHigh') },
		medium: { color: 'gold', label: t('breaches.severityMedium') },
		low: { color: 'green', label: t('breaches.severityLow') },
	};

	const statusMap: Record<string, { color: string; label: string }> = {
		open: { color: 'red', label: t('breaches.statusOpen') },
		investigating: { color: 'orange', label: t('breaches.statusInvestigating') },
		contained: { color: 'blue', label: t('breaches.statusContained') },
		resolved: { color: 'green', label: t('breaches.statusResolved') },
		notified: { color: 'purple', label: t('breaches.statusNotified') },
	};

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [filterStatus, setFilterStatus] = useState<string | undefined>();
	const [filterSeverity, setFilterSeverity] = useState<string | undefined>();
	const [drawerVisible, setDrawerVisible] = useState(false);
	const [selected, setSelected] = useState<BreachItem | null>(null);
	const [updateLoading, setUpdateLoading] = useState(false);

	const { data, isLoading } = useBreachNotifications({
		page,
		pageSize,
		status: filterStatus,
		severity: filterSeverity,
	});
	const updateMutation = useUpdateBreach();

	const items: BreachItem[] = (data as any)?.items || [];
	const total = (data as any)?.total || 0;

	const openCount = items.filter((i) => i.status === 'open' || i.status === 'investigating').length;
	const criticalCount = items.filter((i) => i.severity === 'critical').length;

	const openDetail = (record: BreachItem) => {
		setSelected(record);
		setDrawerVisible(true);
	};

	const handleUpdate = async (values: any) => {
		if (!selected) return;
		setUpdateLoading(true);
		try {
			await updateMutation.mutateAsync({ id: selected.id, data: values });
			message.success(t('breaches.updateSuccess'));
			setDrawerVisible(false);
		} catch (err: any) {
			message.error(err?.message || t('breaches.updateFailed'));
		} finally {
			setUpdateLoading(false);
		}
	};

	const columns: ColumnsType<BreachItem> = [
		{ title: t('breaches.columnId'), dataIndex: 'id', width: 100 },
		{ title: t('breaches.columnTitle'), dataIndex: 'title', ellipsis: true },
		{
			title: t('breaches.columnSeverity'),
			dataIndex: 'severity',
			width: 100,
			render: (v: string) => {
				const s = severityMap[v] || { color: 'default', label: v };
				return <Tag color={s.color}>{s.label}</Tag>;
			},
		},
		{
			title: t('breaches.columnStatus'),
			dataIndex: 'status',
			width: 110,
			render: (v: string) => {
				const s = statusMap[v] || { color: 'default', label: v };
				return <Badge status={s.color as any} text={s.label} />;
			},
		},
		{
			title: t('breaches.columnAffectedUsers'),
			dataIndex: 'affectedUsers',
			width: 100,
			render: (v: number) => v?.toLocaleString() || 0,
		},
		{
			title: t('breaches.columnReportedToDpa'),
			dataIndex: 'reportedToDpa',
			width: 130,
			render: (v: boolean) =>
				v ? <Tag color="green">{t('breaches.yes')}</Tag> : <Tag>{t('breaches.no')}</Tag>,
		},
		{
			title: t('breaches.columnReportedAt'),
			dataIndex: 'reportedAt',
			width: 180,
			render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
		},
		{
			title: t('common.actions'),
			width: 100,
			fixed: 'right',
			render: (_, record) => (
				<Button size="small" icon={<Eye size="1em" />} onClick={() => openDetail(record)}>
					{t('common.view')}
				</Button>
			),
		},
	];

	return (
		<div>
			<Title level={3}>{t('breaches.title')}</Title>
			<Text type="secondary">{t('breaches.subtitle')}</Text>

			<Row gutter={16} className="mt-4 mb-4">
				<Col span={6}>
					<Card>
						<Statistic
							title={<span>{t('breaches.statOpen')}<PageScopeHint /></span>}
							value={openCount}
							valueStyle={{ color: 'var(--color-danger-text)' }}
							prefix={<AlertCircle size="1em" />}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic
							title={<span>{t('breaches.statCritical')}<PageScopeHint /></span>}
							value={criticalCount}
							valueStyle={{ color: 'var(--color-danger-text)' }}
							prefix={<AlertTriangle size="1em" />}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic
							title={<span>{t('breaches.statTodayNew')}<PageScopeHint /></span>}
							value={
								items.filter((i) => {
									const d = new Date(i.reportedAt);
									const today = new Date();
									return d.toDateString() === today.toDateString();
								}).length
							}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic title={t('breaches.statTotal')} value={total} />
					</Card>
				</Col>
			</Row>

			<Card
				title={t('breaches.listTitle')}
				extra={
					<Space>
						<Select
							placeholder={t('breaches.filterStatus')}
							allowClear
							style={{ width: 120 }}
							options={[
								{ value: 'open', label: t('breaches.statusOpen') },
								{ value: 'investigating', label: t('breaches.statusInvestigating') },
								{ value: 'contained', label: t('breaches.statusContained') },
								{ value: 'resolved', label: t('breaches.statusResolved') },
								{ value: 'notified', label: t('breaches.statusNotified') },
							]}
							value={filterStatus}
							onChange={setFilterStatus}
						/>
						<Select
							placeholder={t('breaches.filterSeverity')}
							allowClear
							style={{ width: 120 }}
							options={[
								{ value: 'critical', label: t('breaches.severityCritical') },
								{ value: 'high', label: t('breaches.severityHigh') },
								{ value: 'medium', label: t('breaches.severityMedium') },
								{ value: 'low', label: t('breaches.severityLow') },
							]}
							value={filterSeverity}
							onChange={setFilterSeverity}
						/>
					</Space>
				}
			>
				<DataTable
					rowKey="id"
					columns={columns}
					dataSource={items}
					loading={isLoading}
					pagination={{
						current: page,
						pageSize,
						total,
						showSizeChanger: true,
						showTotal: (cnt) => t('common.total', { count: cnt }),
						onChange: (p, ps) => {
							setPage(p);
							setPageSize(ps || 10);
						},
					}}
					scroll={{ x: 900 }}
				/>
			</Card>

			<Drawer
				title={`${t('breaches.detailTitle')} — ${selected?.id}`}
				size="md"
				open={drawerVisible}
				onClose={() => setDrawerVisible(false)}
			>
				{selected && (
					<>
						<Descriptions column={1} bordered className="mb-6">
							<Descriptions.Item label={t('breaches.columnId')}>{selected.id}</Descriptions.Item>
							<Descriptions.Item label={t('breaches.columnTitle')}>
								{selected.title}
							</Descriptions.Item>
							<Descriptions.Item label={t('anomalies.columnDescription')}>
								{selected.description || '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('breaches.columnSeverity')}>
								<Tag color={severityMap[selected.severity]?.color}>
									{severityMap[selected.severity]?.label}
								</Tag>
							</Descriptions.Item>
							<Descriptions.Item label={t('breaches.columnStatus')}>
								<Badge
									status={statusMap[selected.status]?.color as any}
									text={statusMap[selected.status]?.label}
								/>
							</Descriptions.Item>
							<Descriptions.Item label={t('breaches.columnAffectedUsers')}>
								{selected.affectedUsers?.toLocaleString()}
							</Descriptions.Item>
							<Descriptions.Item label={t('breaches.columnReportedToDpa')}>
								{selected.reportedToDpa ? (
									<Tag color="green">{t('breaches.yes')}</Tag>
								) : (
									<Tag>{t('breaches.no')}</Tag>
								)}
							</Descriptions.Item>
							<Descriptions.Item label={t('breaches.columnReportedAt')}>
								{selected.reportedAt ? new Date(selected.reportedAt).toLocaleString() : '-'}
							</Descriptions.Item>
						</Descriptions>

						{selected.status !== 'resolved' && selected.status !== 'notified' && (
							<Can denyAuditor>
								<Card title={t('breaches.updateStatusTitle')} size="small">
									<Form layout="vertical" onFinish={handleUpdate}>
										<Form.Item
											name="status"
											label={t('breaches.updateStatusNewLabel')}
											rules={[{ required: true }]}
										>
											<Select
												options={[
													{ value: 'investigating', label: t('breaches.statusInvestigating') },
													{ value: 'contained', label: t('breaches.statusContained') },
													{ value: 'resolved', label: t('breaches.statusResolved') },
													{ value: 'notified', label: t('breaches.statusNotified') },
												]}
											/>
										</Form.Item>
										<Form.Item name="title" label={t('breaches.columnTitle')}>
											<Input />
										</Form.Item>
										<Form.Item name="description" label={t('anomalies.columnDescription')}>
											<TextArea rows={3} />
										</Form.Item>
										<Form.Item name="severity" label={t('breaches.columnSeverity')}>
											<Select
												options={[
													{ value: 'critical', label: t('breaches.severityCritical') },
													{ value: 'high', label: t('breaches.severityHigh') },
													{ value: 'medium', label: t('breaches.severityMedium') },
													{ value: 'low', label: t('breaches.severityLow') },
												]}
											/>
										</Form.Item>
										<Form.Item>
											<Button
												type="primary"
												htmlType="submit"
												loading={updateLoading}
												icon={<CheckCircle2 size="1em" />}
											>
												{t('breaches.updateSubmit')}
											</Button>
										</Form.Item>
									</Form>
								</Card>
							</Can>
						)}
					</>
				)}
			</Drawer>
		</div>
	);
}
