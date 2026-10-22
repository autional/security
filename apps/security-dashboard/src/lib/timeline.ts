// 时间线事件呈现映射（S-72）：audit action 值域分隔符/大小写混杂
// （authorize_post / TOKEN_REFRESH / auth.login_success / device.fingerprint.recorded / session.created …），
// 先归一（lowercase + 空格/./- → _）再匹配：文案走精确键表（未知回落原文 prettify），
// 图标/颜色走关键词家族规则（未知回落 file-text/灰）——未知值一律不隐藏数据。
//
// 消息本地化（S-72②）：audit message 由有限模板产出，实测三源——
//   ① audit-client LogSecurityCtx：`Security operation: %s, success: %v`
//   ② audit consumer auth_event_handler：`Security event: %s`
//   ③ identity 各 handler 直写字面量（login success / token refreshed…）
// 模板类按正则重组（内嵌 action 复用 actionLabel），字面量走精确表，未知回落原文。

import type { ComponentType } from 'react';
import {
	AlertTriangle,
	BadgeCheck,
	ClipboardCheck,
	FileText,
	KeyRound,
	List,
	LogIn,
	LogOut,
	Monitor,
	RefreshCw,
	Shield,
	Smartphone,
	Users,
} from 'lucide-react';

type TFn = (key: string, options?: Record<string, unknown>) => string;
type IconComponent = ComponentType<{ size?: string | number; className?: string }>;

export function normalizeAction(action?: string | null): string {
	if (!action) return '';
	return action.trim().toLowerCase().replace(/[\s.-]+/g, '_');
}

// 精确文案键表（实测值域 + 同族明显成员）；未命中 → prettify 回落
const ACTION_LABEL_MAP: Record<string, string> = {
	login: 'usersTimeline.actLogin',
	logout: 'usersTimeline.actLogout',
	auth_login_success: 'usersTimeline.actLoginSuccess',
	auth_login_failed: 'usersTimeline.actLoginFailed',
	login_failed: 'usersTimeline.actLoginFailed',
	authorize_post: 'usersTimeline.actAuthorizePost',
	token_refresh: 'usersTimeline.actTokenRefresh',
	device_fingerprint_recorded: 'usersTimeline.actDeviceFingerprint',
	password_register: 'usersTimeline.actPasswordRegister',
	password_change: 'usersTimeline.actPasswordChange',
	session_created: 'usersTimeline.actSessionCreated',
	admin_list: 'usersTimeline.actAdminList',
	user_assign_roles: 'usersTimeline.actAssignRoles',
};

const UNKNOWN_ACTION_KEY = 'usersTimeline.actOther';

function knownActionLabel(t: TFn, norm: string): string | null {
	const key = ACTION_LABEL_MAP[norm];
	if (!key) return null;
	const label = t(key);
	return label && label !== key ? label : null;
}

export function hasMappedActionLabel(t: TFn, action?: string | null): boolean {
	const norm = normalizeAction(action);
	return norm !== '' && knownActionLabel(t, norm) !== null;
}

export function eventActionLabel(t: TFn, action?: string | null): string {
	const norm = normalizeAction(action);
	if (!norm) return '-';
	const known = knownActionLabel(t, norm);
	if (known) return known;
	// S2-R04：未映射动作不再回落英文原文；统一「其他操作」，原文由页面 tooltip 呈现。
	const fallback = t(UNKNOWN_ACTION_KEY);
	if (fallback && fallback !== UNKNOWN_ACTION_KEY) return fallback;
	return (action || '').replace(/[._]/g, ' ').trim();
}

// 关键词规则（顺序即优先级，先命中先得）
const STYLE_RULES: Array<{ test: RegExp; Icon: IconComponent; color: string }> = [
	{ test: /anomaly/, Icon: AlertTriangle, color: 'red' },
	{ test: /fail/, Icon: AlertTriangle, color: 'red' },
	{ test: /logout/, Icon: LogOut, color: 'gray' },
	{ test: /login/, Icon: LogIn, color: 'green' },
	{ test: /password/, Icon: KeyRound, color: 'orange' },
	{ test: /(mfa|otp|2fa)/, Icon: BadgeCheck, color: 'blue' },
	{ test: /(token|refresh)/, Icon: RefreshCw, color: 'blue' },
	{ test: /(device|fingerprint)/, Icon: Smartphone, color: 'purple' },
	{ test: /session/, Icon: Monitor, color: 'cyan' },
	{ test: /(role|assign)/, Icon: Users, color: 'purple' },
	{ test: /authorize/, Icon: ClipboardCheck, color: 'cyan' },
	{ test: /scan/, Icon: Shield, color: 'cyan' },
	{ test: /(list|admin)/, Icon: List, color: 'gray' },
];

const DEFAULT_STYLE: { Icon: IconComponent; color: string } = {
	Icon: FileText,
	color: 'gray',
};

export function eventStyle(action?: string | null): { Icon: IconComponent; color: string } {
	const norm = normalizeAction(action);
	for (const rule of STYLE_RULES) {
		if (rule.test.test(norm)) return { Icon: rule.Icon, color: rule.color };
	}
	return DEFAULT_STYLE;
}

// ---- 消息本地化 ----

const MESSAGE_EXACT_MAP: Record<string, string> = {
	'login success': 'usersTimeline.msgLoginSuccess',
	'token refreshed': 'usersTimeline.msgTokenRefreshed',
	'device fingerprint recorded during login': 'usersTimeline.msgDeviceFingerprint',
	'oauth login success': 'usersTimeline.msgOauthLoginSuccess',
	'oauth login success — MFA required': 'usersTimeline.msgOauthLoginMfa',
	'User re-authenticated for sensitive operation': 'usersTimeline.msgReauth',
	'Security event dismissed by user': 'usersTimeline.msgDismissed',
};

const SECURITY_EVENT_RE = /^Security event: (.+)$/;
const SECURITY_OPERATION_RE = /^Security operation: (.+), success: (true|false)$/;

export function eventMessage(t: TFn, message?: string | null): string {
	const raw = (message || '').trim();
	if (!raw) return '';
	const exactKey = MESSAGE_EXACT_MAP[raw];
	if (exactKey) {
		const label = t(exactKey);
		if (label && label !== exactKey) return label;
		return raw;
	}
	const eventMatch = raw.match(SECURITY_EVENT_RE);
	if (eventMatch) {
		return t('usersTimeline.msgSecurityEvent', {
			action: eventActionLabel(t, eventMatch[1]),
		});
	}
	const opMatch = raw.match(SECURITY_OPERATION_RE);
	if (opMatch) {
		return t('usersTimeline.msgSecurityOperation', {
			action: eventActionLabel(t, opMatch[1]),
			result:
				opMatch[2] === 'true' ? t('usersTimeline.msgSuccess') : t('usersTimeline.msgFailure'),
		});
	}
	return raw;
}
