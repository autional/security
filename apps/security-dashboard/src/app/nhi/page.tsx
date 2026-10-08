'use client';

import React, { useState } from 'react';
import { DataTable } from '@autional/ui/antd';
import { Card, Row, Col, Statistic, Tag, Tabs, Button, Popconfirm, message } from 'antd';
import {
	Bot,
	CheckCircle2,
	MinusCircle,
	Plug,
	RefreshCw,
	Wifi,
	XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
	useAgents,
	useRobots,
	useIots,
	useDeleteAgent,
	useCommissionRobot,
	useDecommissionRobot,
	useDeleteRobot,
	useDeleteDevice,
} from '@/hooks/use-security-queries';
import NhiDetailDrawer from '@/components/nhi/NhiDetailDrawer';
import { Can } from '@/components/Can';
import { extractList } from '@autional/shared';
import { AppPageHeader } from '@autional/ui';

const STATUS_COLORS: Record<string, string> = {
	active: 'green',
	provisioning: 'blue',
	rotating: 'orange',
	revoked: 'red',
	commissioning: 'blue',
	degraded: 'orange',
	decommissioned: 'red',
	unpaired: 'default',
	transferring: 'purple',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
	active: <CheckCircle2 size="1em" />,
	provisioning: <RefreshCw size="1em" className="animate-spin" />,
	rotating: <RefreshCw size="1em" className="animate-spin" />,
	revoked: <XCircle size="1em" />,
	commissioning: <RefreshCw size="1em" className="animate-spin" />,
	degraded: <MinusCircle size="1em" />,
	decommissioned: <XCircle size="1em" />,
	unpaired: <MinusCircle size="1em" />,
	transferring: <RefreshCw size="1em" className="animate-spin" />,
};

function AgentTable({ onViewDetail }: { onViewDetail: (record: any) => void }) {
	const { t } = useTranslation();
	// S-51（fix-security-w5）：服务端分页——原 page_size:100 拉取 + 客户端 20/页，
	// >100 条截断、翻页数字漂移
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const { data, isLoading } = useAgents({ page, page_size: pageSize });
	const deleteAgent = useDeleteAgent();
	const items = extractList(data) || [];
	const total = (data as any)?.total || (data as any)?.pagination?.total || items.length;

	const columns = [
		{ title: t('nhi.name', 'Name'), dataIndex: 'name', key: 'name', ellipsis: true },
		{
			title: t('nhi.status', 'Status'),
			dataIndex: 'status',
			key: 'status',
			render: (s: string) => (
				<Tag icon={STATUS_ICONS[s]} color={STATUS_COLORS[s] || 'default'}>
					{s || '-'}
				</Tag>
			),
		},
		{
			title: t('nhi.type', 'Type'),
			dataIndex: 'workloadSubtype',
			key: 'workloadSubtype',
			ellipsis: true,
		},
		{
			title: t('nhi.created', 'Created'),
			dataIndex: 'createdAt',
			key: 'createdAt',
			ellipsis: true,
		},
		{
			title: t('nhi.actions', 'Actions'),
			key: 'actions',
			width: 180,
			render: (_: unknown, record: any) => (
				<div style={{ display: 'flex', gap: 8 }}>
					{record.status === 'active' && (
						<Popconfirm
							title={t('nhi.revokeConfirm', 'Revoke this agent?')}
							onConfirm={() =>
								deleteAgent.mutate(record.id, {
									onSuccess: () => message.success(t('nhi.revokeSuccess', 'Agent revoked')),
									onError: () => message.error(t('nhi.revokeError', 'Failed to revoke agent')),
								})
							}
						>
							<Button size="small" danger loading={deleteAgent.isPending}>
								{t('nhi.revoke', 'Revoke')}
							</Button>
						</Popconfirm>
					)}
					<Button size="small" onClick={() => onViewDetail(record)}>
						{t('common.view', 'View')}
					</Button>
				</div>
			),
		},
	];

	return (
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
					setPageSize(ps);
				},
			}}
			size="small"
			locale={{ emptyText: t('nhi.noAgents', 'No agents found') }}
		/>
	);
}

