'use client';

import React from 'react';
import { DataTable } from '@autional/ui/antd';
import { Alert, AppPageHeader } from '@autional/ui';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Row, Col, Statistic, Descriptions, Badge, Spin, Tag } from 'antd';
import {
	AlertTriangle,
	Clock,
	History,
	Lock,
	ShieldCheck,
	Smartphone,
} from 'lucide-react';
import { useTenantSlug } from '@autional/shared';
import { getSecurityUserProfile } from '@/lib/api';
import { UserIdentity } from '@/components/UserIdentity';
import { useTranslation } from 'react-i18next';

const deviceColumns = (t: (k: string) => string) => [
	{
		title: t('usersProfile.deviceName'),
		dataIndex: 'deviceName',
		key: 'deviceName',
		ellipsis: true,
	},
	{
		title: t('usersProfile.deviceType'),
		dataIndex: 'deviceType',
		key: 'deviceType',
		ellipsis: true,
	},
	{
		title: t('usersProfile.trusted'),
		dataIndex: 'trusted',
		key: 'trusted',
		render: (v: boolean) =>
			v ? <Tag color="green">{t('common.yes')}</Tag> : <Tag color="default">{t('common.no')}</Tag>,
	},
	{
		title: t('usersProfile.lastActive'),
		dataIndex: 'lastActive',
		key: 'lastActive',
		render: (v: string) => v || '-',
	},
];

const sessionColumns = (t: (k: string) => string) => [
	{ title: t('usersProfile.sessionId'), dataIndex: 'sessionId', key: 'sessionId', ellipsis: true },
	{
		title: t('usersProfile.ip'),
		dataIndex: 'ip',
		key: 'ip',
		render: (v: string) => v || (v as unknown as Record<string, unknown>)?.address || '-',
		ellipsis: true,
	},
	{ title: t('usersProfile.device'), dataIndex: 'device', key: 'device', ellipsis: true },
	{ title: t('usersProfile.browser'), dataIndex: 'browser', key: 'browser', ellipsis: true },
	{
		title: t('usersProfile.lastActive'),
		dataIndex: 'lastActive',
		key: 'lastActive',
		render: (v: string) => v || '-',
	},
];

