'use client';

import React, { useState } from 'react';
import { DataTable, Drawer } from '@autional/ui/antd';
import { Card, Tag, Button, Space, Descriptions, Form, Select, Input, message, Typography, Badge, Row, Col, Statistic, Spin } from 'antd';
import {
	CheckCircle2,
	Eye,
	FileSearch,
	RefreshCw,
} from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { useDSARs, useDSARDetail, useUpdateDSAR } from '@/hooks/use-security-queries';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/Can';
import { PageScopeHint } from '@/components/PageScopeHint';

const { Title, Text } = Typography;
const { TextArea } = Input;

type DSARItem = {
	id: string;
	userId: string;
	type: string;
	status: string;
	createdAt: string;
	completedAt?: string;
};

export default function DSARsPage() {
	const { t } = useTranslation();

	const statusMap: Record<string, { color: string; label: string }> = {
		pending: { color: 'orange', label: t('dsars.statusPending') },
		processing: { color: 'blue', label: t('dsars.statusProcessing') },
		completed: { color: 'green', label: t('dsars.statusCompleted') },
		rejected: { color: 'red', label: t('dsars.statusRejected') },
	};

	const typeMap: Record<string, string> = {
		access: t('dsars.typeAccess'),
		deletion: t('dsars.typeDeletion'),
		portability: t('dsars.typePortability'),
		rectification: t('dsars.typeRectification'),
	};

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [filterStatus, setFilterStatus] = useState<string | undefined>();
	const [filterType, setFilterType] = useState<string | undefined>();
	const [drawerVisible, setDrawerVisible] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [updateLoading, setUpdateLoading] = useState(false);

	const { data, isLoading } = useDSARs({ page, pageSize, status: filterStatus, type: filterType });
	const { data: detailData, isLoading: detailLoading } = useDSARDetail(selectedId);
	const updateMutation = useUpdateDSAR();

	const items: DSARItem[] = (data as any)?.items || [];
	const total = (data as any)?.total || 0;

	const pendingCount = items.filter((i) => i.status === 'pending').length;
	const processingCount = items.filter((i) => i.status === 'processing').length;

	const openDetail = (record: DSARItem) => {
		setSelectedId(record.id);
		setDrawerVisible(true);
	};

	const handleUpdateStatus = async (values: any) => {
		if (!selectedId) return;
		setUpdateLoading(true);
		try {
			await updateMutation.mutateAsync({
				id: selectedId,
				data: {
					status: values.status,
					rejectionReason: values.rejectionReason,
					responseData: values.responseData ? JSON.parse(values.responseData) : undefined,
				},
			});
			message.success(t('dsars.updateSuccess'));
			setDrawerVisible(false);
		} catch (err: any) {
			message.error(err?.message || t('dsars.updateFailed'));
		} finally {
			setUpdateLoading(false);
		}
	};

	const columns: ColumnsType<DSARItem> = [
		{ title: t('dsars.columnId'), dataIndex: 'id', width: 120 },
		{ title: t('dsars.columnUserId'), dataIndex: 'userId', ellipsis: true },
		{
			title: t('dsars.columnType'),
			dataIndex: 'type',
			width: 120,
			render: (v: string) => typeMap[v] || v,
		},
		{
			title: t('dsars.columnStatus'),
			dataIndex: 'status',
			width: 100,
			render: (v: string) => {
				const s = statusMap[v] || { color: 'default', label: v };
				return <Badge status={s.color as any} text={s.label} />;
			},
		},
		{
			title: t('dsars.columnCreatedAt'),
			dataIndex: 'createdAt',
			width: 180,
			render: (v: string) => new Date(v).toLocaleString(),
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

	const selectedItem = items.find((i) => i.id === selectedId);

	return (
		<div>
			<Title level={3}>{t('dsars.title')}</Title>
			<Text type="secondary">{t('dsars.subtitle')}</Text>

			<Row gutter={16} className="mt-4 mb-4">
				<Col span={6}>
					<Card>
						<Statistic
							title={<span>{t('dsars.statPending')}<PageScopeHint /></span>}
							value={pendingCount}
							valueStyle={{ color: 'var(--color-warning)' }}
							prefix={<FileSearch size="1em" />}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic
							title={<span>{t('dsars.statProcessing')}<PageScopeHint /></span>}
							value={processingCount}
							valueStyle={{ color: 'var(--color-info)' }}
							prefix={<RefreshCw size="1em" className="animate-spin" />}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic
							title={<span>{t('dsars.statTodayNew')}<PageScopeHint /></span>}
							value={
								items.filter((i) => {
									const d = new Date(i.createdAt);
									const today = new Date();
									return d.toDateString() === today.toDateString();
								}).length
							}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic title={t('dsars.statTotal')} value={total} />
					</Card>
				</Col>
			</Row>

			<Card
				title={t('dsars.listTitle')}
				extra={
					<Space>
						<Select
							placeholder={t('dsars.filterStatus')}
							allowClear
							style={{ width: 120 }}
							options={[
								{ value: 'pending', label: t('dsars.statusPending') },
								{ value: 'processing', label: t('dsars.statusProcessing') },
								{ value: 'completed', label: t('dsars.statusCompleted') },
								{ value: 'rejected', label: t('dsars.statusRejected') },
							]}
							value={filterStatus}
							onChange={setFilterStatus}
						/>
						<Select
							placeholder={t('dsars.filterType')}
							allowClear
							style={{ width: 140 }}
							options={[
								{ value: 'access', label: t('dsars.typeAccess') },
								{ value: 'deletion', label: t('dsars.typeDeletion') },
								{ value: 'portability', label: t('dsars.typePortability') },
								{ value: 'rectification', label: t('dsars.typeRectification') },
							]}
							value={filterType}
							onChange={setFilterType}
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
					scroll={{ x: 800 }}
				/>
			</Card>

			<Drawer
				title={`${t('dsars.detailTitle')} — ${selectedId}`}
				size="md"
				open={drawerVisible}
				onClose={() => setDrawerVisible(false)}
			>
				<Spin spinning={detailLoading}>
					{detailData?.detail && (
						<Descriptions column={1} bordered className="mb-6">
							<Descriptions.Item label={t('dsars.columnId')}>
								{(detailData.detail as any).id}
							</Descriptions.Item>
							<Descriptions.Item label={t('dsars.columnUserId')}>
								{(detailData.detail as any).userId}
							</Descriptions.Item>
							<Descriptions.Item label={t('dsars.columnType')}>
								{typeMap[(detailData.detail as any).type] || (detailData.detail as any).type}
							</Descriptions.Item>
							<Descriptions.Item label={t('dsars.columnStatus')}>
								<Tag color={statusMap[(detailData.detail as any).status]?.color}>
									{statusMap[(detailData.detail as any).status]?.label}
								</Tag>
							</Descriptions.Item>
							<Descriptions.Item label={t('dsars.columnCreatedAt')}>
								{new Date((detailData.detail as any).createdAt).toLocaleString()}
							</Descriptions.Item>
							<Descriptions.Item label={t('archives.columnCompletedAt')}>
								{(detailData.detail as any).completedAt
									? new Date((detailData.detail as any).completedAt).toLocaleString()
									: '-'}
							</Descriptions.Item>
						</Descriptions>
					)}

					{detailData?.status && (
						<Card title={t('dsars.detailStatusTrack')} size="small" className="mb-6">
							<Descriptions column={1}>
								<Descriptions.Item label={t('dsars.columnStatus')}>
									{(detailData.status as any).status}
								</Descriptions.Item>
								<Descriptions.Item label={t('dsars.columnCreatedAt')}>
									{new Date((detailData.status as any).createdAt).toLocaleString()}
								</Descriptions.Item>
								<Descriptions.Item label={t('archives.columnCompletedAt')}>
									{(detailData.status as any).completedAt
										? new Date((detailData.status as any).completedAt).toLocaleString()
										: '-'}
								</Descriptions.Item>
							</Descriptions>
						</Card>
					)}

					{selectedItem &&
						selectedItem.status !== 'completed' &&
						selectedItem.status !== 'rejected' && (
							<Can denyAuditor>
								<Card title={t('dsars.updateStatusTitle')} size="small">
									<Form layout="vertical" onFinish={handleUpdateStatus}>
										<Form.Item
											name="status"
											label={t('dsars.updateStatusNewLabel')}
											rules={[{ required: true }]}
										>
											<Select
												options={[
													{ value: 'processing', label: t('dsars.statusProcessing') },
													{ value: 'completed', label: t('dsars.statusCompleted') },
													{ value: 'rejected', label: t('dsars.statusRejected') },
												]}
											/>
										</Form.Item>
										<Form.Item name="rejectionReason" label={t('dsars.updateRejectionReason')}>
											<TextArea rows={2} />
										</Form.Item>
										<Form.Item name="responseData" label={t('dsars.updateResponseData')}>
											<TextArea rows={3} placeholder='{"downloadUrl":"..."}' />
										</Form.Item>
										<Form.Item>
											<Button
												type="primary"
												htmlType="submit"
												loading={updateLoading}
												icon={<CheckCircle2 size="1em" />}
											>
												{t('dsars.updateSubmit')}
											</Button>
										</Form.Item>
									</Form>
								</Card>
							</Can>
						)}
				</Spin>
			</Drawer>
		</div>
	);
}
