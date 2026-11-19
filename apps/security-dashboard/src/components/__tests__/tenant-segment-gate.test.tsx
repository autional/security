import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import TenantSegmentGate from '../TenantSegmentGate';
import { isNonTenantSegment } from '@/non-tenant-segments';

/**
 * F-04 回归：业务路由首段不得被当成租户 slug。
 * `/audit-logs`（无 slug）应落 404，而不是把 audit-logs 当租户、渲染 index 总览。
 */
function renderAt(path: string) {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route
					path="/:tenantSlug"
					element={
						<TenantSegmentGate>
							<div data-testid="tenant-page">tenant ok</div>
						</TenantSegmentGate>
					}
				/>
			</Routes>
		</MemoryRouter>,
	);
}

describe('TenantSegmentGate (F-04)', () => {
	it('业务路由首段被判为非租户', () => {
		expect(isNonTenantSegment('audit-logs')).toBe(true);
		expect(isNonTenantSegment('sessions')).toBe(true);
		expect(isNonTenantSegment('acme-corp')).toBe(false);
		expect(isNonTenantSegment(undefined)).toBe(false);
	});

	it('无 slug 的业务路由渲染 404', () => {
		renderAt('/audit-logs');
		expect(screen.queryByTestId('tenant-page')).toBeNull();
		expect(screen.getByText('404')).toBeInTheDocument();
	});

	it('真实租户 slug 正常放行', () => {
		renderAt('/acme-corp');
		expect(screen.getByTestId('tenant-page')).toBeInTheDocument();
	});
});
