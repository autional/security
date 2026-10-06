'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router';
import { notification } from '@/lib/antd-app';
import { Badge, Popover } from 'antd';
import { Zap } from 'lucide-react';
import {
	getAccessToken,
	getRefreshToken,
	loginWithTokens,
	logout,
	getAUTH_PAGES_URL,
	useTenantSlug,
} from '@autional/shared';
import { authRefreshPost } from '@autional/shared/generated/api';
import { useTranslation } from 'react-i18next';
import { markSessionDegraded, SESSION_DEGRADED_NOTICE_KEY } from '@/lib/session-degrade';

interface RealtimeEvent {
	id: string;
	type: string;
	severity: 'info' | 'warning' | 'critical';
	message: string;
	tenantId: string;
	timestamp: string;
}

const MAX_RETRIES = 20;
const BASE_DELAY = 1000;
// S-07（fix-security-w5）：badge 点击展开最近事件列表的容量上限
const RECENT_EVENTS_CAP = 20;
const SEVERITY_DOT_COLORS: Record<string, string> = {
	critical: 'var(--color-danger)',
	warning: 'var(--color-warning)',
	info: 'var(--color-info)',
};

export default function SSEEventStream() {
	const { t, i18n } = useTranslation();
	const slug = useTenantSlug();
	const [connected, setConnected] = useState(false);
	const [eventCount, setEventCount] = useState(0);
	// S-07：原仅累加计数（info 级事件无任何查看途径）——保留最近 RECENT_EVENTS_CAP 条供弹层查看
	const [recentEvents, setRecentEvents] = useState<RealtimeEvent[]>([]);
	const abortRef = useRef<AbortController | null>(null);
	const retryCountRef = useRef(0);
	const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	async function attemptTokenRefresh(): Promise<string | null> {
		const refreshToken = getRefreshToken();
		if (!refreshToken) return null;
		try {
			const data = await authRefreshPost({ refresh_token: refreshToken } as any);
			const newAccess = data.accessToken;
			const newRefresh = data.refreshToken;
			if (newAccess) {
				loginWithTokens(newAccess, newRefresh || refreshToken, {
					id: '',
					email: '',
					username: '',
					status: 'active',
				});
				return newAccess;
			}
		} catch {
			/* refresh failed */
		}
		return null;
	}

	const connect = useCallback(async () => {
		const token = getAccessToken();
		if (!token) return;

		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		try {
			// @generated-api-exempt: Server-Sent Events (SSE) streaming cannot use
			// axios/apiClient — fetch() with AbortController is required for stream
			// reading. Gateway registers the handler at
			// /bff/gateway/api/v1/stream/security-events (BFF scheme with JWT required),
			// so use the absolute API path directly.
			const res = await fetch(`/bff/gateway/api/v1/stream/security-events`, {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'text/event-stream',
				},
				signal: controller.signal,
			});

			if (res.status === 401) {
				const newToken = await attemptTokenRefresh();
				if (newToken) {
					retryCountRef.current = 0;
					connect();
					return;
				}
				// S-74：过期降级不静默——持久轻提示 + 共享标记（AppLayout 在恢复后 toast 并关提示）。
				notification.warning({
					key: SESSION_DEGRADED_NOTICE_KEY,
					message: t('sse.sessionExpiredTitle'),
					description: t('sse.sessionExpiredDesc'),
					duration: 0,
					placement: 'bottomRight',
				});
				markSessionDegraded();
				// U350：落点走 auth 站入口路由（本站无 /login 路由，相对路径接通即 404）；
				// ?redirect= 由入口三分支解析租户，登录成功后原路返回（rc.22 起 logout 参数生效）。
				logout(`${getAUTH_PAGES_URL()}/login?redirect=${encodeURIComponent(window.location.href)}`);
				return;
			}

			if (!res.ok) {
				setConnected(false);
				scheduleReconnect();
				return;
			}

			setConnected(true);
			retryCountRef.current = 0;
			const reader = res.body?.getReader();
			if (!reader) return;

			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				let eventData = '';
				for (const line of lines) {
					if (line.startsWith('data:')) {
						eventData = line.slice(5).trim();
					} else if (line === '' && eventData) {
						try {
							const data: RealtimeEvent = JSON.parse(eventData);
							setEventCount((c) => c + 1);
							// S-07：全量（含 info）入最近列表，弹层可查
							setRecentEvents((prev) => [data, ...prev].slice(0, RECENT_EVENTS_CAP));

							if (data.severity === 'critical' || data.severity === 'warning') {
								notification.open({
									message: t('sse.realtimeEvent'),
									description: data.message,
									icon: (
										<Zap size="1em"
											style={{ color: data.severity === 'critical' ? 'var(--color-danger)' : 'var(--color-warning)' }} />
									),
									placement: 'bottomRight',
								});
							}
						} catch {
							/* ignore parse errors */
						}
						eventData = '';
					}
				}
			}
			setConnected(false);
			scheduleReconnect();
		} catch {
			setConnected(false);
			scheduleReconnect();
		}
	}, [t]);

	function scheduleReconnect() {
		if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
		if (retryCountRef.current >= MAX_RETRIES) return;
		const delay = Math.min(BASE_DELAY * Math.pow(2, retryCountRef.current), 30000);
		retryTimerRef.current = setTimeout(() => {
			retryCountRef.current++;
			connect();
		}, delay);
	}

	useEffect(() => {
		connect();
		return () => {
			abortRef.current?.abort();
			if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
		};
	}, [connect]);

	// S-07（fix-security-w5）：badge 点击展开最近事件列表（cap 20）+ 跳转审计日志页，
	// 修「仅累加计数、info 级无查看途径」（Nielsen #1 可达性）
	const recentEventsPanel = (
		<div className="w-80 max-w-[80vw]">
			<div className="text-xs font-medium text-neutral-600 mb-2">{t('sse.recentEvents')}</div>
			{recentEvents.length === 0 ? (
				<div className="text-xs text-neutral-500 py-2 text-center">{t('sse.noEvents')}</div>
			) : (
				<ul className="max-h-64 overflow-y-auto m-0 p-0 list-none space-y-1">
					{recentEvents.map((evt) => (
						<li key={evt.id} className="flex items-start gap-2 text-xs">
							<span
								className="w-2 h-2 rounded-full mt-1 shrink-0"
								style={{ backgroundColor: SEVERITY_DOT_COLORS[evt.severity] || 'var(--color-neutral-400)' }}
							/>
							<span className="flex-1 min-w-0 break-words">{evt.message}</span>
							<span className="text-neutral-500 shrink-0">
								{evt.timestamp
									? new Date(evt.timestamp).toLocaleTimeString(i18n.language, {
											hour: '2-digit',
											minute: '2-digit',
										})
									: ''}
							</span>
						</li>
					))}
				</ul>
			)}
			<div className="mt-2 pt-2 border-t border-neutral-200 text-right">
				<Link
					to={`/${slug ?? ''}/audit-logs`}
					className="text-xs text-primary-600 hover:opacity-80"
				>
					{t('sse.viewAuditLogs')}
				</Link>
			</div>
		</div>
	);

	return (
		<Popover content={recentEventsPanel} trigger="click" placement="bottomRight">
			<span className="inline-flex cursor-pointer" role="button" tabIndex={0}>
				<Badge
					count={eventCount}
					overflowCount={99}
					style={{ backgroundColor: connected ? 'var(--color-success)' : 'var(--color-neutral-300)' }}
				>
					<Zap
						size={16}
						style={{ color: connected ? 'var(--color-success)' : 'var(--color-neutral-300)' }}
					>
						<title>{connected ? t('sse.connected') : t('sse.disconnected')}</title>
					</Zap>
				</Badge>
			</span>
		</Popover>
	);
}
