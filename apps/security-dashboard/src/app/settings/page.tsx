'use client';

import React, { useState } from 'react';
import { DataTable } from '@autional/ui/antd';
import type { DataTableColumns } from '@autional/ui/antd';
import { Card, Form, Input, Button, Switch, Select, Skeleton, Tabs, Space, Tag, Modal, Spin, Descriptions, Badge, Empty } from 'antd';
import {
	Database,
	Pencil,
	Plug,
	Plus,
	Save,
	Settings,
	Trash2,
} from 'lucide-react';

import dayjs from 'dayjs';
import {
	useRetentionPolicy,
	useUpdateRetentionPolicy,
	useSiemConnectors,
	useCreateSiemConnector,
	useUpdateSiemConnector,
	useDeleteSiemConnector,
	useTestSiemConnector,
} from '@/hooks/use-security-queries';
import { message, modal } from '@/lib/antd-app';
import { useTranslation } from 'react-i18next';
import { AuditStatsOnly } from '@autional/shared';
import { Alert, ConsolePageHeader, useTheme } from '@autional/ui';
import { Can } from '@/components/Can';
import type {
	RetentionPolicyResponse,
	SIEMConnectorResponse,
	SIEMConnectorRequest,
} from '@autional/shared/generated/types';

const STORAGE_KEY = 'security-dashboard-settings';
// 与 main.tsx <ThemeProvider storageKey> 同名：settings 的主题选择直写该键并即时翻转 ui 主题系统。
const THEME_STORAGE_KEY = 'security-dashboard-theme';

const defaultLocalValues = {
	emailAlert: false,
	smsAlert: false,
	webhookUrl: '',
	theme: 'light',
};

function loadLocalSettings(): typeof defaultLocalValues {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return { ...defaultLocalValues, ...JSON.parse(raw) };
	} catch {
		/* ignore */
	}
	return defaultLocalValues;
}

function saveLocalSettings(values: typeof defaultLocalValues) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
}

