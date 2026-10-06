'use client';

import { usePermission, useCurrentRole } from '@autional/shared';

interface CanProps {
	/** 资源:action 权限字符串，如 "anomaly:update" */
	permission?: string;
	/** 最低角色要求，如 'security_admin' */
	minRole?: 'super_admin' | 'security_admin';
	/** 无条件拒绝 auditor（最常用，用于所有写操作） */
	denyAuditor?: boolean;
	fallback?: React.ReactNode;
	children: React.ReactNode;
}

/** 站点角色层级：auditor（只读） < security_admin < super_admin；未知角色 rank=0（fail-closed） */
const ROLE_RANK: Record<string, number> = {
	auditor: 1,
	security_admin: 2,
	super_admin: 3,
};

const MIN_ROLE_RANK: Record<NonNullable<CanProps['minRole']>, number> = {
	security_admin: 2,
	super_admin: 3,
};

function meetsMinRole(role: string | null, minRole: NonNullable<CanProps['minRole']>): boolean {
	const rank = role ? (ROLE_RANK[role] ?? 0) : 0;
	return rank >= MIN_ROLE_RANK[minRole];
}

/**
 * 权限守卫组件。
 *
 * 规则（优先级从高到低）:
 * 1. `denyAuditor` → auditor 被拒绝（所有写操作都应设置）
 * 2. `minRole` → 角色层级门槛（auditor < security_admin < super_admin）；
 *    非层级内角色/空角色一律拒绝（fail-closed）
 * 3. `permission` → 要求具体权限字符串
 *
 * 用法:
 *   <Can denyAuditor>
 *     <Button onClick={handleDelete}>Delete</Button>
 *   </Can>
 */
export function Can({
	permission,
	minRole,
	denyAuditor = false,
	fallback = null,
	children,
}: CanProps) {
	const { can } = usePermission();
	const role = useCurrentRole();

	// Audit 禁止所有写操作
	if (denyAuditor && role === 'auditor') {
		return <>{fallback}</>;
	}

	// 角色层级门槛
	if (minRole && !meetsMinRole(role, minRole)) {
		return <>{fallback}</>;
	}

	// 具体权限
	if (permission && !can(permission)) {
		return <>{fallback}</>;
	}

	return <>{children}</>;
}
