import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@autional/shared';
import { adminSessions, adminUsers } from '@autional/shared/generated/api';
import {
	getActiveSessionCount,
	terminateSession,
	getAnomalies,
	updateAnomalyStatus,
	getSecurityReport,
	getComplianceReport,
	getDSARs,
	getDSARById,
	getDSARStatus,
	updateDSAR,
	getBreachNotifications,
	updateBreachNotification,
	getEvidence,
	getEvidenceById,
	getArchiveStatus,
	triggerArchive,
	getAuditFindings,
	getAuditFindingById,
	updateAuditFinding,
	getExportJobs,
	downloadExport,
	getComplianceSelfScore,
	getAdminComplianceStatusRaw,
	getRetentionPolicies,
	getISOControls,
	getSOXControls,
	getPenTestReports,
	getHashChain,
	getMerkleRoot,
	getMerkleProof,
	getRetentionPolicy,
	updateRetentionPolicyAdmin,
	getSiemConnectors,
	createSiemConnector,
	updateSiemConnector,
	deleteSiemConnector,
	testSiemConnector,
	getAlerts,
	getAlertById,
	assignAlert,
	updateAlertStatus,
	getAdminAgents,
	getAdminRobots,
	getAdminIots,
	getAuditStats,
	createAgent,
	getAgentById,
	deleteAgent,
	createRobot,
	getRobotById,
	deleteRobot,
	commissionRobot,
	decommissionRobot,
	createDevice,
	getDeviceById,
	deleteDevice,
} from '@/lib/api.generated';

// ============================================================
// Sessions
// ============================================================
export function useSessions(params: { page?: number; pageSize?: number; keyword?: string }) {
	const { page = 1, pageSize = 20, keyword } = params;
	return useQuery({
		queryKey: ['sessions', { page, pageSize, keyword }],
		queryFn: () => adminSessions({ page, page_size: pageSize, user_id: keyword || undefined }),
		staleTime: 10_000,
	});
}

export function useActiveSessions() {
	return useQuery({
		queryKey: ['sessions', 'active-count'],
		queryFn: getActiveSessionCount,
	});
}

export function useTerminateSession() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id }: { id: string }) => terminateSession(id, {}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['sessions'] });
		},
	});
}

// ============================================================
// Anomalies
// ============================================================
export function useAnomalies(params: {
	page?: number;
	pageSize?: number;
	filters?: Record<string, any>;
}) {
	const { page = 1, pageSize = 20, filters = {} } = params;
	return useQuery({
		queryKey: ['anomalies', { page, pageSize, filters }],
		queryFn: () => getAnomalies({ page, page_size: pageSize, ...filters }),
		staleTime: 10_000,
	});
}

export function useUpdateAnomalyStatus() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, status }: { id: string; status: string }) =>
			updateAnomalyStatus(id, { status }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['anomalies'] }),
	});
}

// 分配分析师选择器数据源（identity 管理面用户列表，网关 required_roles 含 security_admin）
export function useAdminUsers(search: string, enabled = true) {
	return useQuery({
		queryKey: ['admin-users', search],
		queryFn: () => adminUsers({ search: search || undefined, page: 1, limit: 20 }),
		staleTime: 30_000,
		enabled,
	});
}

// ============================================================
// Reports
// ============================================================
export function useSecurityReport(period: string) {
	return useQuery({
		queryKey: ['reports', 'security', period],
		queryFn: () => getSecurityReport({ period }),
		staleTime: 60_000,
	});
}

export function useComplianceReport(standard: string, period: string) {
	return useQuery({
		queryKey: ['reports', 'compliance', standard, period],
		queryFn: () => getComplianceReport({ standard, period }),
		staleTime: 60_000,
	});
}

// ============================================================
// DSARs
// ============================================================
export function useDSARs(params: {
	page?: number;
	pageSize?: number;
	status?: string;
	type?: string;
}) {
	const { page = 1, pageSize = 10, status, type } = params;
	return useQuery({
		queryKey: ['dsars', { page, pageSize, status, type }],
		queryFn: () => getDSARs({ page, page_size: pageSize, status, type } as any),
		staleTime: 10_000,
	});
}

