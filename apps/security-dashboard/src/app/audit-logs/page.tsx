'use client';

import React, { useState, useMemo } from 'react';
import { DataTable, Drawer } from '@autional/ui/antd';
import type { DataTableColumns } from '@autional/ui/antd';
import { AppPageHeader } from '@autional/ui';
import { Card, Input, Select, DatePicker, Button, Tag, Spin, Empty, Space, Descriptions, Segmented, Tooltip } from 'antd';
import { ExternalLink, RefreshCw, Search } from 'lucide-react';

import dayjs from 'dayjs';
import { useAuditLogs, useAuditLogDetail, useCreateExportJob } from '@/hooks/use-audit-logs';
import type { AuditLogFilters } from '@/hooks/use-audit-logs';
import { message, modal } from '@/lib/antd-app';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/Can';
import { UserIdentity } from '@/components/UserIdentity';
import { levelColor, levelLabel } from '@/lib/enums';

interface AuditLogItem {
	id: string;
	operatorId: string;
	operatorType: string;
	module: string;
	action: string;
	status: number;
	level: string;
	message: string;
	ip?: string;
	timestamp: number;
	tenantId: string;
	duration?: number;
	sequence?: number;
	metadata?: Record<string, unknown>;
}

// 时间筛选一律按 Unix 秒下发（BE 契约）；初始/快捷范围必须真正带参，不允许「UI 显示今天但请求无参」
const toEpochSeconds = (d: dayjs.Dayjs) => Math.floor(d.valueOf() / 1000);

const rangeFilters = (value: string): AuditLogFilters => {
	const now = dayjs();
	let start: dayjs.Dayjs | null = null;
	let end: dayjs.Dayjs | null = now;

	switch (value) {
		case 'today':
			start = now.startOf('day');
			break;
		case 'yesterday':
			start = now.subtract(1, 'day').startOf('day');
			end = now.subtract(1, 'day').endOf('day');
			break;
		case '7d':
			start = now.subtract(7, 'day').startOf('day');
			break;
		case '30d':
			start = now.subtract(30, 'day').startOf('day');
			break;
	}

	return {
		startTime: start ? toEpochSeconds(start) : undefined,
		endTime: end ? toEpochSeconds(end) : undefined,
	};
};