function RobotTable({ onViewDetail }: { onViewDetail: (record: any) => void }) {
	const { t } = useTranslation();
	// S-51（fix-security-w5）：服务端分页（同 AgentTable）
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const { data, isLoading } = useRobots({ page, page_size: pageSize });
	const commission = useCommissionRobot();
	const decommission = useDecommissionRobot();
	const deleteRobot = useDeleteRobot();
	const items = extractList(data) || [];
	const total = (data as any)?.total || (data as any)?.pagination?.total || items.length;

	const columns = [
		{ title: t('nhi.name', 'Name'), dataIndex: 'name', key: 'name', ellipsis: true },
		{
			title: t('nhi.status', 'Status'),
			dataIndex: 'status',
			key: 'status',
			render: (s: string) => (
				<Tag icon={STATUS_ICONS[s]} color={STATUS_COLORS[s] || 'default'}>
					{s || '-'}
				</Tag>
			),
		},
		{
			title: t('nhi.type', 'Type'),
			dataIndex: 'workloadSubtype',
			key: 'workloadSubtype',
			ellipsis: true,
		},
		{
			title: t('nhi.created', 'Created'),
			dataIndex: 'createdAt',
			key: 'createdAt',
			ellipsis: true,
		},
		{
			title: t('nhi.actions', 'Actions'),
			key: 'actions',
			width: 240,
			render: (_: unknown, record: any) => (
				<div style={{ display: 'flex', gap: 8 }}>
					{record.status === 'commissioning' && (
						<Popconfirm
							title={t('nhi.commissionConfirm', 'Commission this robot?')}
							onConfirm={() =>
								commission.mutate(record.id, {
									onSuccess: () =>
										message.success(t('nhi.commissionSuccess', 'Robot commissioned')),
									onError: () =>
										message.error(t('nhi.commissionError', 'Failed to commission robot')),
								})
							}
						>
							<Button size="small" type="primary" loading={commission.isPending}>
								{t('nhi.commission', 'Commission')}
							</Button>
						</Popconfirm>
					)}
					{record.status === 'active' && (
						<Popconfirm
							title={t('nhi.decommissionConfirm', 'Decommission this robot?')}
							onConfirm={() =>
								decommission.mutate(record.id, {
									onSuccess: () =>
										message.success(t('nhi.decommissionSuccess', 'Robot decommissioned')),
									onError: () =>
										message.error(t('nhi.decommissionError', 'Failed to decommission robot')),
								})
							}
						>
							<Button size="small" loading={decommission.isPending}>
								{t('nhi.decommission', 'Decommission')}
							</Button>
						</Popconfirm>
					)}
					<Popconfirm
						title={t('nhi.deleteConfirm', 'Delete this robot?')}
						onConfirm={() =>
							deleteRobot.mutate(record.id, {
								onSuccess: () => message.success(t('nhi.deleteSuccess', 'Robot deleted')),
								onError: () => message.error(t('nhi.deleteError', 'Failed to delete robot')),
							})
						}
					>
						<Button size="small" danger loading={deleteRobot.isPending}>
							{t('nhi.delete', 'Delete')}
						</Button>
					</Popconfirm>
					<Button size="small" onClick={() => onViewDetail(record)}>
						{t('common.view', 'View')}
					</Button>
				</div>
			),
		},
	];

	return (
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
					setPageSize(ps);
				},
			}}
			size="small"
			locale={{ emptyText: t('nhi.noRobots', 'No robots found') }}
		/>
	);
}

function IotTable({ onViewDetail }: { onViewDetail: (record: any) => void }) {
	const { t } = useTranslation();
	// S-51（fix-security-w5）：服务端分页（同 AgentTable）
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const { data, isLoading } = useIots({ page, page_size: pageSize });
	const deleteDevice = useDeleteDevice();
	const items = extractList(data) || [];
	const total = (data as any)?.total || (data as any)?.pagination?.total || items.length;

	const columns = [
		{ title: t('nhi.name', 'Name'), dataIndex: 'name', key: 'name', ellipsis: true },
		{
			title: t('nhi.status', 'Status'),
			dataIndex: 'status',
			key: 'status',
			render: (s: string) => (
				<Tag icon={STATUS_ICONS[s]} color={STATUS_COLORS[s] || 'default'}>
					{s || '-'}
				</Tag>
			),
		},
		{
			title: t('nhi.type', 'Type'),
			dataIndex: 'workloadSubtype',
			key: 'workloadSubtype',
			ellipsis: true,
		},
		{
			title: t('nhi.created', 'Created'),
			dataIndex: 'createdAt',
			key: 'createdAt',
			ellipsis: true,
		},
		{
			title: t('nhi.actions', 'Actions'),
			key: 'actions',
			width: 180,
			render: (_: unknown, record: any) => (
				<div style={{ display: 'flex', gap: 8 }}>
					{record.status === 'active' && (
						<Popconfirm
							title={t('nhi.deleteConfirm', 'Delete this device?')}
							onConfirm={() =>
								deleteDevice.mutate(record.id, {
									onSuccess: () => message.success(t('nhi.deleteSuccess', 'Device deleted')),
									onError: () => message.error(t('nhi.deleteError', 'Failed to delete device')),
								})
							}
						>
							<Button size="small" danger loading={deleteDevice.isPending}>
								{t('nhi.delete', 'Delete')}
							</Button>
						</Popconfirm>
					)}
					<Button size="small" onClick={() => onViewDetail(record)}>
						{t('common.view', 'View')}
					</Button>
				</div>
			),
		},
	];

	return (
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
					setPageSize(ps);
				},
			}}
			size="small"
			locale={{ emptyText: t('nhi.noDevices', 'No devices found') }}
		/>
	);
}