export default function UserSecurityProfilePage() {
	const { t } = useTranslation();
	const { id } = useParams<{ id: string }>();
	const slug = useTenantSlug();

	const { data, isLoading, error, isError } = useQuery({
		queryKey: ['users', 'profile', id],
		queryFn: () => getSecurityUserProfile(id!),
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
					title={t('usersProfile.fetchError')}
				>
					{(error as Error)?.message || t('usersProfile.unknownError')}
				</Alert>
			</div>
		);
	}

	const profile = data as Record<string, any>;
	const securityStatus = profile.securityStatus || {};
	const devices = Array.isArray(profile.devices)
		? profile.devices
		: Array.isArray((profile.devices as any)?.items)
			? (profile.devices as any).items
			: [];
	const sessions = Array.isArray(profile.sessions)
		? profile.sessions
		: Array.isArray((profile.sessions as any)?.items)
			? (profile.sessions as any).items
			: [];
	const anomalyCount = typeof profile.anomalyCount === 'number' ? profile.anomalyCount : 0;
	const passwordPolicy = profile.passwordPolicy || {};
	const partialErrors = (profile.partialErrors as string[]) || [];
	// S-70：组合端点部分失败时（partial_errors 形如 "devices: upstream returned 403"），
	// 对应区块空态不得断言「暂无 X」——区分「无数据/取数失败」
	const devicesUnavailable = partialErrors.some((e) => e.startsWith('devices'));
	const sessionsUnavailable = partialErrors.some((e) => e.startsWith('sessions'));

	const statusBadge = (status: string) => {
		switch (status) {
			case 'active':
				return <Badge status="success" text={t('usersProfile.statusActive')} />;
			case 'locked':
				return <Badge status="error" text={t('usersProfile.statusLocked')} />;
			case 'disabled':
				return <Badge status="default" text={t('usersProfile.statusDisabled')} />;
			case 'pending':
				return <Badge status="processing" text={t('usersProfile.statusPending')} />;
			default:
				return <Badge status="processing" text={status || t('usersProfile.statusUnknown')} />;
		}
	};

	return (
		<div>
			<AppPageHeader
				title={
					<>
						{t('usersProfile.title')}
						{id && (
							<span className="text-sm text-neutral-600 ml-2">
								<UserIdentity userId={id} link={false} />
							</span>
						)}
					</>
				}
				actions={
					id ? (
						<Link to={`/${slug ?? ''}/users/${id}/timeline`}>
							<Button icon={<History size="1em" />}>{t('usersProfile.viewTimeline')}</Button>
						</Link>
					) : undefined
				}
			/>

			{partialErrors.length > 0 && (
				<Alert
					variant="warning"
					title={t('usersProfile.partialErrors')}
					className="mb-4"
					closable
				>
					{partialErrors.join('; ')}
				</Alert>
			)}

			<Row gutter={[16, 16]}>
				<Col xs={24} lg={12}>
					<Card
						title={
							<span>
								<ShieldCheck size="1em" className="mr-2" />
								{t('usersProfile.securityStatus')}
							</span>
						}
					>
						<div className="mb-4">
							<div className="text-sm text-neutral-600 mb-2">{t('usersProfile.accountStatus')}</div>
							{statusBadge(
								securityStatus.isLocked
									? 'locked'
									: securityStatus.canLogin === true
										? 'active'
										: securityStatus.canLogin === false
											? 'disabled'
											: ''
							)}
						</div>
						<Descriptions column={1} size="small" bordered>
							<Descriptions.Item label={t('usersProfile.mfaEnabled')}>
								{securityStatus.mfaEnabled != null ? (
									securityStatus.mfaEnabled ? (
										<Tag color="green">{t('common.yes')}</Tag>
									) : (
										<Tag color="red">{t('common.no')}</Tag>
									)
								) : (
									'-'
								)}
							</Descriptions.Item>
							<Descriptions.Item label={t('usersProfile.lastLogin')}>
								{securityStatus.lastLogin || '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('usersProfile.lastFailedLogin')}>
								{securityStatus.lastFailedLogin || '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('usersProfile.failedLoginCount')}>
								{securityStatus.loginFailCount ?? 0}
							</Descriptions.Item>
							<Descriptions.Item label={t('usersProfile.passwordChangedAt')}>
								{securityStatus.passwordChangedAt || '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('usersProfile.loginCount')}>
								{securityStatus.loginCount ?? '-'}
							</Descriptions.Item>
						</Descriptions>
					</Card>
				</Col>

				<Col xs={24} lg={12}>
					<Card
						title={
							<span>
								<AlertTriangle size="1em" className="mr-2" />
								{t('usersProfile.anomalyCount')}
							</span>
						}
					>
						<Statistic
							value={anomalyCount}
							suffix={<span className="text-sm">{t('usersProfile.anomalyCountSuffix')}</span>}
							valueStyle={{ color: anomalyCount > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontSize: 32 }}
						/>
					</Card>
				</Col>
			</Row>

			<Row gutter={[16, 16]} className="mt-4">
				<Col xs={24} lg={12}>
					<Card
						title={
							<span>
								<Smartphone size="1em" className="mr-2" />
								{t('usersProfile.devices')}
							</span>
						}
					>
						{devices.length > 0 ? (
							<DataTable
								dataSource={devices.map((d: any, i: number) => ({
									...d,
									key: d.deviceId || d.id || String(i),
								}))}
								columns={deviceColumns(t)}
								pagination={false}
								size="small"
								scroll={{ x: true }}
							/>
						) : (
							<div className="text-center text-neutral-600 py-4">
								{devicesUnavailable ? t('usersProfile.devicesUnavailable') : t('usersProfile.noDevices')}
							</div>
						)}
					</Card>
				</Col>

				<Col xs={24} lg={12}>
					<Card
						title={
							<span>
								<Clock size="1em" className="mr-2" />
								{t('usersProfile.activeSessions')}
							</span>
						}
					>
						{sessions.length > 0 ? (
							<DataTable
								dataSource={sessions.map((s: any, i: number) => ({
									...s,
									key: s.sessionId || s.id || String(i),
								}))}
								columns={sessionColumns(t)}
								pagination={false}
								size="small"
								scroll={{ x: true }}
							/>
						) : (
							<div className="text-center text-neutral-600 py-4">
								{sessionsUnavailable ? t('usersProfile.sessionsUnavailable') : t('usersProfile.noSessions')}
							</div>
						)}
					</Card>
				</Col>
			</Row>

			<Row gutter={[16, 16]} className="mt-4">
				<Col xs={24}>
					<Card
						title={
							<span>
								<Lock size="1em" className="mr-2" />
								{t('usersProfile.passwordPolicy')}
							</span>
						}
					>
						<Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small" bordered>
							<Descriptions.Item label={t('usersProfile.minLength')}>
								{passwordPolicy.minLength ?? '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('usersProfile.requireUppercase')}>
								{passwordPolicy.requireUpper != null ? (
									passwordPolicy.requireUpper ? (
										<Tag color="green">{t('common.yes')}</Tag>
									) : (
										<Tag color="default">{t('common.no')}</Tag>
									)
								) : (
									'-'
								)}
							</Descriptions.Item>
							<Descriptions.Item label={t('usersProfile.requireDigit')}>
								{passwordPolicy.requireDigit != null ? (
									passwordPolicy.requireDigit ? (
										<Tag color="green">{t('common.yes')}</Tag>
									) : (
										<Tag color="default">{t('common.no')}</Tag>
									)
								) : (
									'-'
								)}
							</Descriptions.Item>
							<Descriptions.Item label={t('usersProfile.requireSpecialChar')}>
								{passwordPolicy.requireSpecial != null ? (
									passwordPolicy.requireSpecial ? (
										<Tag color="green">{t('common.yes')}</Tag>
									) : (
										<Tag color="default">{t('common.no')}</Tag>
									)
								) : (
									'-'
								)}
							</Descriptions.Item>
							<Descriptions.Item label={t('usersProfile.maxAgeDays')}>
								{passwordPolicy.expiryDays ?? '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('usersProfile.maxFailedAttempts')}>
								{securityStatus.maxAttempts ?? '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('usersProfile.lockoutDurationMin')}>
								{securityStatus.lockoutDurationMinutes ?? '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('usersProfile.passwordHistoryCount')}>
								{passwordPolicy.historyCount ?? '-'}
							</Descriptions.Item>
						</Descriptions>
					</Card>
				</Col>
			</Row>
		</div>
	);
}
