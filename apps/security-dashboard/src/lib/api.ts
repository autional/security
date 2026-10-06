/**
 * Security Dashboard API 函数
 * 使用 @autional/shared 的统一 apiClient（自动 unwrap + camelCase 转换）
 *
 * 设计原则：
 * 1. 后端已实现的接口直接调用
 * 2. 所有 API 错误通过 message.error 提示用户，不静默失败
 */

import { apiClient as api } from '@autional/shared';
import * as Generated from '@autional/shared/generated/api';
import { message } from '@/lib/antd-app';

// All API functions migrated to ./api.generated.ts
// Re-export for backward compat:
export * from './api.generated';

// @generated-api-exempt: new Phase 4 endpoints — not yet in swagger TS generation
export const getRiskDashboard = Generated.adminSecurityRiskDashboard;
export const getRiskConfig = Generated.adminSecurityRiskConfig;
