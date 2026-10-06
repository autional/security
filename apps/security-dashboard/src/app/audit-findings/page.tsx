'use client';

import React, { useState } from 'react';
import { DataTable, Drawer } from '@autional/ui/antd';
import { Card, Tag, Button, Space, Descriptions, Form, Select, Input, message, Typography, Badge, Row, Col, Statistic, Spin } from 'antd';
import {
	AlertTriangle,
	CheckCircle2,
	Eye,
	FileSearch,
} from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import {
	useAuditFindings,
	useAuditFindingDetail,
	useUpdateAuditFinding,
} from '@/hooks/use-security-queries';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/Can';
import { PageScopeHint } from '@/components/PageScopeHint';

const { Title, Text } = Typography;
const { TextArea } = Input;

type AuditFindingItem = {
	id: string;
	title: string;
	description?: string;
	severity: string;
	status: string;
	controlId?: string;
	framework?: string;
	assignedTo?: string;
	dueDate?: string;
	createdAt: string;
};

export default function AuditFindingsPage() {
	const { t } = useTranslation();

	const severityMap: Record<string, { color: string; label: string }> = {
		critical: { color: 'red', label: t('auditFindings.severityCritical') },
		high: { color: 'orange', label: t('auditFindings.severityHigh') },
		medium: { color: 'gold', label: t('auditFindings.severityMedium') },
		low: { color: 'green', label: t('auditFindings.severityLow') },
	};

	const statusMap: Record<string, { color: string; label: string }> = {
		open: { color: 'red', label: t('auditFindings.statusOpen') },
		in_progress: { color: 'blue', label: t('auditFindings.statusInProgress') },
		resolved: { color: 'green', label: t('auditFindings.statusResolved') },
		accepted: { color: 'purple', label: t('auditFindings.statusAccepted') },
	};

	const frameworkMap: Record<string, string> = {
		iso27001: 'ISO 27001',
		sox: 'SOX',
		gdpr: 'GDPR',
		pci_dss: 'PCI DSS',
		hipaa: 'HIPAA',
	};

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [filterStatus, setFilterStatus] = useState<string | undefined>();
	const [filterSeverity, setFilterSeverity] = useState<string | undefined>();
	const [drawerVisible, setDrawerVisible] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [updateLoading, setUpdateLoading] = useState(false);

	const { data, isLoading } = useAuditFindings({
		page,
		pageSize,
		status: filterStatus,
		severity: filterSeverity,
	});
	const { data: detailData, isLoading: detailLoading } = useAuditFindingDetail(selectedId);
	const updateMutation = useUpdateAuditFinding();

	const items: AuditFindingItem[] = (data as any)?.items || [];
	const total = (data as any)?.total || 0;

	const openCount = items.filter((i) => i.status === 'open' || i.status === 'in_progress').length;
	const overdueCount = items.filter((i) => {
		if (i.status === 'resolved' || i.status === 'accepted') return false;
		if (!i.dueDate) return false;
		return new Date(i.dueDate) < new Date();
	}).length;

	const openDetail = (record: AuditFindingItem) => {
		setSelectedId(record.id);
		setDrawerVisible(true);
	};

	const handleUpdate = async (values: any) => {
		if (!selectedId) return;
		setUpdateLoading(true);
		try {
			await updateMutation.mutateAsync({ id: selectedId, data: values });
			message.success(t('auditFindings.updateSuccess'));
			setDrawerVisible(false);
		} catch (err: any) {
			message.error(err?.message || t('auditFindings.updateFailed'));
		} finally {
			setUpdateLoading(false);
		}
	};

	const selected = items.find((i) => i.id === selectedId);
	const detail = (detailData as any) || selected;

	const columns: ColumnsType<AuditFindingItem> = [
		{ title: t('auditFindings.columnId'), dataIndex: 'id', width: 120 },
		{ title: t('auditFindings.columnTitle'), dataIndex: 'title', ellipsis: true },
		{
			title: t('auditFindings.columnSeverity'),
			dataIndex: 'severity',
			width: 100,
			render: (v: string) => {
				const s = severityMap[v] || { color: 'default', label: v };
				return <Tag color={s.color}>{s.label}</Tag>;
			},
		},
		{
			title: t('auditFindings.columnStatus'),
			dataIndex: 'status',
			width: 100,
			render: (v: string) => {
				const s = statusMap[v] || { color: 'default', label: v };
				return <Badge status={s.color as any} text={s.label} />;
			},
		},
		{
			title: t('auditFindings.columnFramework'),
			dataIndex: 'framework',
			width: 120,
			render: (v: string) => frameworkMap[v] || v,
		},
		{ title: t('auditFindings.columnControl'), dataIndex: 'controlId', width: 120 },
		{
			title: t('auditFindings.columnDueDate'),
			dataIndex: 'dueDate',
			width: 140,
			render: (v: string) => {
				if (!v) return '-';
				const isOverdue = new Date(v) < new Date();
				return (
					<span className={isOverdue ? 'text-danger-text' : ''}>
						{new Date(v).toLocaleDateString()}
					</span>
				);
			},
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
			<Title level={3}>{t('auditFindings.title')}</Title>
			<Text type="secondary">{t('auditFindings.subtitle')}</Text>

			<Row gutter={16} className="mt-4 mb-4">
				<Col span={6}>
					<Card>
						<Statistic
							title={<span>{t('auditFindings.statOpen')}<PageScopeHint /></span>}
							value={openCount}
							valueStyle={{ color: 'var(--color-danger-text)' }}
							prefix={<AlertTriangle size="1em" />}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic
							title={<span>{t('auditFindings.statOverdue')}<PageScopeHint /></span>}
							value={overdueCount}
							valueStyle={{ color: 'var(--color-danger-text)' }}
							prefix={<FileSearch size="1em" />}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic
							title={<span>{t('auditFindings.statCritical')}<PageScopeHint /></span>}
							value={
								items.filter((i) => i.severity === 'critical' || i.severity === 'high').length
							}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic title={t('auditFindings.statTotal')} value={total} />
					</Card>
				</Col>
			</Row>

			<Card
				title={t('auditFindings.listTitle')}
				extra={
					<Space>
						<Select
							placeholder={t('auditFindings.filterStatus')}
							allowClear
							style={{ width: 120 }}
							options={[
								{ value: 'open', label: t('auditFindings.statusOpen') },
								{ value: 'in_progress', label: t('auditFindings.statusInProgress') },
								{ value: 'resolved', label: t('auditFindings.statusResolved') },
								{ value: 'accepted', label: t('auditFindings.statusAccepted') },
							]}
							value={filterStatus}
							onChange={setFilterStatus}
						/>
						<Select
							placeholder={t('auditFindings.filterSeverity')}
							allowClear
							style={{ width: 120 }}
							options={[
								{ value: 'critical', label: t('auditFindings.severityCritical') },
								{ value: 'high', label: t('auditFindings.severityHigh') },
								{ value: 'medium', label: t('auditFindings.severityMedium') },
								{ value: 'low', label: t('auditFindings.severityLow') },
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
				title={`${t('auditFindings.detailTitle')} — ${detail?.id}`}
				size="md"
				open={drawerVisible}
				onClose={() => setDrawerVisible(false)}
			>
				<Spin spinning={detailLoading}>
					{detail && (
						<>
							<Descriptions column={1} bordered className="mb-6">
								<Descriptions.Item label={t('auditFindings.columnId')}>
									{detail.id}
								</Descriptions.Item>
								<Descriptions.Item label={t('auditFindings.columnTitle')}>
									{detail.title}
								</Descriptions.Item>
								<Descriptions.Item label={t('anomalies.columnDescription')}>
									{detail.description || '-'}
								</Descriptions.Item>
								<Descriptions.Item label={t('auditFindings.columnSeverity')}>
									<Tag color={severityMap[detail.severity]?.color}>
										{severityMap[detail.severity]?.label}
									</Tag>
								</Descriptions.Item>
								<Descriptions.Item label={t('auditFindings.columnStatus')}>
									<Badge
										status={statusMap[detail.status]?.color as any}
										text={statusMap[detail.status]?.label}
									/>
								</Descriptions.Item>
								<Descriptions.Item label={t('auditFindings.columnFramework')}>
									{frameworkMap[detail.framework || ''] || detail.framework}
								</Descriptions.Item>
								<Descriptions.Item label={t('auditFindings.columnControl')}>
									{detail.controlId || '-'}
								</Descriptions.Item>
								<Descriptions.Item label={t('auditFindings.detailAssignee')}>
									{detail.assignedTo || '-'}
								</Descriptions.Item>
								<Descriptions.Item label={t('auditFindings.columnDueDate')}>
									{detail.dueDate ? new Date(detail.dueDate).toLocaleDateString() : '-'}
								</Descriptions.Item>
								<Descriptions.Item label={t('archives.columnCreatedAt')}>
									{new Date(detail.createdAt).toLocaleString()}
								</Descriptions.Item>
							</Descriptions>

							{detail.status !== 'resolved' && detail.status !== 'accepted' && (
								<Can denyAuditor>
									<Card title={t('auditFindings.updateStatusTitle')} size="small">
										<Form layout="vertical" onFinish={handleUpdate}>
											<Form.Item
												name="status"
												label={t('auditFindings.updateStatusNewLabel')}
												rules={[{ required: true }]}
											>
												<Select
													options={[
														{ value: 'in_progress', label: t('auditFindings.statusInProgress') },
														{ value: 'resolved', label: t('auditFindings.statusResolved') },
														{ value: 'accepted', label: t('auditFindings.statusAccepted') },
													]}
												/>
											</Form.Item>
											<Form.Item name="title" label={t('auditFindings.columnTitle')}>
												<Input />
											</Form.Item>
											<Form.Item name="description" label={t('anomalies.columnDescription')}>
												<TextArea rows={3} />
											</Form.Item>
											<Form.Item>
												<Button
													type="primary"
													htmlType="submit"
													loading={updateLoading}
													icon={<CheckCircle2 size="1em" />}
												>
													{t('auditFindings.updateSubmit')}
												</Button>
											</Form.Item>
										</Form>
									</Card>
								</Can>
							)}
						</>
					)}
				</Spin>
			</Drawer>
		</div>
	);
}
