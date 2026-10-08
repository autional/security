'use client';

import React, { useState } from 'react';
import { DataTable } from '@autional/ui/antd';
import type { DataTableColumns } from '@autional/ui/antd';
import { Alert, AppPageHeader } from '@autional/ui';
import { Card, Button, Tag, Spin, Empty, Space, Row, Col, Statistic, Input, Tabs, Descriptions, Tooltip, Typography } from 'antd';
import {
	BadgeCheck,
	CheckCircle2,
	FileSearch,
	Network,
	RefreshCw,
	XCircle,
} from 'lucide-react';

import dayjs from 'dayjs';
import { useAuth } from '@autional/shared';
import {
	useHashChain,
	useMerkleRoot,
	useMerkleProof,
} from '@/hooks/use-security-queries';
import type { HashChainSnapshot } from '@/hooks/use-security-queries';
import { message } from '@/lib/antd-app';
import { useTranslation } from 'react-i18next';
import { verifyMerkleProof } from '@/lib/merkle';

// 契约对齐 dto.MerkleProofResponse（响应经 shared 客户端解包 + camel 化）
interface MerkleProofResult {
	tenantId?: string;
	entryId?: string;
	leafHash?: string;
	proof?: string[];
	rootHash?: string;
	leafIndex?: number;
	leafCount?: number;
}

type MerkleVerifyState = 'pass' | 'fail' | 'unavailable';

