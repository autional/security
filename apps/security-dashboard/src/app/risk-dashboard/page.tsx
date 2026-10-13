'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@autional/ui/antd';
import { Card, Row, Col, Statistic, Tag, Spin, Tooltip, Button } from 'antd';
import { AlertTriangle, ShieldAlert, ShieldCheck, TrendingUp } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { getRiskDashboard } from '@/lib/api';
import { Alert, AppPageHeader } from '@autional/ui';
import { UserIdentity } from '@/components/UserIdentity';

dayjs.extend(utc);

interface RiskRange {
	range: string;
	count: number;
}

interface EventType {
	eventType: string;
	count: number;
}

interface RiskUser {
	userId: string;
	maxScore: number;
	avgScore: number;
	count: number;
}

interface DayCount {
	date: string;
	count: number;
}

interface DashboardData {
	tenantId: string;
	todayTotal: number;
	scoreRanges: RiskRange[];
	topEventTypes: EventType[];
	topRiskUsers: RiskUser[];
	dayCounts: DayCount[];
}

const levelColors: Record<string, string> = {
	critical: 'red',
	high: 'orange',
	medium: 'gold',
	low: 'green',
	normal: 'default',
};

// S-30：分数体系为小数制，保留最多 2 位小数——原 Math.round 致 0.35→0 的「高分低均」误读
const fmtScore = (s: number | null | undefined) => Number(Number(s ?? 0).toFixed(2));

export default function RiskDashboardPage() {
	const { t } = useTranslation();
	const [data, setData] = useState<DashboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const eventColumns = [
		{
			title: t('risk.colEventType'),
			dataIndex: 'eventType',
			key: 'eventType',
			render: (v: string) => <Tag>{v}</Tag>,
		},
		{ title: t('risk.colCount'), dataIndex: 'count', key: 'count' },
	];

	const userColumns = [
		{
			title: t('risk.colUser'),
			dataIndex: 'userId',
			key: 'userId',
			// S-32：裸 ULID 截断不可识别 → 用户名/邮箱 + 画像入口（查不到回落截断 ULID）
			render: (id: string) => <UserIdentity userId={id} />,
		},
		{
			title: t('risk.colMaxScore'),
			dataIndex: 'maxScore',
			key: 'maxScore',
			render: (s: number) => <Tag color={s >= 80 ? 'red' : 'orange'}>{fmtScore(s)}</Tag>,
		},
		{
			title: t('risk.colAvgScore'),
			dataIndex: 'avgScore',
			key: 'avgScore',
			render: (s: number) => fmtScore(s),
		},
		{ title: t('risk.colEventCount'), dataIndex: 'count', key: 'count' },
	];

	// S-28：失败静默 catch 会把「接口失败」渲染成与「今天没事件」相同的全 0 界面——
	// catch 分支置错误态（含诊断信息），空值不再与 0 合并渲染
	const load = useCallback(() => {
		setLoading(true);
		setError(null);
		getRiskDashboard()
			.then(setData)
			.catch((e) => setError((e as Error)?.message || 'load failed'))
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />;

	if (error) {
		return (
			<div>
				<AppPageHeader title={t('risk.title')} description={t('risk.description')} />
				<Alert
					variant="danger"
					title={t('risk.loadFailed')}
					action={
						<Button size="small" onClick={load}>
							{t('common.retry')}
						</Button>
					}
				>
					{error}
				</Alert>
			</div>
		);
	};

	const criticalCount = data?.scoreRanges.find((r) => r.range === 'critical')?.count || 0;
	const highCount = data?.scoreRanges.find((r) => r.range === 'high')?.count || 0;

	// 7 日趋势：桶键为后端 CountByDay 的 YYYY-MM-DD（+08 业务日界）；今日高亮同口径
	const dayCounts = data?.dayCounts || [];
	const maxCount = Math.max(...dayCounts.map((x) => x.count), 1);
	const todayKey = dayjs().utcOffset(8).format('YYYY-MM-DD');

	return (
		<div>
			<AppPageHeader title={t('risk.title')} description={t('risk.description')} />

			<Row gutter={16} style={{ marginBottom: 24 }}>
				<Col span={6}>
					<Card>
						<Statistic title={t('risk.todayEvents')} value={data?.todayTotal || 0} prefix={<ShieldAlert size="1em" />} />
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic
							title={t('risk.criticalToday')}
							value={criticalCount}
							valueStyle={{ color: 'var(--color-danger-text)' }}
							prefix={<AlertTriangle size="1em" />}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic
							title={t('risk.highToday')}
							value={highCount}
							valueStyle={{ color: '#fa8c16' }}
							prefix={<TrendingUp size="1em" />}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic
							title={t('risk.scoreRangesToday')}
							value={data?.scoreRanges.length || 0}
							prefix={<ShieldCheck size="1em" />}
						/>
					</Card>
				</Col>
			</Row>

			<Row gutter={16}>
				<Col span={12}>
					<Card title={t('risk.scoreDistribution')} style={{ marginBottom: 16 }}>
						{(data?.scoreRanges || []).map((r) => (
							<div key={r.range} style={{ marginBottom: 8 }}>
								<Tag color={levelColors[r.range] || 'default'}>{r.range}</Tag>
								<span style={{ marginLeft: 8, fontWeight: 'bold' }}>{r.count}</span>
							</div>
						))}
					</Card>
				</Col>
				<Col span={12}>
					<Card title={t('risk.topEventTypes')} style={{ marginBottom: 16 }}>
						<DataTable
							dataSource={data?.topEventTypes || []}
							columns={eventColumns}
							rowKey="eventType"
							pagination={false}
							size="small"
						/>
					</Card>
				</Col>
			</Row>

			<Card title={t('risk.topRiskUsers')} style={{ marginBottom: 16 }}>
				<DataTable
					dataSource={data?.topRiskUsers || []}
					columns={userColumns}
					rowKey="userId"
					pagination={false}
					size="small"
					locale={{ emptyText: t('risk.noRiskUsers') }}
				/>
			</Card>

			<Card title={t('risk.trend7d')}>
				<div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120 }}>
					{(data?.dayCounts || []).map((d) => {
						const height = Math.max((d.count / maxCount) * 100, 4);
						const bucketDay = String(d.date).slice(0, 10);
						const isToday = bucketDay === todayKey;
						return (
							<div key={d.date} style={{ flex: 1, textAlign: 'center' }}>
								<Tooltip title={t('risk.trendTooltip', { date: bucketDay, count: d.count })}>
									<div
										style={{
											height: `${height}px`,
											background: isToday ? '#1677ff' : '#91caff',
											borderRadius: '4px 4px 0 0',
											marginBottom: 4,
										}}
									/>
								</Tooltip>
								<span style={{ fontSize: 10 }}>{bucketDay.slice(5)}</span>
							</div>
						);
					})}
					{!dayCounts.length && <span>{t('common.noData')}</span>}
				</div>
			</Card>
		</div>
	);
}