export default function AuditLogsPage() {
	const { t } = useTranslation();
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [filters, setFilters] = useState<AuditLogFilters>(() => rangeFilters('today'));
	const [quickRange, setQuickRange] = useState('today');
	const [drawerVisible, setDrawerVisible] = useState(false);
	const [detailId, setDetailId] = useState<string | null>(null);
	// S-15：关键词改为草稿态，点「搜索」/回车才下发（其余筛选 onChange 即生效）；
	// 未变更时按钮禁用，消除「零请求零反馈」的死点击。
	const [keywordDraft, setKeywordDraft] = useState('');
	const searchDirty = keywordDraft !== (filters.keyword ?? '');

	const { data, isLoading } = useAuditLogs({ page, pageSize, filters });
	const { data: detail, isLoading: detailLoading } = useAuditLogDetail(detailId);
	const exportMutation = useCreateExportJob();

	const items = useMemo(() => data?.items || [], [data]);
	const total = useMemo(
		() => data?.total || data?.pagination?.total || items.length,
		[data, items.length],
	);

	const handleSearch = () => {
		if (!searchDirty) return;
		setFilters((prev) => {
			const next = { ...prev };
			if (keywordDraft) next.keyword = keywordDraft;
			else delete next.keyword;
			return next;
		});
		setPage(1);
	};

	const handleReset = () => {
		setFilters({});
		setQuickRange('');
		setKeywordDraft('');
		setPage(1);
	};

	const handleQuickRange = (value: string) => {
		setQuickRange(value);
		setFilters({ ...filters, ...rangeFilters(value) });
		setPage(1);
	};

	// S-13（2026-10-04）：导出为异步落库写操作，先确认（展示时间范围与预计条数；
	// 导出端点仅接受时间范围，附加筛选会被忽略、须明示）。
	const handleExport = () => {
		const start = filters.startTime
			? dayjs(filters.startTime * 1000).format('YYYY-MM-DD')
			: null;
		const end = filters.endTime ? dayjs(filters.endTime * 1000).format('YYYY-MM-DD') : null;
		const rangeText =
			start && end
				? `${start} ~ ${end}`
				: start
					? `${start} ~`
					: end
						? `~ ${end}`
						: t('auditLogs.exportRangeAll');
		const hasExtraFilters = !!(filters.keyword || filters.level || filters.statusClass);

		modal.confirm({
			title: t('auditLogs.exportConfirmTitle'),
			content: (
				<div>
					<div>{t('auditLogs.exportConfirmRange', { range: rangeText })}</div>
					<div className="text-neutral-500 mt-1">
						{t('auditLogs.exportConfirmCount', { count: total })}
					</div>
					{hasExtraFilters ? (
						<div className="text-neutral-500 mt-1">
							{t('auditLogs.exportConfirmFilterHint')}
						</div>
					) : null}
				</div>
			),
			okText: t('common.export'),
			cancelText: t('common.cancel'),
			onOk: async () => {
				try {
					// S-21：筛选随导出下发（level/statusClass/keyword 与列表同一契约）
					await exportMutation.mutateAsync({
						format: 'csv',
						startDate: start ?? undefined,
						endDate: end ?? undefined,
						level: filters.level,
						statusClass: filters.statusClass,
						keyword: filters.keyword,
					});
					message.success(t('auditLogs.exportSubmitted'));
				} catch {
					message.error(t('auditLogs.exportFailed'));
				}
			},
		});
	};

	const showDetail = (id: string) => {
		setDetailId(id);
		setDrawerVisible(true);
	};

	const handleDrawerClose = () => {
		setDrawerVisible(false);
		setDetailId(null);
	};

	const quickRanges = [
		{ label: t('auditLogs.rangeToday'), value: 'today' },
		{ label: t('auditLogs.rangeYesterday'), value: 'yesterday' },
		{ label: t('auditLogs.range7d'), value: '7d' },
		{ label: t('auditLogs.range30d'), value: '30d' },
	];

	// 审计库双管道：事件管道 status∈{0=成功,1=失败}；请求管道 status 为 HTTP 码（2xx=成功，≥400=失败）。
	// 与后端 status_class 口径逐字一致；其余数值（如 3xx）原样展示，不猜语义。
	const renderStatusTag = (v: unknown) => {
		if (v === 0 || (typeof v === 'number' && v >= 200 && v < 300)) {
			return <Tag color="success">{t('status.success')}</Tag>;
		}
		if (v === 1 || (typeof v === 'number' && v >= 400)) {
			return <Tag color="error">{t('status.failure')}</Tag>;
		}
		return <Tag>{String(v)}</Tag>;
	};

	const columns: DataTableColumns<AuditLogItem> = [
		{
			title: t('auditLogs.columnTime'),
			dataIndex: 'timestamp',
			width: 180,
			render: (v: number) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
		},
		{
			title: t('auditLogs.columnOperator'),
			dataIndex: 'operatorId',
			width: 170,
			render: (v: string) => <UserIdentity userId={v} />,
		},
		{ title: t('auditLogs.columnModule'), dataIndex: 'module', width: 100 },
		{ title: t('auditLogs.columnAction'), dataIndex: 'action', width: 140 },
		{
			title: t('auditLogs.columnLevel'),
			dataIndex: 'level',
			width: 90,
			render: (v: string) => <Tag color={levelColor(v)}>{levelLabel(t, v)}</Tag>,
		},
		{
			title: t('auditLogs.columnStatus'),
			dataIndex: 'status',
			width: 80,
			render: (v: number) => renderStatusTag(v),
		},
		{ title: t('auditLogs.columnIp'), dataIndex: 'ip', width: 130 },
		{ title: t('auditLogs.columnMessage'), dataIndex: 'message', ellipsis: true },
		{
			title: t('common.actions'),
			width: 100,
			fixed: 'right',
			render: (_: any, record: AuditLogItem) => (
				<Button type="link" size="small" onClick={() => showDetail(record.id)}>
					{t('common.detail')}
				</Button>
			),
		},
	];

	return (
		<div>
			<AppPageHeader title={t('auditLogs.title')} />

			<Card className="mb-4">
				<Space direction="vertical" className="w-full" size="middle">
					<Segmented options={quickRanges} value={quickRange} onChange={(v) => handleQuickRange(v as string)} />
					<Space wrap>
						<Input
							placeholder={t('auditLogs.keywordPlaceholder')}
							value={keywordDraft}
							onChange={(e) => setKeywordDraft(e.target.value)}
							style={{ width: 200 }}
							onPressEnter={handleSearch}
						/>
						<Select
							placeholder={t('auditLogs.filterLevel')}
							allowClear
							value={filters.level || undefined}
							onChange={(v) => {
								setFilters({ ...filters, level: v });
								setPage(1);
							}}
							style={{ width: 120 }}
							options={(['info', 'warning', 'error', 'critical'] as const).map((v) => ({
								label: levelLabel(t, v),
								value: v,
							}))}
						/>
						<Select
							placeholder={t('auditLogs.filterStatus')}
							allowClear
							value={filters.statusClass || undefined}
							onChange={(v) => {
								setFilters({ ...filters, statusClass: v });
								setPage(1);
							}}
							style={{ width: 120 }}
							options={[
								{ label: t('status.success'), value: 'success' },
								{ label: t('status.failure'), value: 'failure' },
							]}
						/>
						<DatePicker
							placeholder={t('auditLogs.startTime')}
							value={filters.startTime ? dayjs(filters.startTime * 1000) : null}
							onChange={(d) => {
								setFilters({ ...filters, startTime: d ? toEpochSeconds(d) : undefined });
								setPage(1);
							}}
						/>
						<DatePicker
							placeholder={t('auditLogs.endTime')}
							value={filters.endTime ? dayjs(filters.endTime * 1000) : null}
							onChange={(d) => {
								setFilters({ ...filters, endTime: d ? toEpochSeconds(d) : undefined });
								setPage(1);
							}}
						/>
						<Tooltip title={searchDirty ? '' : t('auditLogs.searchUnchanged')}>
							<span>
								<Button
									type="primary"
									icon={<Search size="1em" />}
									onClick={handleSearch}
									disabled={!searchDirty}
								>
									{t('common.search')}
								</Button>
							</span>
						</Tooltip>
						<Button icon={<RefreshCw size="1em" />} onClick={handleReset}>
							{t('common.reset')}
						</Button>
						<Can denyAuditor>
							<Button
								icon={<ExternalLink size="1em" />}
								onClick={handleExport}
								loading={exportMutation.isPending}
							>
								{t('common.export')}
							</Button>
						</Can>
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
					locale={{ emptyText: <Empty description={t('auditLogs.empty')} /> }}
				/>
			</Spin>

			<Drawer
				title={t('auditLogs.detailTitle')}
				size="md"
				open={drawerVisible}
				onClose={handleDrawerClose}
				destroyOnHidden
			>
				<Spin spinning={detailLoading}>
					{detail && (
						<Descriptions bordered column={1} size="small">
							<Descriptions.Item label={t('auditLogs.detailId')}>
								{(detail as any).id}
							</Descriptions.Item>
							<Descriptions.Item label={t('auditLogs.detailTime')}>
								{(detail as any).timestamp
									? dayjs((detail as any).timestamp).format('YYYY-MM-DD HH:mm:ss')
									: '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('auditLogs.detailTenantId')}>
								{(detail as any).tenantId}
							</Descriptions.Item>
							<Descriptions.Item label={t('auditLogs.detailOperator')}>
								<UserIdentity userId={(detail as any).operatorId} />
							</Descriptions.Item>
							<Descriptions.Item label={t('auditLogs.detailOperatorType')}>
								{(detail as any).operatorType}
							</Descriptions.Item>
							<Descriptions.Item label={t('auditLogs.detailModule')}>
								{(detail as any).module}
							</Descriptions.Item>
							<Descriptions.Item label={t('auditLogs.detailAction')}>
								{(detail as any).action}
							</Descriptions.Item>
							<Descriptions.Item label={t('auditLogs.detailStatus')}>
								{renderStatusTag((detail as any).status)}
							</Descriptions.Item>
							<Descriptions.Item label={t('auditLogs.detailLevel')}>
								<Tag color={levelColor((detail as any).level)}>
									{levelLabel(t, (detail as any).level)}
								</Tag>
							</Descriptions.Item>
							<Descriptions.Item label={t('auditLogs.detailIp')}>
								{(detail as any).ip || '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('auditLogs.detailDuration')}>
								{(detail as any).duration} ms
							</Descriptions.Item>
							<Descriptions.Item label={t('auditLogs.detailSequence')}>
								{(detail as any).sequence}
							</Descriptions.Item>
							<Descriptions.Item label={t('auditLogs.detailMessage')}>
								{(detail as any).message}
							</Descriptions.Item>
							<Descriptions.Item label={t('auditLogs.detailMetadata')}>
								<pre className="bg-neutral-50 p-2 rounded-xs text-xs overflow-auto max-h-60">
									{JSON.stringify((detail as any).metadata || {}, null, 2)}
								</pre>
							</Descriptions.Item>
						</Descriptions>
					)}
				</Spin>
			</Drawer>
		</div>
	);
}