export function useDSARDetail(id: string | null) {
	return useQuery({
		queryKey: ['dsar', id],
		queryFn: async () => {
			// 共享客户端已解包信封，直接使用响应载荷（勿再取 .data）
			const [detail, status] = await Promise.all([getDSARById(id!), getDSARStatus(id!)]);
			return { detail, status };
		},
		enabled: !!id,
	});
}

export function useUpdateDSAR() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: any }) => updateDSAR(id, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['dsars'] }),
	});
}

// ============================================================
// Breaches
// ============================================================
export function useBreachNotifications(params: {
	page?: number;
	pageSize?: number;
	status?: string;
	severity?: string;
}) {
	const { page = 1, pageSize = 10, status, severity } = params;
	return useQuery({
		queryKey: ['breaches', { page, pageSize, status, severity }],
		queryFn: () => getBreachNotifications({ page, pageSize, status, severity } as any),
		staleTime: 10_000,
	});
}

export function useUpdateBreach() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: any }) => updateBreachNotification(id, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['breaches'] }),
	});
}

// ============================================================
// Evidence
// ============================================================
export function useEvidence(params: { page?: number; pageSize?: number; controlType?: string }) {
	const { page = 1, pageSize = 10, controlType } = params;
	return useQuery({
		queryKey: ['evidence', { page, pageSize, controlType }],
		queryFn: () => getEvidence({ page, page_size: pageSize, control_type: controlType }),
		staleTime: 10_000,
	});
}

export function useEvidenceDetail(id: string | null) {
	return useQuery({
		queryKey: ['evidence', 'detail', id],
		queryFn: () => getEvidenceById(id!),
		enabled: !!id,
	});
}

// ============================================================
// Archives
// ============================================================
export interface ArchiveStatus {
	enabled: boolean;
	days: number;
	bucket?: string;
	lastArchive?: number;
}

export function useArchiveStatus() {
	return useQuery({
		queryKey: ['archives', 'status'],
		queryFn: async () => {
			const res: any = await getArchiveStatus();
			return (res ?? null) as ArchiveStatus | null;
		},
		staleTime: 10_000,
	});
}

export function useTriggerArchive() {
	const qc = useQueryClient();
	return useMutation({
		// BE 契约（service-audit dto.ArchiveRequest）：before 为 Unix 秒
		mutationFn: (params: { before: number }) => triggerArchive(params),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['archives'] }),
	});
}

// ============================================================
// Audit Findings
// ============================================================
export function useAuditFindings(params: {
	page?: number;
	pageSize?: number;
	status?: string;
	severity?: string;
}) {
	const { page = 1, pageSize = 10, status, severity } = params;
	return useQuery({
		queryKey: ['audit-findings', { page, pageSize, status, severity }],
		queryFn: () => getAuditFindings({ page, pageSize, status, severity } as any),
		staleTime: 10_000,
	});
}

export function useAuditFindingDetail(id: string | null) {
	return useQuery({
		queryKey: ['audit-finding', 'detail', id],
		queryFn: () => getAuditFindingById(id!),
		enabled: !!id,
	});
}

export function useUpdateAuditFinding() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: any }) => updateAuditFinding(id, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['audit-findings'] }),
	});
}

// ============================================================
// Export Jobs
// ============================================================
export function useExportJobs(params: { page?: number; pageSize?: number }) {
	const { page = 1, pageSize = 20 } = params;
	return useQuery({
		queryKey: ['export-jobs', { page, pageSize }],
		queryFn: () => getExportJobs({ page, page_size: pageSize }),
		staleTime: 10_000,
		refetchInterval: (query) => {
			const data = query.state.data as any;
			return data?.items?.some((j: any) => j.status === 'pending' || j.status === 'processing')
				? 5_000
				: false;
		},
	});
}

