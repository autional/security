import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from '@autional/ui';
import { isRetryableError } from '@autional/shared';
import { AntdAppProvider } from './lib/antd-app';
import App from './App';
import './non-tenant-segments';
import './i18n';
import './app/globals.css';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30 * 1000,
			refetchOnWindowFocus: false,
			// 重试策略唯一实现：只重试「重试可能改变结果」的错误（@autional/shared/utils/query-state
			// 的 isRetryableError：无状态码 / 5xx / 408 / 429）；4xx（含 404）一律不重试。
			// ⚠️ 页面/hook 不得再写 retry / retryDelay 覆盖本策略。
			retry: (failureCount, error) => isRetryableError(error) && failureCount < 1,
		},
	},
});

const root = document.getElementById('root');
if (root) {
	createRoot(root).render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<ThemeProvider storageKey="security-dashboard-theme">
					{/* basename 恒为 "/"（ADR-1，AC-005）：路由层持有 /:tenantSlug，
					    动态 basename 剥离 slug 会破坏 /:tenantSlug 匹配；SPA 导航必须带 slug 前缀。 */}
					<BrowserRouter basename="/">
						<AntdAppProvider>
							<App />
						</AntdAppProvider>
					</BrowserRouter>
				</ThemeProvider>
			</QueryClientProvider>
		</StrictMode>,
	);
}
