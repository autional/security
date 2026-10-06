'use client';

import React, { useState } from 'react';
import { DataTable } from '@autional/ui/antd';
import type { DataTableColumns } from '@autional/ui/antd';
import { Alert, ConsolePageHeader } from '@autional/ui';
import { Card, Button, Tag, Spin, Empty, Space, Row, Col, Statistic, Input, Modal } from 'antd';
import {
	AlertCircle,
	Ban,
	Network,
	RefreshCw,
	Search,
} from 'lucide-react';

import dayjs from 'dayjs';
import { useSessions, useActiveSessions, useTerminateSession } from '@/hooks/use-security-queries';
import { message } from '@/lib/antd-app';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/Can';
import { PageScopeHint } from '@/components/PageScopeHint';

interface SessionItem {
	id: string;
	userId: string;
	username: string;
	ipAddress: string;
	device: string;
	browser: string;
	location: string;
	riskScore: number;
	createdAt: string;
	lastActiveAt: string;
}

export default function SessionsPage() {
	const { t } = useTranslation();
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [keyword, setKeyword] = useState('');

	const { data, isLoading, isError: sessionsError, refetch } = useSessions({ page, pageSize, keyword });
	const { data: activeCountData, isError: activeError, refetch: refetchActive } = useActiveSessions();
	const terminateMutation = useTerminateSession();

	const items = (data as any)?.items || [];
	const total = (data as any)?.total || (data as any)?.pagination?.total || items.length;
	const activeCount = (activeCountData as any)?.count || 0;
	// S-46：查询失败时不得渲染假 0（与「真为 0」不可分）——统计卡对失败源显示 '--'
	const highRiskCount = items.filter((s: any) => s.riskScore >= 80).length;
	const queryFailed = sessionsError || activeError;

	const handleTerminate = async (id: string) => {
		Modal.confirm({
			title: t('sessions.confirmTitle'),
			icon: <AlertCircle size="1em" />,
			content: t('sessions.confirmContent'),
			okText: t('sessions.confirmOk'),
			cancelText: t('common.cancel'),
			okButtonProps: { danger: true },
			onOk: async () => {
				try {
					await terminateMutation.mutateAsync({ id });
					message.success(t('sessions.successTerminate'));
				} catch {
					message.error(t('sessions.failTerminate'));
				}
			},
		});
	};

	const riskColor = (score: number) => {
		if (score >= 80) return 'red';
		if (score >= 50) return 'orange';
		if (score >= 20) return 'gold';
		return 'green';
	};

	const columns: DataTableColumns<SessionItem> = [
		{ title: t('sessions.columnId'), dataIndex: 'id', width: 200 },
		{ title: t('sessions.columnUser'), dataIndex: 'username', width: 140 },
		{ title: t('sessions.columnUserId'), dataIndex: 'userId', width: 140 },
		{ title: t('sessions.columnIp'), dataIndex: 'ipAddress', width: 140 },
		{ title: t('sessions.columnDevice'), dataIndex: 'device', width: 140 },
		{ title: t('sessions.columnBrowser'), dataIndex: 'browser', width: 140 },
		{ title: t('sessions.columnLocation'), dataIndex: 'location', width: 140 },
		{
			title: t('sessions.columnRiskScore'),
			dataIndex: 'riskScore',
			width: 110,
			render: (v: number) => <Tag color={riskColor(v)}>{v}</Tag>,
		},
		{
			title: t('sessions.columnCreatedAt'),
			dataIndex: 'createdAt',
			width: 180,
			render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
		},
		{
			title: t('sessions.columnLastActive'),
			dataIndex: 'lastActiveAt',
			width: 180,
			render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
		},
		{
			title: t('sessions.columnActions'),
			width: 120,
			fixed: 'right',
			render: (_: any, record: SessionItem) => (
				<Can denyAuditor>
					<Button
						size="small"
						danger
						icon={<Ban size="1em" />}
						onClick={() => handleTerminate(record.id)}
					>
						{t('sessions.terminate')}
					</Button>
				</Can>
			),
		},
	];

	return (
		<div>
			<ConsolePageHeader
				title={t('sessions.title')}
				actions={
					<>
						<Button
							icon={<RefreshCw size="1em" />}
							onClick={() => {
								refetch();
								refetchActive();
							}}
						>
							{t('common.refresh')}
						</Button>
					</>
				}
			/>

			{queryFailed && (
				<Alert
					variant="danger"
					title={t('sessions.fetchFailed')}
					className="mb-4"
					action={
						<Button
							size="small"
							onClick={() => {
								refetch();
								refetchActive();
							}}
						>
							{t('common.retry')}
						</Button>
					}
				 />
			)}

			<Row gutter={[16, 16]} className="mb-4">
				<Col xs={24} sm={8}>
					<Card>
						<Statistic
							title={t('sessions.activeSessions')}
							value={activeError ? '--' : activeCount}
							prefix={<Network size="1em" className="text-info" />}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={8}>
					<Card>
						<Statistic
							title={<span>{t('sessions.highRiskSessions')}<PageScopeHint /></span>}
							value={sessionsError ? '--' : highRiskCount}
							prefix={<Ban size="1em" className="text-danger" />}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={8}>
					<Card>
						<Statistic
							title={t('sessions.totalSessions')}
							value={sessionsError ? '--' : total}
							prefix={<Network size="1em" className="text-info" />}
						/>
					</Card>
				</Col>
			</Row>

			<Card className="mb-4">
				<Space>
					<Input
						placeholder={t('sessions.searchPlaceholder')}
						value={keyword}
						onChange={(e) => setKeyword(e.target.value)}
						style={{ width: 280 }}
						onPressEnter={() => setPage(1)}
					/>
					<Button type="primary" icon={<Search size="1em" />} onClick={() => setPage(1)}>
						{t('common.search')}
					</Button>
					<Button
						onClick={() => {
							setKeyword('');
							setPage(1);
						}}
					>
						{t('common.reset')}
					</Button>
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
					scroll={{ x: 1400 }}
					locale={{
						emptyText: (
							<Empty
								description={sessionsError ? t('sessions.fetchFailed') : t('sessions.empty')}
							/>
						),
					}}
				/>
			</Spin>
		</div>
	);
}
