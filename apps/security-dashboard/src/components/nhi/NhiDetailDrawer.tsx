'use client';

import React from 'react';
import { Tabs, Spin, Descriptions, Tag, Empty } from 'antd';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAgentById, useRobotById, useDeviceById } from '@/hooks/use-security-queries';
import { Alert } from '@autional/ui';
import { Drawer } from '@autional/ui/antd';

interface NhiDetailDrawerProps {
	entityType: 'agent' | 'robot' | 'device';
	entityId: string | null;
	visible: boolean;
	onClose: () => void;
}

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

export default function NhiDetailDrawer({
	entityType,
	entityId,
	visible,
	onClose,
}: NhiDetailDrawerProps) {
	const { t } = useTranslation();

	const agentId = entityType === 'agent' && visible ? entityId : null;
	const robotId = entityType === 'robot' && visible ? entityId : null;
	const deviceId = entityType === 'device' && visible ? entityId : null;

	const { data: agentData, isLoading: agentLoading, isError: agentError } = useAgentById(agentId);
	const { data: robotData, isLoading: robotLoading, isError: robotError } = useRobotById(robotId);
	const {
		data: deviceData,
		isLoading: deviceLoading,
		isError: deviceError,
	} = useDeviceById(deviceId);

	const detail: any =
		entityType === 'agent' ? agentData : entityType === 'robot' ? robotData : deviceData;

	const loading =
		entityType === 'agent' ? agentLoading : entityType === 'robot' ? robotLoading : deviceLoading;

	const hasError =
		entityType === 'agent' ? agentError : entityType === 'robot' ? robotError : deviceError;

	const titleLabel =
		entityType === 'agent'
			? t('nhi.agents', 'Agent')
			: entityType === 'robot'
				? t('nhi.robots', 'Robot')
				: t('nhi.devices', 'IoT Device');

	const statusLabel = (s: string) => t(`nhi.status${s.charAt(0).toUpperCase()}${s.slice(1)}`, s);

	const renderAgentOverview = () => (
		<Descriptions bordered column={1} size="small">
			<Descriptions.Item label={t('nhi.name', 'Name')}>{detail.name || '-'}</Descriptions.Item>
			<Descriptions.Item label={t('nhi.identityId', 'Identity ID')}>
				{detail.identityId || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.status', 'Status')}>
				<Tag color={STATUS_COLORS[detail.status] || 'default'}>
					{statusLabel(detail.status) || detail.status || '-'}
				</Tag>
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.workloadSubtype', 'Workload Subtype')}>
				{detail.workloadSubtype || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.ownerId', 'Owner ID')}>
				{detail.ownerId || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.callbackUrl', 'Callback URL')}>
				{detail.callbackUrl || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.rotationDays', 'Rotation Days')}>
				{detail.rotationDays ?? '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.jitTtl', 'JIT TTL')}>
				{detail.jitTtl || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.lastRotatedAt', 'Last Rotated At')}>
				{detail.lastRotatedAt || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.description', 'Description')}>
				{detail.description || '-'}
			</Descriptions.Item>
		</Descriptions>
	);

	const renderRobotOverview = () => (
		<Descriptions bordered column={1} size="small">
			<Descriptions.Item label={t('nhi.name', 'Name')}>{detail.name || '-'}</Descriptions.Item>
			<Descriptions.Item label={t('nhi.identityId', 'Identity ID')}>
				{detail.identityId || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.status', 'Status')}>
				<Tag color={STATUS_COLORS[detail.status] || 'default'}>
					{statusLabel(detail.status) || detail.status || '-'}
				</Tag>
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.workloadSubtype', 'Workload Subtype')}>
				{detail.workloadSubtype || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.model', 'Model')}>{detail.model || '-'}</Descriptions.Item>
			<Descriptions.Item label={t('nhi.firmwareVer', 'Firmware Version')}>
				{detail.firmwareVer || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.location', 'Location')}>
				{detail.location || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.safetyPolicy', 'Safety Policy')}>
				{detail.safetyPolicy || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.lastHealthAt', 'Last Health At')}>
				{detail.lastHealthAt || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.description', 'Description')}>
				{detail.description || '-'}
			</Descriptions.Item>
		</Descriptions>
	);

	const renderDeviceOverview = () => (
		<Descriptions bordered column={1} size="small">
			<Descriptions.Item label={t('nhi.name', 'Name')}>{detail.name || '-'}</Descriptions.Item>
			<Descriptions.Item label={t('nhi.identityId', 'Identity ID')}>
				{detail.identityId || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.status', 'Status')}>
				<Tag color={STATUS_COLORS[detail.status] || 'default'}>
					{statusLabel(detail.status) || detail.status || '-'}
				</Tag>
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.workloadSubtype', 'Workload Subtype')}>
				{detail.workloadSubtype || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.hardwareId', 'Hardware ID')}>
				{detail.hardwareId || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.manufacturer', 'Manufacturer')}>
				{detail.manufacturer || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.firmwareVer', 'Firmware Version')}>
				{detail.firmwareVer || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.pairingCode', 'Pairing Code')}>
				{detail.pairingCode || '-'}
			</Descriptions.Item>
			<Descriptions.Item label={t('nhi.description', 'Description')}>
				{detail.description || '-'}
			</Descriptions.Item>
		</Descriptions>
	);

	const renderOverview = () => {
		if (!detail) return <Empty description={t('nhi.noDetailData', 'No detail data')} />;

		if (entityType === 'agent') return renderAgentOverview();
		if (entityType === 'robot') return renderRobotOverview();
		return renderDeviceOverview();
	};

	const tabItems = [
		{
			key: 'overview',
			label: (
				<span>
					<ShieldCheck size="1em" /> {t('nhi.overviewTab', 'Overview')}
				</span>
			),
			children: renderOverview(),
		},
	];

	return (
		<Drawer
			title={`${t('nhi.detailTitle', 'NHI Detail')} — ${titleLabel}`}
			size="sm"
			open={visible}
			onClose={onClose}
			destroyOnHidden
		>
			{hasError && (
				<Alert
					variant="danger"
					title={t('nhi.fetchDetailFailed', 'Failed to fetch detail')}
				 />
			)}
			<Spin spinning={loading}>
				<Tabs items={tabItems} />
			</Spin>
		</Drawer>
	);
}