// useCreateExportJob 单点在 use-audit-logs.ts（S-21 导出筛选载荷类型在此统一）

export function useDownloadExport() {
	return useMutation({
		mutationFn: (jobId: string) => downloadExport(jobId),
	});
}

// ============================================================
// Compliance (multi-tab)
// ============================================================
export function useComplianceDashboard() {
	return useQuery({
		queryKey: ['compliance', 'status'],
		queryFn: getAdminComplianceStatusRaw,
		staleTime: 60_000,
	});
}

export function useComplianceSelfScore() {
	return useQuery({
		queryKey: ['compliance', 'selfScore'],
		queryFn: getComplianceSelfScore,
		staleTime: 60_000,
	});
}

export function useDSARsTab() {
	return useQuery({
		queryKey: ['compliance', 'dsars'],
		queryFn: async () => {
			const res = await getDSARs({} as any);
			return (res as any)?.items || [];
		},
		staleTime: 30_000,
	});
}

export function useRetentionPoliciesTab() {
	return useQuery({
		queryKey: ['compliance', 'retention'],
		queryFn: async () => {
			const res = await getRetentionPolicies();
			return (res as any)?.items || [];
		},
		staleTime: 30_000,
	});
}

export function useISOControlsTab() {
	return useQuery({
		queryKey: ['compliance', 'iso'],
		queryFn: async () => {
			const res = await getISOControls();
			return (res as any)?.items || [];
		},
		staleTime: 30_000,
	});
}

export function useSOXControlsTab() {
	return useQuery({
		queryKey: ['compliance', 'sox'],
		queryFn: async () => {
			const res = await getSOXControls();
			return (res as any)?.items || [];
		},
		staleTime: 30_000,
	});
}

export function usePenTestReportsTab() {
	return useQuery({
		queryKey: ['compliance', 'pentest'],
		queryFn: async () => {
			const res = await getPenTestReports();
			return (res as any)?.items || [];
		},
		staleTime: 30_000,
	});
}

// ============================================================
// Hash Chain / Merkle
// ============================================================

/** 租户级链快照（GET /admin/audit/hashchain/:tenant_id，实时校验、响应以路径租户为准）。 */
export interface HashChainSnapshot {
	tenantId?: string;
	chainId?: string;
	startHash?: string;
	endHash?: string;
	logCount?: number;
	isValid?: boolean;
	message?: string;
	verifiedAt?: number;
}

// A1/S-01（2026-10-04）：全平台验证快照端点（GET /verifications）已挂平台租户门禁，
// 租户面统一走本租户快照端点。
export function useHashChain(tenantId: string | null | undefined) {
	return useQuery({
		queryKey: ['hash-chain', tenantId],
		queryFn: async (): Promise<HashChainSnapshot> =>
			(await getHashChain(tenantId!)) as HashChainSnapshot,
		enabled: !!tenantId,
		staleTime: 10_000,
	});
}

export function useMerkleRoot() {
	return useQuery({
		queryKey: ['merkle-root'],
		queryFn: async () => {
			const res: any = await getMerkleRoot();
			return res?.rootHash || 'N/A';
		},
		enabled: false,
	});
}

export function useMerkleProof() {
	return useMutation({
		mutationFn: (params: { tenantId: string; entryId: string }) =>
			getMerkleProof({ tenant_id: params.tenantId, entry_id: params.entryId }),
	});
}

// ============================================================
// Settings
// ============================================================
export function useRetentionPolicy() {
	return useQuery({
		queryKey: ['settings', 'retention-policy'],
		queryFn: async () => {
			const res = await getRetentionPolicy();
			return res ?? null;
		},
		staleTime: 30_000,
	});
}

export function useUpdateRetentionPolicy() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: any) => updateRetentionPolicyAdmin(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'retention-policy'] }),
	});
}

export function useSiemConnectors() {
	return useQuery({
		queryKey: ['settings', 'siem-connectors'],
		queryFn: async () => {
			const res = await getSiemConnectors();
			return (res as any)?.items || [];
		},
		staleTime: 10_000,
	});
}

