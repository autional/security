import { describe, it, expect } from 'vitest';
import {
	ClipboardCheck,
	KeyRound,
	List,
	LogIn,
	Monitor,
	RefreshCw,
	Smartphone,
	Users,
} from 'lucide-react';
import {
	eventActionLabel,
	eventMessage,
	eventStyle,
	hasMappedActionLabel,
	normalizeAction,
} from '@/lib/timeline';

// S-72 回归：真实 action 值域（大小写/分隔符混杂）下的归一、图标/颜色、文案与消息映射
const dict: Record<string, string> = {
	'usersTimeline.actLogin': '登录',
	'usersTimeline.actLoginSuccess': '登录成功',
	'usersTimeline.actTokenRefresh': '令牌刷新',
	'usersTimeline.actSessionCreated': '会话创建',
	'usersTimeline.actDeviceFingerprint': '设备指纹登记',
	'usersTimeline.actAssignRoles': '角色分配',
	'usersTimeline.actOther': '其他操作',
	'usersTimeline.msgSecurityEvent': '安全事件：{{action}}',
	'usersTimeline.msgSecurityOperation': '安全操作：{{action}}，结果：{{result}}',
	'usersTimeline.msgSuccess': '成功',
	'usersTimeline.msgFailure': '失败',
	'usersTimeline.msgTokenRefreshed': '令牌已刷新',
};

const t = (key: string, options?: Record<string, unknown>) => {
	let s = dict[key];
	if (s == null) return key;
	if (options) {
		for (const [k, v] of Object.entries(options)) s = s.replace(`{{${k}}}`, String(v));
	}
	return s;
};

describe('normalizeAction（S-72 归一）', () => {
	it('大小写与 . / - 分隔符统一为小写下划线', () => {
		expect(normalizeAction('auth.login_success')).toBe('auth_login_success');
		expect(normalizeAction('TOKEN_REFRESH')).toBe('token_refresh');
		expect(normalizeAction('device.fingerprint.recorded')).toBe('device_fingerprint_recorded');
		expect(normalizeAction('user.assign_roles')).toBe('user_assign_roles');
		expect(normalizeAction('session.created')).toBe('session_created');
		expect(normalizeAction('')).toBe('');
		expect(normalizeAction(null)).toBe('');
	});
});

describe('eventActionLabel（S-72 动作名文案）', () => {
	it('实测值域命中 i18n 文案', () => {
		expect(eventActionLabel(t, 'auth.login_success')).toBe('登录成功');
		expect(eventActionLabel(t, 'TOKEN_REFRESH')).toBe('令牌刷新');
		expect(eventActionLabel(t, 'LOGIN')).toBe('登录');
		expect(eventActionLabel(t, 'session.created')).toBe('会话创建');
		expect(eventActionLabel(t, 'device.fingerprint.recorded')).toBe('设备指纹登记');
		expect(eventActionLabel(t, 'user.assign_roles')).toBe('角色分配');
	});

	it('未知值本地化兜底，原文留给 tooltip（S2-R04）', () => {
		expect(eventActionLabel(t, 'weird.action_x')).toBe('其他操作');
		expect(hasMappedActionLabel(t, 'weird.action_x')).toBe(false);
		expect(hasMappedActionLabel(t, 'session.created')).toBe(true);
		expect(eventActionLabel(t, '')).toBe('-');
	});
});

describe('eventStyle（S-72 图标/颜色按关键词家族）', () => {
	it('实测 8 值域图案区分', () => {
		expect(eventStyle('auth.login_success').Icon).toBe(LogIn);
		expect(eventStyle('LOGIN').Icon).toBe(LogIn);
		expect(eventStyle('TOKEN_REFRESH').Icon).toBe(RefreshCw);
		expect(eventStyle('PASSWORD_REGISTER').Icon).toBe(KeyRound);
		expect(eventStyle('device.fingerprint.recorded').Icon).toBe(Smartphone);
		expect(eventStyle('session.created').Icon).toBe(Monitor);
		expect(eventStyle('authorize_post').Icon).toBe(ClipboardCheck);
		expect(eventStyle('admin_list').Icon).toBe(List);
		expect(eventStyle('user.assign_roles').Icon).toBe(Users);
	});

	it('失败/异常类红色告警，未知回落灰', () => {
		expect(eventStyle('auth.login_failed').color).toBe('red');
		expect(eventStyle('anomaly.detected').color).toBe('red');
		expect(eventStyle('unknown_action').color).toBe('gray');
	});
});

describe('eventMessage（S-72 消息本地化）', () => {
	it('模板类重组：Security event / Security operation（内嵌 action 复用文案）', () => {
		expect(eventMessage(t, 'Security event: auth.login_success')).toBe('安全事件：登录成功');
		expect(eventMessage(t, 'Security operation: session_created, success: true')).toBe(
			'安全操作：会话创建，结果：成功',
		);
		expect(eventMessage(t, 'Security operation: session_created, success: false')).toBe(
			'安全操作：会话创建，结果：失败',
		);
	});

	it('字面量精确命中', () => {
		expect(eventMessage(t, 'token refreshed')).toBe('令牌已刷新');
	});

	it('未知消息回落原文', () => {
		expect(eventMessage(t, 'some free-form note')).toBe('some free-form note');
		expect(eventMessage(t, '')).toBe('');
	});
});
