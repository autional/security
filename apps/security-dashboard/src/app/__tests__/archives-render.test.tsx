import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const dict: Record<string, string> = {
	'archives.title': '归档与完整性管理',
	'archives.statEnabled': '归档功能',
	'archives.enabled': '已启用',
	'archives.disabled': '未启用',
	'archives.statRetentionDays': '保留天数',
	'archives.daysUnit': '天',
	'archives.statLastArchive': '上次归档',
	'archives.neverArchived': '从未归档',
	'archives.statVerificationPassed': '验证通过',
	'archives.triggerArchive': '触发归档',
	'archives.alertTitle': '归档说明',
	'archives.alertDescription': '归档说明正文',
};

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, fallback?: string) => dict[key] ?? fallback ?? key,
		i18n: { language: 'zh-CN', changeLanguage: vi.fn() },
	}),
}));

vi.mock('@autional/shared', () => ({
	usePermission: () => ({ can: () => true }),
	useCurrentRole: () => 'security_admin',
	useAuth: () => ({ currentTenantId: 'tenant-test' }),
}));

const { archiveStatusRef } = vi.hoisted(() => ({ archiveStatusRef: { current: null as any } }));

vi.mock('@/hooks/use-security-queries', () => ({
	useArchiveStatus: () => ({ data: archiveStatusRef.current, isLoading: false }),
	useTriggerArchive: () => ({ mutateAsync: vi.fn(), isPending: false }),
	useHashChain: () => ({ data: null, isLoading: false }),
}));

import ArchivesPage from '../archives/page';

describe('ArchivesPage 契约回归（S-59：撤表改状态卡）', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		archiveStatusRef.current = { enabled: true, days: 90, lastArchive: 0 };
	});

	it('渲染状态端点真值：已启用 / 保留天数', () => {
		render(<ArchivesPage />);
		expect(screen.getByText('归档功能')).toBeInTheDocument();
		expect(screen.getByText('已启用')).toBeInTheDocument();
		expect(screen.getByText('保留天数')).toBeInTheDocument();
		expect(screen.getByText('90')).toBeInTheDocument();
		expect(screen.getByText('天')).toBeInTheDocument();
	});

	it('last_archive 零值渲染「从未归档」，批次表死码不再存在', () => {
		render(<ArchivesPage />);
		expect(screen.getByText('从未归档')).toBeInTheDocument();
		expect(screen.queryByText('归档任务列表')).toBeNull();
	});

	it('last_archive 有效毫秒时间戳渲染本地时间', () => {
		const ts = Date.parse('2026-10-01T00:00:00Z');
		archiveStatusRef.current = { enabled: true, days: 90, lastArchive: ts };
		render(<ArchivesPage />);
		expect(screen.getByText(new Date(ts).toLocaleString())).toBeInTheDocument();
		expect(screen.queryByText('从未归档')).toBeNull();
	});

	it('enabled=false 渲染「未启用」', () => {
		archiveStatusRef.current = { enabled: false, days: 30, lastArchive: 0 };
		render(<ArchivesPage />);
		expect(screen.getByText('未启用')).toBeInTheDocument();
	});
});
