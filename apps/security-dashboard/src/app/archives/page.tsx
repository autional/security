'use client';

import React, { useState } from 'react';
import { Card, Button, Space, message, Typography, Row, Col, Statistic, Modal, Form, DatePicker, Timeline } from 'antd';
import {
	FileArchive,
	History,
	Play,
	RefreshCw,
	ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@autional/shared';
import { useArchiveStatus, useTriggerArchive, useHashChain } from '@/hooks/use-security-queries';
import { useTranslation } from 'react-i18next';
import { Alert } from '@autional/ui';
import { Can } from '@/components/Can';

const { Title, Text } = Typography;

export default function ArchivesPage() {
	const { t } = useTranslation();

	const [modalVisible, setModalVisible] = useState(false);
	const [triggerLoading, setTriggerLoading] = useState(false);

	const { currentTenantId } = useAuth();
	// S-59（2026-10-04）：归档域无批次列表端点，只渲染状态端点（enabled/days/last_archive）。
	const { data: archiveStatus } = useArchiveStatus();
	// A1/S-01（2026-10-04）：链快照改本租户端点，不再消费全平台验证列表。
	const { data: chain } = useHashChain(currentTenantId);
	const triggerMutation = useTriggerArchive();

	const handleTriggerArchive = async (values: any) => {
		setTriggerLoading(true);
		try {
			// S-62（2026-10-04）：BE dto.ArchiveRequest.Before 为 Unix 秒（json:"before"）。
			// 旧实现发 {before_date:"YYYY-MM-DD"} —— 键名+类型双失配 ⇒ Before=0 ⇒ 恒按
			// 保留策略默认窗口（当前−90 天）归档，与所选日期无关。
			const before: number = values.beforeDate.unix();
			await triggerMutation.mutateAsync({ before });
			message.success(t('archives.triggerSuccess'));
			setModalVisible(false);
		} catch (err: any) {
			message.error(err?.message || t('archives.triggerFailed'));
		} finally {
			setTriggerLoading(false);
		}
	};

	return (
		<Can denyAuditor>
			<div>
				<Title level={3}>{t('archives.title')}</Title>
				<Text type="secondary">{t('archives.subtitle')}</Text>

				<Row gutter={16} className="mt-4 mb-4">
					<Col span={6}>
						<Card>
							<Statistic
								title={t('archives.statEnabled')}
								value={
									archiveStatus
										? archiveStatus.enabled
											? t('archives.enabled')
											: t('archives.disabled')
										: '-'
								}
								valueStyle={
									archiveStatus
										? {
												color: archiveStatus.enabled
													? 'var(--color-success)'
													: 'var(--color-warning)',
											}
										: undefined
								}
								prefix={<FileArchive size="1em" />}
							/>
						</Card>
					</Col>
					<Col span={6}>
						<Card>
							<Statistic
								title={t('archives.statRetentionDays')}
								value={archiveStatus?.days ?? '-'}
								suffix={archiveStatus ? t('archives.daysUnit') : undefined}
								prefix={<History size="1em" />}
							/>
						</Card>
					</Col>
					<Col span={6}>
						<Card>
							<Statistic
								title={t('archives.statLastArchive')}
								value={
									!archiveStatus
										? '-'
										: typeof archiveStatus.lastArchive === 'number' && archiveStatus.lastArchive > 0
											? new Date(archiveStatus.lastArchive).toLocaleString()
											: t('archives.neverArchived')
								}
								prefix={<RefreshCw size="1em" />}
							/>
						</Card>
					</Col>
					<Col span={6}>
						<Card>
							<Statistic
								title={t('archives.statVerificationPassed')}
								value={chain?.isValid === undefined ? '-' : chain.isValid ? 1 : 0}
								valueStyle={{ color: 'var(--color-success)' }}
								prefix={<ShieldCheck size="1em" />}
							/>
						</Card>
					</Col>
				</Row>

				<Alert
					variant="info"
					title={t('archives.alertTitle')}
					className="mb-4"
					action={
						<Button
							type="primary"
							icon={<Play size="1em" />}
							onClick={() => setModalVisible(true)}
						>
							{t('archives.triggerArchive')}
						</Button>
					}
				>
					{t('archives.alertDescription')}
				</Alert>

				{chain && (
					<Card title={t('archives.recentVerifications')} className="mt-4">
						<Timeline
							items={[
								{
									color: chain.isValid === false ? 'red' : 'green',
									children: (
										<div>
											<Text strong>
												{chain.isValid === false
													? t('archives.verificationFailed')
													: t('archives.verificationPassed')}
											</Text>
											<div className="text-xs text-neutral-600">
												{chain.verifiedAt
													? new Date(chain.verifiedAt).toLocaleString()
													: '-'}{' '}
												· {t('archives.columnTenantId')}{' '}
												{chain.tenantId || currentTenantId || '-'}
											</div>
											{chain.message && (
												<div className="text-xs mt-1">{chain.message}</div>
											)}
										</div>
									),
								},
							]}
						/>
					</Card>
				)}

				<Modal
					title={t('archives.triggerModalTitle')}
					open={modalVisible}
					onCancel={() => setModalVisible(false)}
					footer={null}
				>
					<Form layout="vertical" onFinish={handleTriggerArchive}>
						<Form.Item
							name="beforeDate"
							label={t('archives.triggerDateLabel')}
							rules={[{ required: true, message: t('archives.triggerDateRequired') }]}
						>
							<DatePicker
								style={{ width: '100%' }}
								placeholder={t('archives.triggerDatePlaceholder')}
							/>
						</Form.Item>
						<Form.Item>
							<Space>
								<Button
									type="primary"
									htmlType="submit"
									loading={triggerLoading}
									icon={<Play size="1em" />}
								>
									{t('archives.confirmTrigger')}
								</Button>
								<Button onClick={() => setModalVisible(false)}>{t('common.cancel')}</Button>
							</Space>
						</Form.Item>
					</Form>
				</Modal>
			</div>
		</Can>
	);
}
