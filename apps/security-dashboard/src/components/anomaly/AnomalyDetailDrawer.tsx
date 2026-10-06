'use client';

import React, { useEffect, useState } from 'react';
import { Tabs, Spin, Descriptions, Tag, Timeline, List, Badge, Empty, Card, Statistic, Row, Col } from 'antd';
import {
	FileSearch,
	Link2,
	MessageSquare,
	Network,
	ShieldCheck,
} from 'lucide-react';
import dayjs from 'dayjs';
import { getAnomalyById, getAnomalyTimeline, getRelatedAnomalies } from '@/lib/api.generated';
import { message } from '@/lib/antd-app';
import { useTranslation } from 'react-i18next';
import type {
	AnomalyResponse,
	AnomalyTimelineResponse,
	AuditLogResponse,
} from '@autional/shared/generated/types';
import AnomalyComments from './AnomalyComments';
import { Alert } from '@autional/ui';
import { Drawer } from '@autional/ui/antd';
import { UserIdentity } from '@/components/UserIdentity';
import { severityColor, severityLabel } from '@/lib/enums';
import { anomalyDescription } from '@/lib/anomaly';

interface AnomalyDetailDrawerProps {
	anomalyId: string | null;
	visible: boolean;
	onClose: () => void;
	onStatusChange?: () => void;
}

const severityColors: Record<string, string> = {
	low: 'blue',
	medium: 'gold',
	high: 'orange',
	critical: 'red',
};

const statusColors: Record<string, string> = {
	open: 'red',
	investigating: 'orange',
	resolved: 'green',
	false_positive: 'default',
};

