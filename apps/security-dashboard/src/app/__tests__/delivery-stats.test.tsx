import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockStats = vi.fn();
const mockReadReport = vi.fn();
const mockTrend = vi.fn();
const mockComm = vi.fn();

vi.mock('@autional/shared', () => ({
	GeneratedApi: {
		adminNotificationsStats: () => mockStats(),
		adminNotificationsReadReport: () => mockReadReport(),
		adminNotificationsTrend: () => mockTrend(),
		adminCommunicationDashboard: () => mockComm(),
	},
}));

import DeliveryStatsPage from '../notifications/delivery-stats/page';

function mockLoaded(overrides: Record<string, any> = {}) {
	mockStats.mockResolvedValue({ totalSent: 120, ...overrides.stats });
	mockReadReport.mockResolvedValue({
		readCount: 96,
		unreadCount: 24,
		readRate: 0.8,
		...overrides.readReport,
	});
	mockTrend.mockResolvedValue({ items: [] });
	mockComm.mockResolvedValue({
		totalSent: 120,
		delivered: 118,
		failed: 2,
		byChannel: {},
		...overrides.comm,
	});
}

describe('DeliveryStatsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('零发送时不判定「待关注」，显示暂无发送（S2-R03）', async () => {
		mockLoaded({
			stats: { totalSent: 0 },
			readReport: { readCount: 0, unreadCount: 0, readRate: 0 },
			comm: { totalSent: 0, delivered: 0, failed: 0, byChannel: {} },
		});
		render(<DeliveryStatsPage />);

		expect(await screen.findByText('暂无发送')).toBeInTheDocument();
		expect(screen.queryByText('待关注')).toBeNull();
		expect(screen.queryByText('0.0%')).toBeNull();
	});

	it('有发送时正常计算阅读率与评级', async () => {
		mockLoaded();
		render(<DeliveryStatsPage />);

		expect(await screen.findByText('80.0%')).toBeInTheDocument();
		expect(screen.getByText('优秀')).toBeInTheDocument();
		expect(screen.queryByText('暂无发送')).toBeNull();
	});
});
