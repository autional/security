'use client';

// 用户身份单元格（S-71/S-32/S-14 下钻族）：ULID → 用户名显示 + 画像入口。
// 数据源 useAdminUsers（identity 管理面，gateway required_roles 含 security_admin，
// search=id 精确命中）——查不到回落截断 ULID（不隐藏数据），Tooltip 全文。
// 路由挂在 /:tenantSlug 下（App.tsx），Link 必须带 slug 前缀。

import React from 'react';
import { Link } from 'react-router';
import { Tooltip } from 'antd';
import { useTenantSlug } from '@autional/shared';
import { useAdminUsers } from '@/hooks/use-security-queries';

function shortId(id: string): string {
	return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export function UserIdentity({ userId, link = true }: { userId?: string | null; link?: boolean }) {
	const slug = useTenantSlug();
	const { data } = useAdminUsers(userId || '', !!userId);

	if (!userId) return <>-</>;

	const items = ((data as { items?: Array<Record<string, string>> })?.items ?? []) as Array<
		Record<string, string>
	>;
	// 仅精确命中（ListAuthUsers search 含 identifier ILIKE 模糊支，勿取 items[0] 防误显他人）
	const hit = items.find((u) => u.id === userId);
	const name = hit?.username || hit?.email || hit?.phone;
	const label = name || shortId(userId);
	const body = name ? (
		<Tooltip title={`${name}（${userId}）`}>
			<span>{label}</span>
		</Tooltip>
	) : (
		<Tooltip title={userId}>
			<span className="font-mono">{label}</span>
		</Tooltip>
	);

	if (!link) return body;
	return (
		<Link to={`/${slug ?? ''}/users/${userId}/profile`} className="text-primary-600 hover:opacity-80">
			{body}
		</Link>
	);
}
