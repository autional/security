import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const dict: Record<string, string> = {
	'compliance.title': '合规管理',
	'compliance.overviewTab': '概览',
	'compliance.dsarTab': 'DSAR',
	'compliance.retentionTab': '留存策略',
	'compliance.isoTab': 'ISO 27001 控制',
	'compliance.soxTab': 'SOX ITGC',
	'compliance.pentestTab': '渗透测试',
	'compliance.complianceScore': '合规评分',
	'compliance.overallStatus': '总体状态',
	'compliance.checkDetail': '检查明细',
	'compliance.noChecks': '暂无检查项',
};

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => dict[key] ?? key,
		i18n: { language: 'zh-CN', changeLanguage: vi.fn() },
	}),
}));

vi.mock('@autional/ui', () => ({
	AppPageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@autional/ui/antd', () => ({
	DataTable: ({ dataSource }: { dataSource?: unknown[] }) => (
		<div data-testid="datatable">{dataSource?.length ?? 0}</div>
	),
}));

const { profileRef, dsarSpy, isoSpy, soxSpy } = vi.hoisted(() => ({
	profileRef: { current: [] as string[] },
	dsarSpy: vi.fn(),
	isoSpy: vi.fn(),
	soxSpy: vi.fn(),
}));

vi.mock('@/hooks/use-security-queries', () => ({
	useComplianceDashboard: () => ({ data: {}, isLoading: false, isError: false }),
	useComplianceSelfScore: () => ({ data: null, isLoading: false, isError: false }),
	useComplianceProfile: () => ({
		data: { enabledFrameworks: profileRef.current },
		isLoading: false,
		isError: false,
	}),
	useDSARsTab: (enabled: boolean) => {
		dsarSpy(enabled);
		return { data: [], isLoading: false };
	},
	useRetentionPoliciesTab: () => ({ data: [], isLoading: false }),
	useISOControlsTab: (enabled: boolean) => {
		isoSpy(enabled);
		return { data: [], isLoading: false };
	},
	useSOXControlsTab: (enabled: boolean) => {
		soxSpy(enabled);
		return { data: [], isLoading: false };
	},
	usePenTestReportsTab: () => ({ data: [], isLoading: false }),
}));

import CompliancePage from '../compliance/page';

describe('CompliancePage 框架页签门禁', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('profile 只启用 gdpr：隐藏 ISO/SOX 页签，且对应请求禁用', () => {
		profileRef.current = ['gdpr'];

		render(<CompliancePage />);

		expect(screen.getByText('DSAR')).toBeInTheDocument();
		expect(screen.queryByText('ISO 27001 控制')).toBeNull();
		expect(screen.queryByText('SOX ITGC')).toBeNull();
		expect(dsarSpy).toHaveBeenCalledWith(true);
		expect(isoSpy).toHaveBeenCalledWith(false);
		expect(soxSpy).toHaveBeenCalledWith(false);
	});

	it('profile 启用 iso27001 + sox：页签显示，且对应请求启用', () => {
		profileRef.current = ['gdpr', 'iso27001', 'sox'];

		render(<CompliancePage />);

		expect(screen.getByText('ISO 27001 控制')).toBeInTheDocument();
		expect(screen.getByText('SOX ITGC')).toBeInTheDocument();
		expect(isoSpy).toHaveBeenCalledWith(true);
		expect(soxSpy).toHaveBeenCalledWith(true);
	});
});
