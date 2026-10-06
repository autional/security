'use client';

import React, { useState } from 'react';
import { DataTable } from '@autional/ui/antd';
import type { DataTableColumns } from '@autional/ui/antd';
import { Card, Tag, Button, Spin, Empty, Space, Badge, Modal, Form, Select, DatePicker, Input, Progress, Tooltip } from 'antd';
import { Download, Plus } from 'lucide-react';

import dayjs from 'dayjs';
import { useExportJobs, useDownloadExport } from '@/hooks/use-security-queries';
import { useCreateExportJob } from '@/hooks/use-audit-logs';
import { message } from '@/lib/antd-app';
import { useTranslation } from 'react-i18next';
import type { ExportJobResponse } from '@autional/shared/generated/types';
import { ConsolePageHeader } from '@autional/ui';
import { Can } from '@/components/Can';
import { levelLabel } from '@/lib/enums';

export default function ExportJobsPage() {
	const { t } = useTranslation();

	const statusLabels: Record<string, string> = {
		pending: t('exportJobs.statusPending'),
		processing: t('exportJobs.statusProcessing'),
		completed: t('exportJobs.statusCompleted'),
		failed: t('exportJobs.statusFailed'),
		cancelled: t('exportJobs.statusCancelled'),
	};

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [createVisible, setCreateVisible] = useState(false);
	const [createForm] = Form.useForm();
	const [creating, setCreating] = useState(false);
	const [downloadingId, setDownloadingId] = useState<string | null>(null);

	const { data, isLoading } = useExportJobs({ page, pageSize });
	const createMutation = useCreateExportJob();
	const downloadMutation = useDownloadExport();

	const items = (data as any)?.items || [];
	const total = (data as any)?.total || (data as any)?.pagination?.total || items.length;

	const handleCreate = async (values: any) => {
		setCreating(true);
		try {
			// S-21：导出范围随 audit-logs 过滤契约（level/statusClass/keyword），与列表筛选能力对齐
			await createMutation.mutateAsync({
				format: values.format,
				startDate: values.startDate ? dayjs(values.startDate).format('YYYY-MM-DD') : undefined,
				endDate: values.endDate ? dayjs(values.endDate).format('YYYY-MM-DD') : undefined,
				level: values.level,
				statusClass: values.statusClass,
				keyword: values.keyword,
			});
			message.success(t('exportJobs.createSuccess'));
			setCreateVisible(false);
			createForm.resetFields();
		} catch {
			message.error(t('exportJobs.createFailed'));
		} finally {
			setCreating(false);
		}
	};

	// S-17（2026-10-04）：旧实现先 setState 再同步读旧闭包 jobStatus（恒 undefined）⇒
	// 首次点击必走「任务状态:（空）」警告分支。按钮已按 status==='completed' 门控，
	// 直接调下载端点（返回 { downloadUrl }，预签名 900s），取 URL 后新开页签。
	const handleDownload = async (jobId: string) => {
		setDownloadingId(jobId);
		try {
			const res: any = await downloadMutation.mutateAsync(jobId);
			const url = res?.downloadUrl;
			if (!url) {
				message.error(t('exportJobs.downloadFailed'));
				return;
			}
			window.open(url, '_blank', 'noopener');
			message.success(t('exportJobs.downloadStarted'));
		} catch {
			message.error(t('exportJobs.downloadFailed'));
		} finally {
			setDownloadingId(null);
		}
	};

	const columns: DataTableColumns<ExportJobResponse> = [
		{ title: t('exportJobs.columnJobId'), dataIndex: 'jobId', width: 200 },
		{
			title: t('exportJobs.columnStatus'),
			dataIndex: 'status',
			width: 110,
			render: (v: string) => (
				<Badge
					status={
						v === 'completed'
							? 'success'
							: v === 'failed'
								? 'error'
								: v === 'processing'
									? 'processing'
									: v === 'cancelled'
										? 'default'
										: 'default'
					}
					text={statusLabels[v] || v}
				/>
			),
		},
		{
			title: t('exportJobs.columnProgress'),
			width: 160,
			render: (_: any, record: ExportJobResponse) => {
				if (record.status === 'completed') return <Progress percent={100} size="small" />;
				if (record.status === 'failed' || record.status === 'cancelled')
					return <span className="text-neutral-600">—</span>;
				if (record.status === 'processing')
					return <Progress percent={50} size="small" status="active" />;
				if (record.status === 'pending') return <Progress percent={0} size="small" />;
				return <span className="text-neutral-600">—</span>;
			},
		},
		{
			title: t('exportJobs.columnFilename'),
			dataIndex: 'filename',
			ellipsis: true,
			// S-20：历史任务文件名前缀不一致（种子残留），列内显示 basename 归一观感，全文挂 Tooltip
			render: (v?: string) => {
				if (!v) return '-';
				const base = v.split('/').pop() || v;
				return <Tooltip title={v}>{base}</Tooltip>;
			},
		},
		{
			title: t('exportJobs.columnRecordCount'),
			dataIndex: 'recordCount',
			width: 100,
			render: (v?: number) => v?.toLocaleString() || '-',
		},
		{
			title: t('exportJobs.columnFormat'),
			dataIndex: 'contentType',
			width: 120,
			// S-19：历史任务 content_type 为空 → 按文件名后缀推导格式；均不可得回落 '-'
			render: (v: string | undefined, record: ExportJobResponse) => {
				const ct = v || '';
				const name = record.filename || '';
				const kind = ct.includes('csv') || name.endsWith('.csv')
					? 'CSV'
					: ct.includes('json') || name.endsWith('.json')
						? 'JSON'
						: '';
				return kind ? <Tag>{kind}</Tag> : <span className="text-neutral-600">-</span>;
			},
		},
		{
			title: t('exportJobs.columnGeneratedAt'),
			dataIndex: 'generatedAt',
			width: 180,
			render: (v: number) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
		},
		{
			title: t('common.actions'),
			width: 180,
			fixed: 'right',
			render: (_: any, record: ExportJobResponse) => (
				<Space size="small">
					<Button
						size="small"
						icon={<Download size="1em" />}
						loading={downloadingId === record.jobId}
						onClick={() => record.jobId && handleDownload(record.jobId)}
						disabled={record.status !== 'completed'}
					>
						{t('exportJobs.downloadBtn')}
					</Button>
				</Space>
			),
		},
	];

	return (
		<div>
			<ConsolePageHeader
				title={t('exportJobs.title')}
				actions={
					<>
						<Space>
							<Can denyAuditor>
								<Button type="primary" icon={<Plus size="1em" />} onClick={() => setCreateVisible(true)}>
									{t('exportJobs.newJob')}
								</Button>
							</Can>
						</Space>
					</>
				}
			/>

			<Spin spinning={isLoading}>
				<DataTable
					columns={columns}
					dataSource={items}
					rowKey="jobId"
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
					locale={{ emptyText: <Empty description={t('exportJobs.empty')} /> }}
				/>
			</Spin>

			<Modal
				title={t('exportJobs.createModalTitle')}
				open={createVisible}
				onCancel={() => setCreateVisible(false)}
				onOk={() => createForm.submit()}
				confirmLoading={creating}
			>
				<Form form={createForm} layout="vertical" onFinish={handleCreate}>
					<Form.Item
						name="format"
						label={t('exportJobs.createFormatLabel')}
						rules={[{ required: true }]}
						initialValue="csv"
					>
						<Select
							options={[
								{ label: 'CSV', value: 'csv' },
								{ label: 'JSON', value: 'json' },
							]}
						/>
					</Form.Item>
					<Form.Item name="startDate" label={t('exportJobs.createStartDateLabel')}>
						<DatePicker style={{ width: '100%' }} placeholder="YYYY-MM-DD" />
					</Form.Item>
					<Form.Item name="endDate" label={t('exportJobs.createEndDateLabel')}>
						<DatePicker style={{ width: '100%' }} placeholder="YYYY-MM-DD" />
					</Form.Item>
					{/* S-18：移除「租户ID」死字段（值从未上送；后端恒按调用上下文租户导出） */}
					{/* S-21：补筛选条件（复用 audit-logs 过滤契约） */}
					<Form.Item name="level" label={t('exportJobs.createLevelLabel')}>
						<Select
							allowClear
							placeholder={t('exportJobs.createFilterOptional')}
							options={(['info', 'warning', 'error', 'critical'] as const).map((v) => ({
								label: levelLabel(t, v),
								value: v,
							}))}
						/>
					</Form.Item>
					<Form.Item name="statusClass" label={t('exportJobs.createStatusClassLabel')}>
						<Select
							allowClear
							placeholder={t('exportJobs.createFilterOptional')}
							options={[
								{ label: t('status.success'), value: 'success' },
								{ label: t('status.failure'), value: 'failure' },
							]}
						/>
					</Form.Item>
					<Form.Item name="keyword" label={t('exportJobs.createKeywordLabel')}>
						<Input placeholder={t('auditLogs.keywordPlaceholder')} />
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
}