// A1/S-01（2026-10-04）：本页只呈现当前租户的链快照；
// 全平台聚合视图（GET /verifications）为平台面端点，租户面不再调取。
export default function HashChainPage() {
	const { t } = useTranslation();
	const { currentTenantId } = useAuth();
	const [activeTab, setActiveTab] = useState('hashchain');
	const [merkleProofId, setMerkleProofId] = useState('');
	const [merkleProofResult, setMerkleProofResult] = useState<MerkleProofResult | null>(null);
	const [merkleVerify, setMerkleVerify] = useState<MerkleVerifyState | null>(null);
	const [computedRoot, setComputedRoot] = useState('');

	const { data: chain, isLoading, isFetching, refetch } = useHashChain(currentTenantId);
	const { data: merkleRoot, isLoading: merkleLoading, refetch: refetchMerkle } = useMerkleRoot();
	const proofMutation = useMerkleProof();

	const chainRows: HashChainSnapshot[] = chain ? [chain] : [];

	const handleRefresh = async () => {
		const res = await refetch();
		if (res.isError) {
			message.error(t('hashChain.verifyFailed'));
			return;
		}
		message.success(t('hashChain.refreshDone'));
	};

	const fetchMerkleRoot = async () => {
		try {
			await refetchMerkle();
		} catch {
			message.error(t('hashChain.merkleRootError'));
		}
	};

	const fetchMerkleProof = async () => {
		if (!merkleProofId.trim()) {
			message.warning(t('hashChain.merkleProofInputWarning'));
			return;
		}
		if (!currentTenantId) {
			message.warning(t('hashChain.tenantMissing'));
			return;
		}
		try {
			const res = (await proofMutation.mutateAsync({
				tenantId: currentTenantId,
				entryId: merkleProofId.trim(),
			})) as MerkleProofResult | undefined;
			// S-24：浏览器本地折叠重算（SHA-256）比对根哈希——展示前完成，避免中间态闪烁
			let state: MerkleVerifyState = 'unavailable';
			let root = '';
			try {
				const r = await verifyMerkleProof(res?.leafHash ?? '', res?.proof ?? [], res?.rootHash ?? '');
				state = r.ok ? 'pass' : 'fail';
				root = r.computedRoot;
			} catch {
				/* WebCrypto 不可用（非安全上下文）→ 降级展示 */
			}
			setMerkleProofResult(res ?? null);
			setMerkleVerify(state);
			setComputedRoot(root);
			message.success(t('hashChain.merkleProofSuccess'));
		} catch {
			setMerkleProofResult(null);
			setMerkleVerify(null);
			setComputedRoot('');
			message.error(t('hashChain.merkleProofError'));
		}
	};

	const columns: DataTableColumns<HashChainSnapshot> = [
		{ title: t('hashChain.columnTenantId'), dataIndex: 'tenantId', width: 200, ellipsis: true },
		{
			title: t('hashChain.columnChainId'),
			dataIndex: 'chainId',
			width: 180,
			ellipsis: true,
			render: (v?: string) => v || '-',
		},
		{
			title: t('hashChain.columnStatus'),
			dataIndex: 'isValid',
			width: 120,
			render: (v?: boolean) =>
				v === undefined ? (
					'-'
				) : v ? (
					<Tag color="success" icon={<CheckCircle2 size="1em" />}>
						{t('hashChain.statusValid')}
					</Tag>
				) : (
					<Tag color="error" icon={<XCircle size="1em" />}>
						{t('hashChain.statusAbnormal')}
					</Tag>
				),
		},
		{
			title: t('hashChain.statLogCount'),
			dataIndex: 'logCount',
			width: 120,
			render: (v?: number) => v ?? '-',
		},
		{
			title: t('hashChain.columnLastHash'),
			dataIndex: 'endHash',
			ellipsis: true,
			render: (v?: string) => v || '-',
		},
		{
			title: t('hashChain.columnValidatedAt'),
			dataIndex: 'verifiedAt',
			width: 180,
			render: (v?: number) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
		},
		{
			title: t('hashChain.columnErrorMessage'),
			dataIndex: 'message',
			render: (v?: string) => (v ? <span className="text-danger-text">{v}</span> : '-'),
		},
	];

	const hashChainTab = (
		<div>
			{chain?.isValid === false && (
				<Alert
					variant="danger"
					title={t('hashChain.alertBroken')}
					className="mb-4"
				>
					{chain.message}
				</Alert>
			)}

			<Row gutter={[16, 16]} className="mb-4">
				<Col xs={24} sm={8}>
					<Card>
						<Statistic
							title={t('hashChain.statChainState')}
							value={
								chain?.isValid === undefined
									? '-'
									: chain.isValid
										? t('hashChain.statusValid')
										: t('hashChain.statusAbnormal')
							}
							prefix={
								chain?.isValid === false ? (
									<XCircle size="1em" className="text-danger" />
								) : (
									<CheckCircle2 size="1em" className="text-success" />
								)
							}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={8}>
					<Card>
						<Statistic
							title={t('hashChain.statLogCount')}
							value={chain?.logCount ?? '-'}
							prefix={<BadgeCheck size="1em" className="text-info" />}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={8}>
					<Card>
						<Statistic
							title={t('hashChain.statVerifiedAt')}
							value={
								chain?.verifiedAt ? dayjs(chain.verifiedAt).format('YYYY-MM-DD HH:mm:ss') : '-'
							}
						/>
					</Card>
				</Col>
			</Row>

			<Card className="mb-4">
				<Space>
					<Typography.Text type="secondary">
						{t('hashChain.currentTenant', { tenant: currentTenantId || '-' })}
					</Typography.Text>
					<Button icon={<RefreshCw size="1em" />} loading={isFetching} onClick={handleRefresh}>
						{t('hashChain.refreshBtn')}
					</Button>
				</Space>
			</Card>

			<Spin spinning={isLoading}>
				<DataTable
					columns={columns}
					dataSource={chainRows}
					rowKey="tenantId"
					pagination={false}
					locale={{ emptyText: <Empty description={t('hashChain.empty')} /> }}
				/>
			</Spin>
		</div>
	);

	const merkleTab = (
		<div>
			<Row gutter={[16, 16]} className="mb-4">
				<Col xs={24} lg={12}>
					<Card
						title={t('hashChain.merkleRootTitle')}
						extra={
							<Button icon={<RefreshCw size="1em" />} loading={merkleLoading} onClick={fetchMerkleRoot}>
								{t('hashChain.merkleFetchBtn')}
							</Button>
						}
					>
						<Typography.Paragraph copyable className="font-mono text-sm break-all">
							{merkleRoot || t('hashChain.merkleRootPlaceholder')}
						</Typography.Paragraph>
					</Card>
				</Col>
				<Col xs={24} lg={12}>
					<Card title={t('hashChain.merkleProofTitle')}>
						<Space direction="vertical" className="w-full">
							<Input
								placeholder={t('hashChain.merkleProofInputPlaceholder')}
								value={merkleProofId}
								onChange={(e) => setMerkleProofId(e.target.value)}
							/>
							<Button
								type="primary"
								icon={<FileSearch size="1em" />}
								loading={proofMutation.isPending}
								onClick={fetchMerkleProof}
							>
								{t('hashChain.merkleProofBtn')}
							</Button>
						</Space>
						{merkleProofResult && (
							<Descriptions column={1} bordered className="mt-4" size="small">
								<Descriptions.Item label={t('hashChain.merkleProofLogId')}>
									{/* S-24：原读 logId（BE 实际回 entryId）→ 恒空回落输入值，已修正 */}
									<span className="font-mono break-all">
										{merkleProofResult.entryId || merkleProofId}
									</span>
								</Descriptions.Item>
								<Descriptions.Item label={t('hashChain.merkleProofRootHash')}>
									<span className="font-mono break-all">{merkleProofResult.rootHash || '-'}</span>
								</Descriptions.Item>
								<Descriptions.Item label={t('hashChain.merkleProofLeafHash')}>
									<span className="font-mono break-all">{merkleProofResult.leafHash || '-'}</span>
								</Descriptions.Item>
								<Descriptions.Item label={t('hashChain.merkleProofLeafPosition')}>
									{merkleProofResult.leafIndex !== undefined &&
									merkleProofResult.leafCount !== undefined
										? `${merkleProofResult.leafIndex} / ${merkleProofResult.leafCount}`
										: '-'}
								</Descriptions.Item>
								<Descriptions.Item label={t('hashChain.merkleProofComputedRoot')}>
									<span className="font-mono break-all">{computedRoot || '-'}</span>
								</Descriptions.Item>
								<Descriptions.Item label={t('hashChain.merkleProofResult')}>
									{merkleVerify === 'pass' ? (
										<Tag color="success">{t('hashChain.merkleProofPassed')}</Tag>
									) : merkleVerify === 'fail' ? (
										<Tag color="error">{t('hashChain.merkleProofFailed')}</Tag>
									) : merkleVerify === 'unavailable' ? (
										<Tooltip title={t('hashChain.merkleProofUnavailable')}>
											<Tag>—</Tag>
										</Tooltip>
									) : (
										'-'
									)}
								</Descriptions.Item>
							</Descriptions>
						)}
					</Card>
				</Col>
			</Row>

			<Alert
				variant="info"
				title={t('hashChain.merkleAlertTitle')}
				icon={<Network size="1em" />}
			>
				{t('hashChain.merkleAlertDescription')}
			</Alert>
		</div>
	);

	return (
		<div>
			<AppPageHeader title={t('hashChain.title')} />

			<Tabs
				activeKey={activeTab}
				onChange={setActiveTab}
				items={[
					{ key: 'hashchain', label: t('hashChain.hashChainTab'), children: hashChainTab },
					{ key: 'merkle', label: t('hashChain.merkleTab'), children: merkleTab },
				]}
			/>
		</div>
	);
}
