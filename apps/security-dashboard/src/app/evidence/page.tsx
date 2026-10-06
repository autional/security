'use client';

import React, { useState } from 'react';
import { DataTable, Drawer } from '@autional/ui/antd';
import { Card, Tag, Button, Space, Descriptions, message, Typography, Row, Col, Statistic, Select, Spin } from 'antd';
import {
	Eye,
	FileImage,
	FileQuestion,
	FileText,
	FileType,
	Link2,
} from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { useEvidence, useEvidenceDetail } from '@/hooks/use-security-queries';
import { useTranslation } from 'react-i18next';
import { PageScopeHint } from '@/components/PageScopeHint';

const { Title, Text } = Typography;

type EvidenceItem = {
	id: string;
	title: string;
	description?: string;
	controlType?: string;
	controlId?: string;
	collectorId?: string;
	fileUrl?: string;
	collectedAt?: string;
	createdAt: string;
};

export default function EvidencePage() {
	const { t } = useTranslation();

	const controlTypeMap: Record<string, string> = {
		gdpr: 'GDPR',
		iso27001: 'ISO 27001',
		sox: 'SOX',
		pci_dss: 'PCI DSS',
		hipaa: 'HIPAA',
	};

	const controlTypeColorMap: Record<string, string> = {
		gdpr: 'purple',
		iso27001: 'blue',
		sox: 'orange',
		pci_dss: 'green',
		hipaa: 'cyan',
	};

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [filterControlType, setFilterControlType] = useState<string | undefined>();
	const [drawerVisible, setDrawerVisible] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const { data, isLoading } = useEvidence({ page, pageSize, controlType: filterControlType });
	const { data: detailData, isLoading: detailLoading } = useEvidenceDetail(selectedId);

	const items: EvidenceItem[] = (data as any)?.items || [];
	const total = (data as any)?.total || 0;

	function getFileIcon(url?: string) {
		if (!url) return <FileQuestion size="1em" />;
		const ext = url.split('.').pop()?.toLowerCase();
		if (ext === 'pdf') return <FileType size="1em" className="text-danger" />;
		if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || ''))
			return <FileImage size="1em" className="text-info" />;
		return <FileText size="1em" className="text-neutral-600" />;
	}

	const openDetail = (record: EvidenceItem) => {
		setSelectedId(record.id);
		setDrawerVisible(true);
	};

	const columns: ColumnsType<EvidenceItem> = [
		{
			title: t('evidence.columnType'),
			width: 60,
			render: (_, record) => getFileIcon(record.fileUrl),
		},
		{ title: t('evidence.columnId'), dataIndex: 'id', width: 120 },
		{ title: t('evidence.columnTitle'), dataIndex: 'title', ellipsis: true },
		{
			title: t('evidence.columnControlType'),
			dataIndex: 'controlType',
			width: 120,
			render: (v: string) => (
				<Tag color={controlTypeColorMap[v] || 'default'}>{controlTypeMap[v] || v}</Tag>
			),
		},
		{ title: t('evidence.columnControlId'), dataIndex: 'controlId', width: 120 },
		{
			title: t('evidence.columnCollectedAt'),
			dataIndex: 'collectedAt',
			width: 180,
			render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
		},
		{
			title: t('common.actions'),
			width: 120,
			fixed: 'right',
			render: (_, record) => (
				<Space>
					<Button size="small" icon={<Eye size="1em" />} onClick={() => openDetail(record)}>
						{t('common.view')}
					</Button>
					{record.fileUrl && (
						<Button
							size="small"
							icon={<Link2 size="1em" />}
							href={record.fileUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							{t('common.download')}
						</Button>
					)}
				</Space>
			),
		},
	];

	const selected = selectedId ? items.find((i) => i.id === selectedId) : null;
	const detail = detailData || selected;

	return (
		<div>
			<Title level={3}>{t('evidence.title')}</Title>
			<Text type="secondary">{t('evidence.subtitle')}</Text>

			<Row gutter={16} className="mt-4 mb-4">
				<Col span={6}>
					<Card>
						<Statistic
							title={t('evidence.statTotal')}
							value={total}
							prefix={<FileText size="1em" />}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic
							title={<span>{t('evidence.statGdpr')}<PageScopeHint /></span>}
							value={items.filter((i) => i.controlType === 'gdpr').length}
							valueStyle={{ color: 'var(--color-chart-7)' }}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic
							title={<span>{t('evidence.statIso')}<PageScopeHint /></span>}
							value={items.filter((i) => i.controlType === 'iso27001').length}
							valueStyle={{ color: 'var(--color-info)' }}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic
							title={<span>{t('evidence.statSox')}<PageScopeHint /></span>}
							value={items.filter((i) => i.controlType === 'sox').length}
							valueStyle={{ color: '#fa8c16' }}
						/>
					</Card>
				</Col>
			</Row>

			<Card
				title={t('evidence.listTitle')}
				extra={
					<Space>
						<Select
							placeholder={t('evidence.filterControlType')}
							allowClear
							style={{ width: 150 }}
							options={[
								{ value: 'gdpr', label: 'GDPR' },
								{ value: 'iso27001', label: 'ISO 27001' },
								{ value: 'sox', label: 'SOX' },
								{ value: 'pci_dss', label: 'PCI DSS' },
								{ value: 'hipaa', label: 'HIPAA' },
							]}
							value={filterControlType}
							onChange={setFilterControlType}
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
				title={`${t('evidence.detailTitle')} — ${detail?.id}`}
				size="md"
				open={drawerVisible}
				onClose={() => setDrawerVisible(false)}
			>
				<Spin spinning={detailLoading}>
					{detail && (
						<Descriptions column={1} bordered>
							<Descriptions.Item label={t('evidence.columnId')}>
								{(detail as any).id}
							</Descriptions.Item>
							<Descriptions.Item label={t('evidence.columnTitle')}>
								{(detail as any).title}
							</Descriptions.Item>
							<Descriptions.Item label={t('anomalies.columnDescription')}>
								{(detail as any).description || '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('evidence.columnControlType')}>
								<Tag color={controlTypeColorMap[(detail as any).controlType || ''] || 'default'}>
									{controlTypeMap[(detail as any).controlType || ''] || (detail as any).controlType}
								</Tag>
							</Descriptions.Item>
							<Descriptions.Item label={t('evidence.columnControlId')}>
								{(detail as any).controlId || '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('evidence.detailCollector')}>
								{(detail as any).collectorId || '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('evidence.columnCollectedAt')}>
								{(detail as any).collectedAt
									? new Date((detail as any).collectedAt).toLocaleString()
									: '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('archives.columnCreatedAt')}>
								{new Date((detail as any).createdAt).toLocaleString()}
							</Descriptions.Item>
							<Descriptions.Item label={t('evidence.detailFileLink')}>
								{(detail as any).fileUrl ? (
									<a href={(detail as any).fileUrl} target="_blank" rel="noopener noreferrer">
										{(detail as any).fileUrl}
									</a>
								) : (
									'-'
								)}
							</Descriptions.Item>
						</Descriptions>
					)}
				</Spin>
			</Drawer>
		</div>
	);
}
