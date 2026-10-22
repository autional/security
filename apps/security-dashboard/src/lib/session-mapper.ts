/** 会话列表行：页面列契约（后端 DTO 为 ip/device_type/geoip，此处统一归一）。 */
export interface SessionRow {
	id: string;
	userId: string;
	username: string;
	ipAddress: string;
	device: string;
	browser: string;
	location: string;
	riskScore: number | null;
	createdAt: string;
	lastActiveAt: string;
}

type RawSession = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

function pick(raw: RawSession, ...keys: string[]): unknown {
	for (const key of keys) {
		const value = raw[key];
		if (value !== undefined && value !== null && value !== '') return value;
	}
	return undefined;
}

export function parseUserAgent(ua: string): { device: string; browser: string } {
	if (!ua) return { device: '', browser: '' };
	const device = /iPad|Tablet/i.test(ua)
		? 'Tablet'
		: /Mobile|Android|iPhone/i.test(ua)
			? 'Mobile'
			: 'Desktop';
	const browser = /Edg\//.test(ua)
		? 'Edge'
		: /OPR\//.test(ua)
			? 'Opera'
			: /Chrome\//.test(ua)
				? 'Chrome'
				: /Firefox\//.test(ua)
					? 'Firefox'
					: /Safari\//.test(ua)
						? 'Safari'
						: '';
	return { device, browser };
}

/**
 * 双键兜底：服务端 wire 为 ip/device_type/geoip，旧页面契约曾读
 * ipAddress/device/location。username/riskScore 当前无数据源 → 空/ null，
 * 由页面显式显示占位，不伪造。
 */
export function mapSessionRow(raw: RawSession): SessionRow {
	const ua = str(pick(raw, 'userAgent', 'user_agent'));
	const parsed = parseUserAgent(ua);
	const risk = pick(raw, 'riskScore', 'risk_score');
	return {
		id: str(raw.id),
		userId: str(pick(raw, 'userId', 'user_id')),
		username: str(pick(raw, 'username')),
		ipAddress: str(pick(raw, 'ipAddress', 'ip')),
		device: str(pick(raw, 'device', 'deviceType', 'device_type')) || parsed.device,
		browser: str(pick(raw, 'browser')) || parsed.browser,
		location: str(pick(raw, 'location', 'geoip')),
		riskScore: typeof risk === 'number' && Number.isFinite(risk) ? risk : null,
		createdAt: str(pick(raw, 'createdAt', 'created_at')),
		lastActiveAt: str(pick(raw, 'lastActiveAt', 'last_active_at')),
	};
}
