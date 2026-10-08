'use client';

import { useCallback, useEffect, useState } from 'react';
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

const eventColumns = [
	{
		title: '事件类型',
		dataIndex: 'eventType',
		key: 'eventType',
		render: (t: string) => <Tag>{t}</Tag>,
	},
	{ title: '次数', dataIndex: 'count', key: 'count' },
];

const userColumns = [
	{
		title: '用户',
		dataIndex: 'userId',
		key: 'userId',
		// S-32：裸 ULID 截断不可识别 → 用户名/邮箱 + 画像入口（查不到回落截断 ULID）
		render: (id: string) => <UserIdentity userId={id} />,
	},
	{
		title: '最高分',
		dataIndex: 'maxScore',
		key: 'maxScore',
		render: (s: number) => <Tag color={s >= 80 ? 'red' : 'orange'}>{fmtScore(s)}</Tag>,
	},
	{
		title: '平均分',
		dataIndex: 'avgScore',
		key: 'avgScore',
		render: (s: number) => fmtScore(s),
	},
	{ title: '事件数', dataIndex: 'count', key: 'count' },
];

export default function RiskDashboardPage() {
	const [data, setData] = useState<DashboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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
				<AppPageHeader
					title="风险仪表盘"
					description="租户风险全景视图 — 今日事件 / 评分分布 / 高风险用户 Top 5"
				/>
				<Alert
					variant="danger"
					title="风险数据加载失败"
					action={
						<Button size="small" onClick={load}>
							重试
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
			<AppPageHeader
				title="风险仪表盘"
				description="租户风险全景视图 — 今日事件 / 评分分布 / 高风险用户 Top 5"
			/>

			<Row gutter={16} style={{ marginBottom: 24 }}>
				<Col span={6}>
					<Card>
						<Statistic title="今日事件" value={data?.todayTotal || 0} prefix={<ShieldAlert size="1em" />} />
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic
							title="严重事件（今日）"
							value={criticalCount}
							valueStyle={{ color: 'var(--color-danger-text)' }}
							prefix={<AlertTriangle size="1em" />}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic
							title="高风险事件（今日）"
							value={highCount}
							valueStyle={{ color: '#fa8c16' }}
							prefix={<TrendingUp size="1em" />}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card>
						<Statistic
							title="评分档位（今日）"
							value={data?.scoreRanges.length || 0}
							prefix={<ShieldCheck size="1em" />}
						/>
					</Card>
				</Col>
			</Row>

			<Row gutter={16}>
				<Col span={12}>
					<Card title="评分分布（今日）" style={{ marginBottom: 16 }}>
						{(data?.scoreRanges || []).map((r) => (
							<div key={r.range} style={{ marginBottom: 8 }}>
								<Tag color={levelColors[r.range] || 'default'}>{r.range}</Tag>
								<span style={{ marginLeft: 8, fontWeight: 'bold' }}>{r.count}</span>
							</div>
						))}
					</Card>
				</Col>
				<Col span={12}>
					<Card title="高频事件类型（近 7 天）" style={{ marginBottom: 16 }}>
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

			<Card title="高风险用户 Top 5 (近 7 天)" style={{ marginBottom: 16 }}>
				<DataTable
					dataSource={data?.topRiskUsers || []}
					columns={userColumns}
					rowKey="userId"
					pagination={false}
					size="small"
					locale={{ emptyText: '近 7 天无高风险用户（最高分 ≥ 60）' }}
				/>
			</Card>

			<Card title="7 日趋势">
				<div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120 }}>
					{(data?.dayCounts || []).map((d) => {
						const height = Math.max((d.count / maxCount) * 100, 4);
						const bucketDay = String(d.date).slice(0, 10);
						const isToday = bucketDay === todayKey;
						return (
							<div key={d.date} style={{ flex: 1, textAlign: 'center' }}>
								<Tooltip title={`${bucketDay} · ${d.count} 起`}>
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
					{!dayCounts.length && <span>暂无数据</span>}
				</div>
			</Card>
		</div>
	);
}