export default function NhiPage() {
	const { t } = useTranslation();
	const [activeTab, setActiveTab] = useState<string>('agents');
	const [selectedEntity, setSelectedEntity] = useState<{
		type: 'agent' | 'robot' | 'device';
		id: string;
	} | null>(null);

	// S-51（fix-security-w5）：统计卡一律读服务端 total（page_size:1 仅取计数）——
	// 原当页 items 计数随翻页漂移，robotActive/iotActive 为算而不用死变量已删除
	const { data: agentsData } = useAgents({ page_size: 1 });
	const { data: robotsData } = useRobots({ page_size: 1 });
	const { data: iotsData } = useIots({ page_size: 1 });
	const { data: activeAgentsData } = useAgents({ status: 'active', page_size: 1 });

	const agentCount = ((agentsData as any)?.total || 0) as number;
	const robotCount = ((robotsData as any)?.total || 0) as number;
	const iotCount = ((iotsData as any)?.total || 0) as number;
	const agentActive = ((activeAgentsData as any)?.total || 0) as number;

	return (
		<Can denyAuditor>
			<div>
				<AppPageHeader title={t('nhi.title', 'NHI Monitoring')} />

				<Row gutter={[16, 16]} className="mb-4">
					<Col xs={12} sm={6}>
						<Card>
							<Statistic
								title={t('nhi.totalAgents', 'Total Agents')}
								value={agentCount}
								prefix={<Plug size="1em" />}
							/>
						</Card>
					</Col>
					<Col xs={12} sm={6}>
						<Card>
							<Statistic
								title={t('nhi.activeAgents', 'Active Agents')}
								value={agentActive}
								valueStyle={{ color: 'var(--color-success)' }}
								prefix={<CheckCircle2 size="1em" />}
							/>
						</Card>
					</Col>
					<Col xs={12} sm={6}>
						<Card>
							<Statistic
								title={t('nhi.totalRobots', 'Total Robots')}
								value={robotCount}
								prefix={<Bot size="1em" />}
							/>
						</Card>
					</Col>
					<Col xs={12} sm={6}>
						<Card>
							<Statistic
								title={t('nhi.totalDevices', 'Total Devices')}
								value={iotCount}
								prefix={<Wifi size="1em" />}
							/>
						</Card>
					</Col>
				</Row>

				<Card>
					<Tabs
						activeKey={activeTab}
						onChange={setActiveTab}
						items={[
							{
								key: 'agents',
								label: `${t('nhi.agents', 'Agents')} (${agentCount})`,
								children: (
									<AgentTable
										onViewDetail={(record: any) =>
											setSelectedEntity({ type: 'agent', id: record.id })
										}
									/>
								),
							},
							{
								key: 'robots',
								label: `${t('nhi.robots', 'Robots')} (${robotCount})`,
								children: (
									<RobotTable
										onViewDetail={(record: any) =>
											setSelectedEntity({ type: 'robot', id: record.id })
										}
									/>
								),
							},
							{
								key: 'iots',
								label: `${t('nhi.devices', 'IoT Devices')} (${iotCount})`,
								children: (
									<IotTable
										onViewDetail={(record: any) =>
											setSelectedEntity({ type: 'device', id: record.id })
										}
									/>
								),
							},
						]}
					/>
				</Card>
				<NhiDetailDrawer
					entityType={selectedEntity?.type || 'agent'}
					entityId={selectedEntity?.id || null}
					visible={selectedEntity !== null}
					onClose={() => setSelectedEntity(null)}
				/>
			</div>
		</Can>
	);
}