export function useCreateSiemConnector() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: createSiemConnector,
		onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'siem-connectors'] }),
	});
}

export function useUpdateSiemConnector() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: any }) => updateSiemConnector(id, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'siem-connectors'] }),
	});
}

export function useDeleteSiemConnector() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteSiemConnector(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'siem-connectors'] }),
	});
}

export function useTestSiemConnector() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => testSiemConnector(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'siem-connectors'] }),
	});
}

// ============ Alerts ==========

const ACTION_TO_STATUS: Record<string, string> = {
	acknowledge: 'acknowledged',
	escalate: 'escalated',
	resolve: 'resolved',
	dismiss: 'dismissed',
};

export function useAlerts(params?: Record<string, unknown>) {
	return useQuery({
		queryKey: ['alerts', params],
		queryFn: () => getAlerts(params),
		retry: 1,
	});
}

export function useAlertById(id: string) {
	return useQuery({
		queryKey: ['alerts', id],
		queryFn: () => getAlertById(id),
		enabled: !!id,
	});
}

export function useUpdateAlertStatus() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, status, comment }: { id: string; status: string; comment?: string }) => {
			const mappedStatus = ACTION_TO_STATUS[status] || status;
			const body: Record<string, unknown> = { status: mappedStatus };
			if (comment) body.comment = comment;
			return updateAlertStatus(id, body);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
	});
}

export function useAssignAlert() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, assignee }: { id: string; assignee: string }) =>
			assignAlert(id, { assignee }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
	});
}

// ============ NHI: Non-Human Identity Monitoring ==========

export function useAgents(params?: Record<string, unknown>) {
	return useQuery({
		queryKey: ['nhi', 'agents', params],
		queryFn: () => getAdminAgents(params as any),
		retry: 1,
	});
}

export function useRobots(params?: Record<string, unknown>) {
	return useQuery({
		queryKey: ['nhi', 'robots', params],
		queryFn: () => getAdminRobots(params),
		retry: 1,
	});
}

export function useIots(params?: Record<string, unknown>) {
	return useQuery({
		queryKey: ['nhi', 'iots', params],
		queryFn: () => getAdminIots(params),
		retry: 1,
	});
}

// NHI detail reads
export function useAgentById(id: string | null) {
	return useQuery({
		queryKey: ['nhi', 'agent', id],
		queryFn: () => getAgentById(id!),
		enabled: !!id,
		retry: 1,
	});
}

export function useRobotById(id: string | null) {
	return useQuery({
		queryKey: ['nhi', 'robot', id],
		queryFn: () => getRobotById(id!),
		enabled: !!id,
		retry: 1,
	});
}

export function useDeviceById(id: string | null) {
	return useQuery({
		queryKey: ['nhi', 'device', id],
		queryFn: () => getDeviceById(id!),
		enabled: !!id,
		retry: 1,
	});
}

// NHI mutations with cache invalidation
export function useCreateAgent() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: any) => createAgent(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['nhi', 'agents'] }),
	});
}

export function useDeleteAgent() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteAgent(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['nhi', 'agents'] }),
	});
}

export function useCreateRobot() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: any) => createRobot(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['nhi', 'robots'] }),
	});
}

export function useDeleteRobot() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteRobot(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['nhi', 'robots'] }),
	});
}

export function useCommissionRobot() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => commissionRobot(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['nhi', 'robots'] }),
	});
}

export function useDecommissionRobot() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => decommissionRobot(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['nhi', 'robots'] }),
	});
}

export function useCreateDevice() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: any) => createDevice(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['nhi', 'iots'] }),
	});
}

export function useDeleteDevice() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteDevice(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['nhi', 'iots'] }),
	});
}

// ============ SOC KPIs ==========

export function useAuditStats() {
	return useQuery({
		queryKey: ['audit-stats'],
		queryFn: () => getAuditStats(),
		staleTime: 15_000,
	});
}
