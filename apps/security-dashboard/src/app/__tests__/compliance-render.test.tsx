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
	'compliance.state.compliant': '合规',
	'compliance.state.non_compliant': '存在待整改项',
	'compliance.state.not_assessed': '待评估',
	'compliance.state.evaluation_error': '评估异常',
	'compliance.coverageTitle': '评估覆盖',
	'compliance.coverageValue': '{{assessed}}/{{total}}（{{percent}}%）',
	'compliance.coverageUnavailable': '暂无覆盖数据',
	'compliance.frameworkCardsTitle': '框架评估',
	'compliance.frameworkCoverage': '已评估 {{assessed}}/{{total}} 项控制',
	'compliance.evaluationErrorTitle': '评估异常',
};

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, opts?: Record<string, unknown>) => {
			const template = dict[key] ?? key;
			if (opts && typeof opts === 'object') {
				return Object.entries(opts).reduce(
					(acc, [name, value]) => acc.replaceAll(`{{${name}}}`, String(value)),
					template,
				);
			}
			return template;
		},
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

const { profileRef, dashRef, dsarSpy, isoSpy, soxSpy } = vi.hoisted(() => ({
	profileRef: { current: [] as string[] },
	dashRef: { current: {} as Record<string, unknown> },
	dsarSpy: vi.fn(),
	isoSpy: vi.fn(),
	soxSpy: vi.fn(),
}));

vi.mock('@/hooks/use-security-queries', () => ({
	useComplianceDashboard: () => ({ data: dashRef.current, isLoading: false, isError: false }),
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

describe('CompliancePage 四态总览（P2）', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		profileRef.current = ['gdpr', 'iso27001', 'sox'];
	});

	it('展示总体状态 / 覆盖度 / 每门禁一张卡', () => {
		dashRef.current = {
			overallStatus: 'not_assessed',
			frameworkAssessments: [
				{
					framework: 'iso27001',
					standardId: 'iso27001_2022',
					displayName: 'ISO/IEC 27001:2022',
					status: 'not_assessed',
					controlsTotal: 10,
					controlsAssessed: 7,
					controlsUnknown: 3,
				},
			],
			assessmentCoverage: { assessed: 7, total: 10, percent: 70 },
			assessmentVersion: 'assessment-v2',
		};

		render(<CompliancePage />);

		// 总体状态与框架卡标签：待评估（不得显示为失败）
		expect(screen.getAllByText('待评估').length).toBeGreaterThanOrEqual(2);
		// 覆盖度：7/10（70%）
		expect(screen.getByText('7/10（70%）')).toBeInTheDocument();
		// 框架卡：显示名 + 每框架覆盖
		expect(screen.getByText('ISO/IEC 27001:2022')).toBeInTheDocument();
		expect(screen.getByText('已评估 7/10 项控制')).toBeInTheDocument();
	});

	it('评估异常时显示可诊断原因，且状态为评估异常', () => {
		dashRef.current = {
			overallStatus: 'evaluation_error',
			evaluationError: '标准 soc2_cc6 未加载',
			frameworkAssessments: [],
		};

		render(<CompliancePage />);

		// 状态卡与告警标题都会出现"评估异常"
		expect(screen.getAllByText('评估异常').length).toBeGreaterThanOrEqual(2);
		expect(screen.getByText('标准 soc2_cc6 未加载')).toBeInTheDocument();
	});
});