export default function AnomalyDetailDrawer({
	anomalyId,
	visible,
	onClose,
	onStatusChange,
}: AnomalyDetailDrawerProps) {
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

	const [detail, setDetail] = useState<AnomalyResponse | null>(null);
	const [timeline, setTimeline] = useState<AnomalyTimelineResponse | null>(null);
	const [related, setRelated] = useState<AnomalyResponse[]>([]);
	const [loading, setLoading] = useState(false);
	const [activeTab, setActiveTab] = useState('overview');

	useEffect(() => {
		if (visible && anomalyId) {
			fetchDetail(anomalyId);
		}
	}, [visible, anomalyId]);

	const fetchDetail = async (id: string) => {
		setLoading(true);
		try {
			const res = await getAnomalyById(id);
			setDetail(res || null);
		} catch {
			message.error(t('anomalies.fetchDetailFailed'));
		} finally {
			setLoading(false);
		}
	};

	const fetchTimeline = async (id: string) => {
		setLoading(true);
		try {
			const res = await getAnomalyTimeline(id);
			setTimeline(res || null);
		} catch {
			message.error(t('anomalies.fetchTimelineFailed'));
		} finally {
			setLoading(false);
		}
	};

	const fetchRelated = async (id: string) => {
		setLoading(true);
		try {
			const res = await getRelatedAnomalies(id);
			setRelated(res?.items || []);
		} catch {
			message.error(t('anomalies.fetchRelatedFailed'));
		} finally {
			setLoading(false);
		}
	};

	const handleTabChange = (key: string) => {
		setActiveTab(key);
		if (!anomalyId) return;
		if (key === 'timeline' && !timeline) {
			fetchTimeline(anomalyId);
		}
		if (key === 'related' && related.length === 0) {
			fetchRelated(anomalyId);
		}
	};

	const renderOverview = () => {
		if (!detail) return <Empty description={t('anomalies.noDetailData')} />;

		return (
			<div className="space-y-4">
				<Alert
					variant={
						detail.severity === 'critical'
							? 'danger'
							: detail.severity === 'high'
								? 'warning'
								: 'info'
					}
					title={`${t('anomalies.columnType')}：${typeLabels[detail.type ?? ''] || detail.type}`}
				>
					{anomalyDescription(t, detail)}
				</Alert>

				<Row gutter={[16, 16]}>
					<Col span={12}>
						<Card size="small">
							<Statistic
								title={t('anomalies.columnSeverity')}
								value={severityLabel(t, detail.severity)}
								valueStyle={{
									color: severityColors[detail.severity || ''] === 'red' ? 'var(--color-danger)' : 'var(--color-warning)',
								}}
							/>
						</Card>
					</Col>
					<Col span={12}>
						<Card size="small">
							<Statistic
								title={t('anomalies.columnStatus')}
								value={statusLabels[detail.status || ''] || detail.status}
								valueStyle={{
									color:
										statusColors[detail.status || ''] === 'red'
											? 'var(--color-danger)'
											: statusColors[detail.status || ''] === 'green'
												? 'var(--color-success)'
												: 'var(--color-warning)',
								}}
							/>
						</Card>
					</Col>
				</Row>

				<Descriptions bordered column={1} size="small">
					<Descriptions.Item label={t('anomalies.columnId')}>{detail.id}</Descriptions.Item>
					<Descriptions.Item label={t('anomalies.columnUser')}>
						<UserIdentity userId={detail.userId} />
					</Descriptions.Item>
					<Descriptions.Item label={t('anomalies.columnTenant')}>
						{detail.tenantId}
					</Descriptions.Item>
					<Descriptions.Item label={t('anomalies.columnDetectedAt')}>
						{detail.detectedAt ? dayjs(detail.detectedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
					</Descriptions.Item>
					<Descriptions.Item label={t('hashChain.columnValidatedAt')}>
						{detail.updatedAt ? dayjs(detail.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
					</Descriptions.Item>
					<Descriptions.Item label={t('alerts.columnAssignee')}>
						{detail.assignee || t('overview.notConfigured')}
					</Descriptions.Item>
					<Descriptions.Item label="MITRE">{detail.mitreTactic || '-'}</Descriptions.Item>
					<Descriptions.Item label={t('anomalies.relatedTab')}>
						{detail.relatedCaseId || '-'}
					</Descriptions.Item>
					<Descriptions.Item label={t('overview.recentEvents')}>
						{detail.eventIds && detail.eventIds.length > 0 ? detail.eventIds.join(', ') : '-'}
					</Descriptions.Item>
					{detail.resolvedBy && (
						<>
							<Descriptions.Item label={t('alerts.detailResolvedBy')}>
								{detail.resolvedBy}
							</Descriptions.Item>
							<Descriptions.Item label={t('alerts.detailResolvedAt')}>
								{detail.resolvedAt ? dayjs(detail.resolvedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
							</Descriptions.Item>
						</>
					)}
				</Descriptions>
			</div>
		);
	};

	const renderTimeline = () => {
		if (!timeline) return <Empty description={t('anomalies.noTimelineData')} />;

		const events = timeline.events || [];
		const context = timeline.context;
		const devices = timeline.loginSessions || [];

		return (
			<div className="space-y-4">
				{context && (
					<Row gutter={[16, 16]} className="mb-4">
						<Col span={8}>
							<Card size="small">
								<Statistic
									title={t('anomalies.timeWindowSeconds')}
									value={context.timeSpanSeconds || 0}
								/>
							</Card>
						</Col>
						<Col span={8}>
							<Card size="small">
								<Statistic
									title={t('anomalies.totalEvents')}
									value={context.totalEvents || 0}
									prefix={<FileSearch size="1em" />}
								/>
							</Card>
						</Col>
						<Col span={8}>
							<Card size="small">
								<Statistic
									title={t('anomalies.uniqueDevices')}
									value={context.uniqueDevices || 0}
									prefix={<Network size="1em" />}
								/>
							</Card>
						</Col>
					</Row>
				)}

				{devices.length > 0 && (
					<Card size="small" title={t('anomalies.deviceFingerprint')} className="mb-4">
						<List
							size="small"
							dataSource={devices}
							renderItem={(d: any) => (
								<List.Item>
									<div className="text-xs">
										<div>
											<strong>IP:</strong> {d.ip}
										</div>
										<div>
											<strong>UA:</strong> {d.userAgent}
										</div>
										<div>
											<strong>{t('anomalies.totalEvents')}:</strong> {d.eventCount}
										</div>
									</div>
								</List.Item>
							)}
						/>
					</Card>
				)}

				{events.length > 0 ? (
					<Timeline
						mode="left"
						items={events.map((evt: AuditLogResponse) => ({
							label: (
								<span className="text-xs text-neutral-600">
									{evt.timestamp ? dayjs(evt.timestamp).format('HH:mm:ss') : '-'}
								</span>
							),
							color: evt.level === 'error' ? 'red' : evt.level === 'warning' ? 'orange' : 'blue',
							dot: <FileSearch size="1em" />,
							children: (
								<div>
									<div className="text-sm font-medium">{evt.action}</div>
									<div className="text-xs text-neutral-600">{evt.message}</div>
									<div className="text-xs text-neutral-600 mt-1">
										{evt.ip} · {evt.module} · <UserIdentity userId={evt.operatorId} />
									</div>
								</div>
							),
						}))}
					/>
				) : (
					<Empty description={t('anomalies.noEventData')} />
				)}
			</div>
		);
	};

	const renderRelated = () => {
		if (related.length === 0) return <Empty description={t('anomalies.noRelatedData')} />;

		return (
			<List
				dataSource={related}
				renderItem={(item: AnomalyResponse) => (
					<List.Item>
						<div className="w-full">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Tag color={severityColor(item.severity)}>{severityLabel(t, item.severity)}</Tag>
									<span className="font-medium">{typeLabels[item.type ?? ''] || item.type}</span>
								</div>
								<Badge
									status={
										item.status === 'open'
											? 'error'
											: item.status === 'investigating'
												? 'warning'
												: 'success'
									}
									text={statusLabels[item.status || ''] || item.status}
								/>
							</div>
							<div className="text-sm text-neutral-700 mt-1">{anomalyDescription(t, item)}</div>
							<div className="text-xs text-neutral-600 mt-1">
								{item.detectedAt ? dayjs(item.detectedAt).format('YYYY-MM-DD HH:mm:ss') : '-'} ·{' '}
								<UserIdentity userId={item.userId} />
							</div>
						</div>
					</List.Item>
				)}
			/>
		);
	};

	const tabItems = [
		{
			key: 'overview',
			label: (
				<span>
					<ShieldCheck size="1em" /> {t('anomalies.overviewTab')}
				</span>
			),
			children: renderOverview(),
		},
		{
			key: 'timeline',
			label: (
				<span>
					<FileSearch size="1em" /> {t('anomalies.timelineTab')}
				</span>
			),
			children: renderTimeline(),
		},
		{
			key: 'related',
			label: (
				<span>
					<Link2 size="1em" /> {t('anomalies.relatedTab')} ({related.length})
				</span>
			),
			children: renderRelated(),
		},
		{
			key: 'comments',
			label: (
				<span>
					<MessageSquare size="1em" /> {t('anomalies.commentsTab')} ({detail?.comments?.length || 0})
				</span>
			),
			children: anomalyId ? (
				<AnomalyComments
					anomalyId={anomalyId}
					initialComments={detail?.comments || []}
					onRefresh={fetchDetail}
				/>
			) : (
				<Empty description={t('anomalies.selectAnomaly')} />
			),
		},
	];

	return (
		<Drawer
			title={`${t('anomalies.detailTitle')} ${anomalyId ? `(${anomalyId.slice(0, 12)}...)` : ''}`}
			size="lg"
			open={visible}
			onClose={onClose}
			destroyOnHidden
		>
			<Spin spinning={loading}>
				<Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} />
			</Spin>
		</Drawer>
	);
}
