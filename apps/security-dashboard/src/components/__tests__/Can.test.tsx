import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockCan = vi.fn<(permission: string) => boolean>();
const mockRole = vi.fn<() => string | null>();

vi.mock('@autional/shared', () => ({
	usePermission: () => ({ can: (permission: string) => mockCan(permission) }),
	useCurrentRole: () => mockRole(),
}));

import { Can } from '../Can';

describe('Can', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCan.mockReturnValue(true);
		mockRole.mockReturnValue('security_admin');
	});

	it('renders children without constraints', () => {
		render(<Can>child</Can>);
		expect(screen.getByText('child')).toBeInTheDocument();
	});

	describe('denyAuditor', () => {
		it('denies auditor and shows fallback', () => {
			mockRole.mockReturnValue('auditor');
			render(
				<Can denyAuditor fallback={<span>denied</span>}>
					<button>write</button>
				</Can>,
			);
			expect(screen.getByText('denied')).toBeInTheDocument();
			expect(screen.queryByText('write')).not.toBeInTheDocument();
		});

		it('allows security_admin and super_admin', () => {
			for (const role of ['security_admin', 'super_admin']) {
				mockRole.mockReturnValue(role);
				const { unmount } = render(<Can denyAuditor>write</Can>);
				expect(screen.getByText('write')).toBeInTheDocument();
				unmount();
			}
		});
	});

	describe('minRole=security_admin', () => {
		it('denies auditor', () => {
			mockRole.mockReturnValue('auditor');
			render(
				<Can minRole="security_admin" fallback={<span>denied</span>}>
					<button>admin-only</button>
				</Can>,
			);
			expect(screen.getByText('denied')).toBeInTheDocument();
		});

		it('allows security_admin and super_admin', () => {
			for (const role of ['security_admin', 'super_admin']) {
				mockRole.mockReturnValue(role);
				const { unmount } = render(<Can minRole="security_admin">allowed</Can>);
				expect(screen.getByText('allowed')).toBeInTheDocument();
				unmount();
			}
		});

		it('fail-closed for unknown/guest/null roles', () => {
			for (const role of ['guest', 'admin', 'user_manager', null]) {
				mockRole.mockReturnValue(role);
				const { unmount } = render(
					<Can minRole="security_admin" fallback={<span>denied</span>}>
						<button>admin-only</button>
					</Can>,
				);
				expect(screen.getByText('denied')).toBeInTheDocument();
				expect(screen.queryByText('admin-only')).not.toBeInTheDocument();
				unmount();
			}
		});
	});

	describe('minRole=super_admin', () => {
		it('denies security_admin and auditor', () => {
			for (const role of ['security_admin', 'auditor']) {
				mockRole.mockReturnValue(role);
				const { unmount } = render(
					<Can minRole="super_admin" fallback={<span>denied</span>}>
						<button>super-only</button>
					</Can>,
				);
				expect(screen.getByText('denied')).toBeInTheDocument();
				unmount();
			}
		});

		it('allows super_admin', () => {
			mockRole.mockReturnValue('super_admin');
			render(<Can minRole="super_admin">super-only</Can>);
			expect(screen.getByText('super-only')).toBeInTheDocument();
		});
	});

	describe('permission', () => {
		it('denies when can() returns false', () => {
			mockCan.mockReturnValue(false);
			render(
				<Can permission="anomaly:update" fallback={<span>denied</span>}>
					<button>update</button>
				</Can>,
			);
			expect(mockCan).toHaveBeenCalledWith('anomaly:update');
			expect(screen.getByText('denied')).toBeInTheDocument();
		});

		it('allows when can() returns true', () => {
			mockCan.mockReturnValue(true);
			render(<Can permission="anomaly:update">update</Can>);
			expect(screen.getByText('update')).toBeInTheDocument();
		});
	});
});
