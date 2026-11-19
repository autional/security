'use client';

import type { ReactNode } from 'react';
import { useParams } from 'react-router';
import NotFoundPage from '@/app/not-found/page';
import { isNonTenantSegment } from '@/non-tenant-segments';

/**
 * TenantSegmentGate — 拦截「把业务路由首段当租户 slug」的路径。
 *
 * 背景（2026-11-08 QA F-04）：路由 `/:tenantSlug` 会把 `/audit-logs` 匹配成
 * 「租户 audit-logs」，其 index 子路由随即渲染总览 —— URL 不纠正、也不 404。
 * 本闸门在进入 SecurityGuard 之前判定首段是否为本站业务路由：
 *   - 是 → 渲染 404（AC-002：无 slug 的其它路径 → NotFound）
 *   - 否 → 正常放行（真实租户 slug）
 *
 * 放在 App 层而非 shared 层：名单是**站点知识**（`non-tenant-segments.ts`），
 * 通用层不应感知。
 */
export default function TenantSegmentGate({ children }: { children: ReactNode }) {
	const { tenantSlug } = useParams();
	if (isNonTenantSegment(tenantSlug)) return <NotFoundPage />;
	return <>{children}</>;
}
