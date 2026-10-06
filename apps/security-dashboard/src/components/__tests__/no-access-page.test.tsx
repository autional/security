import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router';
import React from 'react';

const mockLogout = vi.fn();
const mockSlug = vi.fn<() => string | null>();

vi.mock('@autional/shared', () => ({
	useLogout: () => mockLogout,
	useTenantSlugFromUrl: () => mockSlug(),
}));

import NoAccessPage from '../NoAccessPage';

function LocationProbe() {
	const loc = useLocation();
	return <div data-testid="loc">{loc.pathname}</div>;
}

function renderPage(props: { showHome?: boolean } = {}, initial = '/acme-corp/archives') {
	return render(
		<MemoryRouter initialEntries={[initial]}>
			<NoAccessPage {...props} />
			<LocationProbe />
		</MemoryRouter>,
	);
}

// i18n 走 test/setup.ts 注册的真实实例（zh-CN）——文案断言同时锁 locale 文件键位。
const NO_ACCESS_TEXT = '抱歉，您当前账号的角色无权访问此页面。如需访问，请切换具备相应权限的账号。';

describe('NoAccessPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSlug.mockReturnValue('acme-corp');
	});

	it('renders the roleGuard.noAccess message from the real locale', () => {
		renderPage();
		expect(screen.getByText(NO_ACCESS_TEXT)).toBeInTheDocument();
	});

	it('always offers the switch-account exit', () => {
		renderPage();
		expect(screen.getByRole('button', { name: '切换账号' })).toBeInTheDocument();
	});

	it('clicking switch-account invokes the shared logout funnel', () => {
		renderPage();
		fireEvent.click(screen.getByRole('button', { name: '切换账号' }));
		expect(mockLogout).toHaveBeenCalledTimes(1);
	});

	it('hides back-home by default (top-level denial: home would loop)', () => {
		renderPage();
		expect(screen.queryByRole('button', { name: '返回首页' })).not.toBeInTheDocument();
	});

	it('showHome renders back-home and navigates to the tenant home', async () => {
		renderPage({ showHome: true });
		fireEvent.click(screen.getByRole('button', { name: '返回首页' }));
		await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/acme-corp'));
	});

	it('showHome navigates to / when no tenant slug is present', async () => {
		mockSlug.mockReturnValue(null);
		renderPage({ showHome: true }, '/');
		fireEvent.click(screen.getByRole('button', { name: '返回首页' }));
		await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/'));
	});
});