// 主题偏好接线：light/dark 直写主题键并按需翻转；system 清键、运行时按系统偏好取值。
// 翻转经 ui useTheme().toggle（AntdThemeProvider 订阅同一 context，antd 算法即时跟进）。
function applyThemePreference(
	pref: string,
	activeTheme: 'light' | 'dark',
	toggle: () => void,
) {
	const prefersDark =
		typeof window !== 'undefined' &&
		window.matchMedia('(prefers-color-scheme: dark)').matches;
	const target: 'light' | 'dark' =
		pref === 'system' ? (prefersDark ? 'dark' : 'light') : pref === 'dark' ? 'dark' : 'light';
	if (activeTheme !== target) toggle();
	try {
		if (pref === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
		else localStorage.setItem(THEME_STORAGE_KEY, target);
	} catch {
		/* 存储不可用：本次已生效，仅不持久化 */
	}
}

function LocalSettingsTab() {
	const { t } = useTranslation();
	const [form] = Form.useForm();
	const [saving, setSaving] = useState(false);
	const { theme: activeTheme, toggle } = useTheme();

	React.useEffect(() => {
		let hasSaved = false;
		try {
			hasSaved = localStorage.getItem(STORAGE_KEY) !== null;
		} catch {
			/* ignore */
		}
		// 首次（无存档）回填当前生效主题，避免展示与真实主题不符
		const initial = loadLocalSettings();
		form.setFieldsValue(hasSaved ? initial : { ...initial, theme: activeTheme });
	}, [form, activeTheme]);

	const handleSave = async (values: typeof defaultLocalValues) => {
		setSaving(true);
		try {
			saveLocalSettings(values);
			applyThemePreference(values.theme, activeTheme, toggle);
			message.success(t('settings.saved'));
		} catch {
			message.error(t('settings.saveFailed'));
		} finally {
			setSaving(false);
		}
	};

	return (
		<Form form={form} layout="vertical" onFinish={handleSave}>
			<Card title={t('settings.alertNotification')} className="mb-4">
				<Alert
					variant="info"
					title={t('settings.localOnlyHint')}
					className="mb-4"
				 />
				<Form.Item name="emailAlert" label={t('settings.emailAlert')} valuePropName="checked">
					<Switch />
				</Form.Item>
				<Form.Item name="smsAlert" label={t('settings.smsAlert')} valuePropName="checked">
					<Switch />
				</Form.Item>
				<Form.Item name="webhookUrl" label={t('settings.webhook')}>
					<Input placeholder="https://hooks.example.com/security" />
				</Form.Item>
			</Card>
			<Card title={t('settings.appearance')} className="mb-4">
				<Form.Item name="theme" label={t('settings.theme')}>
					<Select
						options={[
							{ label: t('settings.themeLight'), value: 'light' },
							{ label: t('settings.themeDark'), value: 'dark' },
							{ label: t('settings.themeSystem'), value: 'system' },
						]}
					/>
				</Form.Item>
			</Card>
			<div className="flex justify-end">
				<Button type="primary" icon={<Save size="1em" />} loading={saving} htmlType="submit">
					{t('settings.saveLocal')}
				</Button>
			</div>
		</Form>
	);
}

function RetentionPolicyTab() {
	const { t } = useTranslation();
	const { data: policy, isLoading } = useRetentionPolicy();
	const [saving, setSaving] = useState(false);
	const [editVisible, setEditVisible] = useState(false);
	const [editForm] = Form.useForm();
	const updateMutation = useUpdateRetentionPolicy();

	const handleSave = async (values: any) => {
		setSaving(true);
		try {
			await updateMutation.mutateAsync({
				days: Number(values.days),
				enabled: values.enabled,
				archiveTo: values.archiveTo,
				bucket: values.bucket,
			});
			message.success(t('settings.updatedRetention'));
			setEditVisible(false);
		} catch {
			message.error(t('settings.updateRetentionFailed'));
		} finally {
			setSaving(false);
		}
	};

	const openEdit = () => {
		if (!policy) return;
		editForm.setFieldsValue({
			days: (policy as any).days,
			enabled: (policy as any).enabled,
			archiveTo: (policy as any).archiveTo,
			bucket: (policy as any).bucket,
		});
		setEditVisible(true);
	};

	return (
		<Spin spinning={isLoading}>
			{policy ? (
				<>
					<Card
						title={t('settings.currentRetention')}
						extra={
							<Button icon={<Pencil size="1em" />} onClick={openEdit}>
								{t('settings.edit')}
							</Button>
						}
					>
						<Descriptions bordered column={1} size="small">
							<Descriptions.Item label={t('settings.retentionDays')}>
								{(policy as any).days} {t('settings.days')}
							</Descriptions.Item>
							<Descriptions.Item label={t('settings.autoArchive')}>
								{(policy as any).enabled ? (
									<Badge status="success" text={t('settings.enabled')} />
								) : (
									<Badge status="default" text={t('settings.disabled')} />
								)}
							</Descriptions.Item>
							<Descriptions.Item label={t('settings.archiveTarget')}>
								{(policy as any).archiveTo || '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('settings.bucket')}>
								{(policy as any).bucket || '-'}
							</Descriptions.Item>
							<Descriptions.Item label={t('settings.tenantId')}>
								{(policy as any).tenantId || '-'}
							</Descriptions.Item>
						</Descriptions>
					</Card>

					<Modal
						title={t('settings.editRetention')}
						open={editVisible}
						onCancel={() => setEditVisible(false)}
						onOk={() => editForm.submit()}
						confirmLoading={saving}
					>
						<Form form={editForm} layout="vertical" onFinish={handleSave}>
							<Form.Item
								name="days"
								label={t('settings.retentionDays')}
								rules={[{ required: true }]}
							>
								<Input type="number" suffix={t('settings.days')} />
							</Form.Item>
							<Form.Item
								name="enabled"
								label={t('settings.enableAutoArchive')}
								valuePropName="checked"
							>
								<Switch />
							</Form.Item>
							<Form.Item name="archiveTo" label={t('settings.archiveTarget')}>
								<Select
									options={[
										{ label: t('settings.minio'), value: 'minio' },
										{ label: 'COS', value: 'cos' },
										{ label: 'OSS', value: 'oss' },
									]}
								/>
							</Form.Item>
							<Form.Item name="bucket" label={t('settings.bucket')}>
								<Input placeholder={t('settings.bucketPlaceholder')} />
							</Form.Item>
						</Form>
					</Modal>
				</>
			) : (
				<Empty description={t('settings.noRetention')} />
			)}
		</Spin>
	);
}

function SiemConnectorsTab() {
	const { t } = useTranslation();
	const { data: connectors = [], isLoading } = useSiemConnectors();
	const [modalVisible, setModalVisible] = useState(false);
	const [modalForm] = Form.useForm();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [testingId, setTestingId] = useState<string | null>(null);

	const createMutation = useCreateSiemConnector();
	const updateMutation = useUpdateSiemConnector();
	const deleteMutation = useDeleteSiemConnector();
	const testMutation = useTestSiemConnector();

	const handleSubmit = async (values: any) => {
		setSubmitting(true);
		try {
			const req: SIEMConnectorRequest = {
				name: values.name,
				endpoint: values.endpoint,
				type: values.type,
				enabled: values.enabled,
				index: values.index,
				apiKey: values.apiKey,
			};
			if (editingId) {
				await updateMutation.mutateAsync({ id: editingId, data: req });
				message.success(t('settings.connectorUpdated'));
			} else {
				await createMutation.mutateAsync(req);
				message.success(t('settings.connectorCreated'));
			}
			setModalVisible(false);
			modalForm.resetFields();
			setEditingId(null);
		} catch {
			message.error(
				editingId ? t('settings.connectorUpdateFailed') : t('settings.connectorCreateFailed'),
			);
		} finally {
			setSubmitting(false);
		}
	};

	// S-65②（2026-10-04）：删除连接器为破坏性写操作，先弹确认（对齐 sessions 终止会话正例）
	const handleDelete = (record: SIEMConnectorResponse) => {
		const id = record.id;
		if (!id) return;
		modal.confirm({
			title: t('settings.confirmDeleteTitle'),
			content: t('settings.confirmDeleteContent', { name: record.name || id }),
			okText: t('common.delete'),
			okType: 'danger',
			cancelText: t('common.cancel'),
			onOk: async () => {
				try {
					await deleteMutation.mutateAsync(id);
					message.success(t('settings.connectorDeleted'));
				} catch {
					message.error(t('settings.connectorDeleteFailed'));
				}
			},
		});
	};

	const handleTest = async (id: string) => {
		setTestingId(id);
		try {
			const res = await testMutation.mutateAsync(id);
			message.success(
				t('settings.testResult', {
					status:
						(res as any)?.testStatus === 'passed'
							? t('settings.testPassed')
							: (res as any)?.testStatus,
				}),
			);
		} catch {
			message.error(t('settings.testFailed'));
		} finally {
			setTestingId(null);
		}
	};

	const openCreate = () => {
		setEditingId(null);
		modalForm.resetFields();
		setModalVisible(true);
	};

	const openEdit = (conn: SIEMConnectorResponse) => {
		setEditingId(conn.id || null);
		modalForm.setFieldsValue({
			name: conn.name,
			endpoint: conn.endpoint,
			type: conn.type,
			enabled: conn.enabled,
			index: conn.index,
			apiKey: conn.config?.apiKey as string,
		});
		setModalVisible(true);
	};

	const columns: DataTableColumns<SIEMConnectorResponse> = [
		{ title: t('settings.connectorName'), dataIndex: 'name' },
		{
			title: t('settings.connectorType'),
			dataIndex: 'type',
			width: 100,
			render: (v: string) => <Tag>{v?.toUpperCase()}</Tag>,
		},
		{ title: t('settings.connectorEndpoint'), dataIndex: 'endpoint', ellipsis: true },
		{
			title: t('anomalies.columnStatus'),
			dataIndex: 'enabled',
			width: 80,
			render: (v: boolean) => (
				<Badge
					status={v ? 'success' : 'default'}
					text={v ? t('common.enable') : t('common.disable')}
				/>
			),
		},
		{
			title: t('settings.test'),
			dataIndex: 'testStatus',
			width: 100,
			render: (v?: string) =>
				v === 'passed' ? (
					<Tag color="success">{t('settings.testPassed')}</Tag>
				) : v ? (
					<Tag color="warning">{v}</Tag>
				) : (
					'-'
				),
		},
		{
			title: t('common.actions'),
			width: 200,
			render: (_: any, record: SIEMConnectorResponse) => (
				<Space size="small">
					<Button size="small" icon={<Pencil size="1em" />} onClick={() => openEdit(record)}>
						{t('settings.edit')}
					</Button>
					<Button
						size="small"
						loading={testingId === record.id}
						onClick={() => record.id && handleTest(record.id)}
					>
						{t('settings.test')}
					</Button>
					<Button
						size="small"
						danger
						icon={<Trash2 size="1em" />}
						onClick={() => handleDelete(record)}
					>
						{t('common.delete')}
					</Button>
				</Space>
			),
		},
	];

	return (
		<div>
			<div className="flex justify-end mb-4">
				<Button type="primary" icon={<Plus size="1em" />} onClick={openCreate}>
					{t('settings.newConnector')}
				</Button>
			</div>
			<Spin spinning={isLoading}>
				<DataTable
					columns={columns}
					dataSource={connectors as SIEMConnectorResponse[]}
					rowKey="id"
					pagination={{ pageSize: 10 }}
					locale={{ emptyText: <Empty description={t('settings.siemEmpty')} /> }}
				/>
			</Spin>

			<Modal
				title={editingId ? t('settings.editConnector') : t('settings.newConnectorTitle')}
				open={modalVisible}
				onCancel={() => setModalVisible(false)}
				onOk={() => modalForm.submit()}
				confirmLoading={submitting}
			>
				<Form form={modalForm} layout="vertical" onFinish={handleSubmit}>
					<Form.Item name="name" label={t('settings.connectorName')} rules={[{ required: true }]}>
						<Input placeholder="Splunk-Prod" />
					</Form.Item>
					<Form.Item
						name="type"
						label={t('settings.connectorType')}
						rules={[{ required: true }]}
						initialValue="splunk"
					>
						<Select
							options={[
								{ label: 'Splunk', value: 'splunk' },
								{ label: 'ELK', value: 'elk' },
								{ label: 'CEF', value: 'cef' },
							]}
						/>
					</Form.Item>
					<Form.Item
						name="endpoint"
						label={t('settings.connectorEndpoint')}
						rules={[{ required: true }]}
					>
						<Input placeholder="https://splunk.example.com:8088" />
					</Form.Item>
					<Form.Item name="index" label={t('settings.connectorIndex')}>
						<Input placeholder="main" />
					</Form.Item>
					<Form.Item name="apiKey" label={t('settings.connectorApiKey')}>
						<Input.Password placeholder="tok-xxx" />
					</Form.Item>
					<Form.Item
						name="enabled"
						label={t('settings.connectorEnabled')}
						valuePropName="checked"
						initialValue={true}
					>
						<Switch />
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
}

export default function SettingsPage() {
	const { t } = useTranslation();
	const [activeTab, setActiveTab] = useState('local');

	const tabItems = [
		{
			key: 'local',
			label: (
				<span>
					<Settings size="1em" /> {t('settings.local')}
				</span>
			),
			children: <LocalSettingsTab />,
		},
		{
			key: 'retention',
			label: (
				<span>
					<Database size="1em" /> {t('settings.dataRetention')}
				</span>
			),
			children: (
				<Can
					denyAuditor
					fallback={
						<AuditStatsOnly
							title={t('settings.retentionPolicy')}
							description={t('settings.adminOnly')}
						/>
					}
				>
					<RetentionPolicyTab />
				</Can>
			),
		},
		{
			key: 'siem',
			label: (
				<span>
					<Plug size="1em" /> {t('settings.siemConnectors')}
				</span>
			),
			children: (
				<Can
					denyAuditor
					fallback={
						<AuditStatsOnly
							title={t('settings.siemConnectors')}
							description={t('settings.adminOnly')}
						/>
					}
				>
					<SiemConnectorsTab />
				</Can>
			),
		},
	];

	return (
		<div>
			<ConsolePageHeader title={t('settings.title')} />
			<Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
		</div>
	);
}
