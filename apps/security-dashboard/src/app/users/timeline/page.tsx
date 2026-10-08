'use client';

import React, { useState } from 'react';
import { DataTable } from '@autional/ui/antd';
import { Alert, AppPageHeader } from '@autional/ui';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Pagination, Spin, Tag, Timeline } from 'antd';
import { AlertTriangle, ShieldCheck, UserCircle } from 'lucide-react';
import { useTenantSlug } from '@autional/shared';
import { getSecurityUserTimeline } from '@/lib/api';
import { formatTimelineTime, normalizeTimestamp } from '@/lib/format';
import { anomalyTypeLabel, severityColor, severityLabel } from '@/lib/enums';
import { eventActionLabel, eventMessage, eventStyle } from '@/lib/timeline';
import { UserIdentity } from '@/components/UserIdentity';
import { useTranslation } from 'react-i18next';

const anomalyColumns = (t: (k: string, o?: Record<string, unknown>) => string) => [
	{
		title: t('usersTimeline.anomalyType'),
		dataIndex: 'type',
		key: 'type',
		render: (v: string) => anomalyTypeLabel(t, v),
		ellipsis: true,
	},
	{
		title: t('usersTimeline.severity'),
		dataIndex: 'severity',
		key: 'severity',
		render: (v: string) => (
			<Tag color={severityColor(v)}>{v ? severityLabel(t, v) : '-'}</Tag>
		),
		width: 100,
	},
	{
		title: t('usersTimeline.detectedAt'),
		dataIndex: 'detectedAt',
		key: 'detectedAt',
		render: (v: number) => (v ? normalizeTimestamp(v).toLocaleString() : '-'),
		width: 180,
	},
];

export default function UserSecurityTimelinePage() {
	const { t } = useTranslation();
	const { id } = useParams<{ id: string }>();
	const slug = useTenantSlug();
	// S-72③：分页（网关透传 page/page_size，响应附 eventsTotal）
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(50);

	const { data, isLoading, error, isError } = useQuery({
		queryKey: ['users', 'timeline', id, page, pageSize],
		queryFn: () => getSecurityUserTimeline(id!, { page, pageSize }),
		enabled: !!id,
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Spin size="large" tip={t('common.loading')} />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="p-4">
				<Alert
					variant="danger"
					title={t('usersTimeline.fetchError')}
				>
					{(error as Error)?.message || t('usersTimeline.unknownError')}
				</Alert>
			</div>
		);
	}

	const timeline = data as Record<string, any>;
	const events: any[] = Array.isArray(timeline.events)
		? timeline.events
		: Array.isArray((timeline.events as any)?.items)
			? (timeline.events as any).items
			: [];
	const anomalies: any[] = Array.isArray(timeline.anomalies)
		? timeline.anomalies
		: Array.isArray((timeline.anomalies as any)?.items)
			? (timeline.anomalies as any).items
			: [];
	const eventsTotal = typeof timeline.eventsTotal === 'number' ? timeline.eventsTotal : 0;

	return (
		<div>
			<AppPageHeader
				title={
					<>
						{t('usersTimeline.title')}
						{id && (
							<span className="text-sm text-neutral-600 ml-2">
								<UserIdentity userId={id} link={false} />
							</span>
						)}
					</>
				}
				actions={
					id ? (
						<Link to={`/${slug ?? ''}/users/${id}/profile`}>
							<Button icon={<UserCircle size="1em" />}>{t('usersTimeline.viewProfile')}</Button>
						</Link>
					) : undefined
				}
			/>

			<Card
				title={
					<span>
						<ShieldCheck size="1em" className="mr-2" />
						{t('usersTimeline.eventTimeline')}
					</span>
				}
				className="mb-4"
			>
				{events.length > 0 ? (
					<>
						<Timeline
							mode="left"
							items={events.map((evt: any, i: number) => {
								const action = evt.action || evt.type || evt.event || '';
								const message = evt.message || evt.description || evt.detail || '';
								const time = evt.timestamp || evt.createdAt || evt.time || '';
								const { Icon, color } = eventStyle(action);
								return {
									key: evt.id || String(i),
									color,
									dot: <Icon size="1em" />,
									label: <span className="text-xs text-neutral-600">{formatTimelineTime(time)}</span>,
									children: (
										<div>
											<div className="text-sm font-medium">{eventActionLabel(t, action)}</div>
											{message && (
												<div className="text-xs text-neutral-600">{eventMessage(t, message)}</div>
											)}
										</div>
									),
								};
							})}
						/>
						{eventsTotal > pageSize && (
							<div className="mt-4 flex justify-end">
								<Pagination
									size="small"
									current={page}
									pageSize={pageSize}
									total={eventsTotal}
									showSizeChanger
									pageSizeOptions={[20, 50, 100]}
									onChange={(p, ps) => {
										setPage(ps !== pageSize ? 1 : p);
										setPageSize(ps);
									}}
									showTotal={(total) => t('usersTimeline.totalEvents', { count: total })}
								/>
							</div>
						)}
					</>
				) : (
					<div className="text-center text-neutral-600 py-8">{t('usersTimeline.noEvents')}</div>
				)}
			</Card>

			<Card
				title={
					<span>
						<AlertTriangle size="1em" className="mr-2" />
						{t('usersTimeline.anomalies')}
					</span>
				}
			>
				{anomalies.length > 0 ? (
					<DataTable
						dataSource={anomalies.map((a: any, i: number) => ({ ...a, key: a.id || String(i) }))}
						columns={anomalyColumns(t)}
						pagination={false}
						size="small"
						scroll={{ x: true }}
					/>
				) : (
					<div className="text-center text-neutral-600 py-4">{t('usersTimeline.noAnomalies')}</div>
				)}
			</Card>
		</div>
	);
}
