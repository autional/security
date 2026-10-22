import { describe, it, expect } from 'vitest';
import { mapSessionRow } from '../session-mapper';

describe('mapSessionRow', () => {
	it('maps backend wire fields (snake) to the page contract', () => {
		const row = mapSessionRow({
			id: 's1',
			user_id: 'u1',
			ip: '10.0.0.1',
			device_type: 'desktop',
			geoip: 'Beijing, CN',
			user_agent:
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			created_at: '2026-01-01T00:00:00Z',
			last_active_at: '2026-01-01T01:00:00Z',
		});

		expect(row).toMatchObject({
			id: 's1',
			userId: 'u1',
			ipAddress: '10.0.0.1',
			device: 'desktop',
			browser: 'Chrome',
			location: 'Beijing, CN',
			createdAt: '2026-01-01T00:00:00Z',
			lastActiveAt: '2026-01-01T01:00:00Z',
			username: '',
			riskScore: null,
		});
	});

	it('accepts camelCase from the shared response interceptor', () => {
		const row = mapSessionRow({
			id: 's2',
			userId: 'u2',
			ip: '10.0.0.2',
			deviceType: 'mobile',
			geoip: 'Shanghai, CN',
			userAgent:
				'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
			createdAt: '2026-02-01T00:00:00Z',
			lastActiveAt: '2026-02-01T01:00:00Z',
		});

		expect(row.device).toBe('mobile');
		expect(row.browser).toBe('Safari');
		expect(row.ipAddress).toBe('10.0.0.2');
		expect(row.location).toBe('Shanghai, CN');
	});

	it('derives device/browser from UA when the backend omits them', () => {
		const row = mapSessionRow({
			id: 's3',
			user_agent:
				'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
		});

		expect(row.device).toBe('Tablet');
		expect(row.browser).toBe('Safari');
	});

	it('keeps numeric risk only; missing source stays null', () => {
		expect(mapSessionRow({ risk_score: 85 }).riskScore).toBe(85);
		expect(mapSessionRow({ riskScore: 60 }).riskScore).toBe(60);
		expect(mapSessionRow({ riskScore: '85' }).riskScore).toBeNull();
		expect(mapSessionRow({}).riskScore).toBeNull();
	});
});
