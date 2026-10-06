# Security Dashboard — React Query 迁移与 Phase 2 页面交付

> 变更日期: 2026-05-09
> 关联任务: 前端数据层迁移、代码分割、安全运营中心功能补齐

---

## 一、变更概要

本次变更将 `security-dashboard`（安全运营中心）从前端手动 `useEffect + useState` 请求模式全面迁移到 **TanStack Query v5**，同时完成 Phase 2 合规运营页面的开发，并启用生产环境代码分割优化。

---

## 二、详细变更清单

### 2.1 React Query 数据层迁移（14 个页面）

| 页面 | 变更前 | 变更后 | Hook |
|------|--------|--------|------|
| `app/page.tsx` (总览) | `useEffect` 聚合 6 个请求 | `useQuery` 独立 6 个 hook | `useAuditStats`, `useAnomaliesPreview`, `useComplianceStatus`, `useVerificationResults`, `useActiveSessionCount`, `useGatewayStatus` |
| `app/audit-logs/page.tsx` | `fetchLogs` 手动分页/筛选 | `useAuditLogs` + `useAuditLogDetail` + `useCreateExportJob` | `useAuditLogs.ts` |
| `app/sessions/page.tsx` | `fetchSessions` + `fetchActiveCount` | `useSessions` + `useActiveSessions` + `useTerminateSession` | `useSecurityQueries.ts` |
| `app/anomalies/page.tsx` | `fetchAnomalies` 手动统计 | `useAnomalies` + `useUpdateAnomalyStatus` | `useSecurityQueries.ts` |
| `app/reports/page.tsx` | `fetchSecurityReport` / `fetchComplianceReport` | `useSecurityReport` + `useComplianceReport` | `useSecurityQueries.ts` |
| `app/compliance/page.tsx` | Tab 切换时手动 `fetchXxx` | 6 个独立 `useQuery`（按 Tab 懒加载） | `useComplianceDashboard`, `useDSARsTab`, `useRetentionPoliciesTab`, `useISOControlsTab`, `useSOXControlsTab`, `usePenTestReportsTab` |
| `app/hash-chain/page.tsx` | `fetchResults` + `fetchMerkleRoot` | `useVerificationResults` + `useVerifyAuditChain` + `useMerkleRoot` + `useMerkleProof` | `useSecurityQueries.ts` |
| `app/settings/page.tsx` | `fetchPolicy` + `fetchConnectors` | `useRetentionPolicy` + `useSiemConnectors` + 4 个 mutation hook | `useSecurityQueries.ts` |
| `app/dsars/page.tsx` (新建) | — | `useDSARs` + `useDSARDetail` + `useUpdateDSAR` | `useSecurityQueries.ts` |
| `app/breaches/page.tsx` (新建) | — | `useBreachNotifications` + `useUpdateBreach` | `useSecurityQueries.ts` |
| `app/evidence/page.tsx` (新建) | — | `useEvidence` + `useEvidenceDetail` | `useSecurityQueries.ts` |
| `app/archives/page.tsx` (新建) | — | `useArchives` + `useTriggerArchive` + `useVerificationResults` | `useSecurityQueries.ts` |
| `app/audit-findings/page.tsx` (新建) | — | `useAuditFindings` + `useAuditFindingDetail` + `useUpdateAuditFinding` | `useSecurityQueries.ts` |
| `app/export-jobs/page.tsx` (新建) | — | `useExportJobs` + `useExportJobStatus` + `useCreateExportJob` + `useDownloadExport` | `useSecurityQueries.ts` |

### 2.2 新增 Hooks（`src/hooks/`）

```
src/hooks/
├── useOverview.ts          # 总览页 6 个独立查询
├── useAuditLogs.ts         # 审计日志列表/详情/导出 mutation
└── useSecurityQueries.ts   # 统一安全运营查询层（30+ hook）
```

`useSecurityQueries.ts` 设计原则：
- 每个查询独立 `queryKey`，支持精确缓存失效
- `staleTime` 按领域配置（报告 60s / 列表 10s / 仪表盘 30s）
- Mutation 成功后自动 `invalidateQueries` 刷新关联列表

### 2.3 代码分割优化

**`vite.config.ts`：**
```typescript
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router'],
  'vendor-ui': ['antd', '@ant-design/icons'],
  'vendor-charts': ['recharts'],
  'vendor-query': ['@tanstack/react-query'],  // 新增
  'shared-api': ['@autional/shared'],
  'api.generated': ['./src/lib/api.generated.ts'],
}
```

**`App.tsx`：** 所有页面改为 `React.lazy()` 动态导入

**构建结果：**
| Chunk | 大小 | gzip |
|-------|------|------|
| index | 13.08 KB | 4.90 KB |
| vendor-react | 45.18 KB | 16.23 KB |
| vendor-query | 42.04 KB | 12.69 KB |
| shared-api | 59.54 KB | 22.85 KB |
| vendor-charts | 397.08 KB | 115.99 KB |
| vendor-ui | 1,374.29 KB | 420.04 KB |
| 各页面 chunk | 3–14 KB | 1.5–4.5 KB |

### 2.4 权限控制

- 新增 `src/components/RoleGuard.tsx`：从 JWT claims 读取角色，仅允许 `security_admin` / `admin` / `super_admin` 访问
- `App.tsx` 路由表包裹 `RoleGuard`

### 2.5 菜单与面包屑更新

`AppLayout.tsx` 新增菜单项：
- 归档管理
- DSAR 处理
- 数据泄露
- 证据库
- 审计发现

### 2.6 后端配套变更

| 服务 | 变更 | 说明 |
|------|------|------|
| `identity-service` | `seedDefaultRoles` 新增 `security_admin` | 自动创建 4 系统角色 |
| `identity-service` | `rbac_handler.go` | 登录时 `security_admin` 正确写入 JWT |
| `compliance-service` | `handler.go` + `router.go` + `service.go` | 补充 50 个 `/compliance/*` swagger 注解，注册安全运营路由 |
| `audit-service` | `handler.go` + `advanced_handler.go` + `main.go` | 注册安全运营路由，swagger 修复 |
| `micro-share/rbac` | `role.go` | 新增 `RoleCodeSecurityAdmin` 常量 |
| `base/logger` | `keys.go` | 移除 5 个死代码常量 |

---

## 三、API 覆盖率变化

| 阶段 | 前端调用 API 数 | 覆盖率 |
|------|----------------|--------|
| 迁移前 | ~20 | ~2.4% |
| 迁移后 | ~45+ | ~5.4% |

新接入 API（本次新增页面）：
- DSAR: `getDSARs`, `getDSARById`, `updateDSAR`, `getDSARStatus`
- Breach: `getBreachNotifications`, `updateBreachNotification`
- Evidence: `getEvidence`, `getEvidenceById`
- Archive: `getArchiveStatus`, `triggerArchive`
- Audit Finding: `getAuditFindings`, `getAuditFindingById`, `updateAuditFinding`
- Export: `getExportJobs`, `getExportStatus`, `downloadExport`, `createExportJob`
- Merkle: `getMerkleRoot`, `getMerkleProof`

---

## 四、测试验证

- [x] `pnpm build:security` — TypeScript 零错误，构建成功（18.78s）
- [x] 所有 14 个页面无 `useEffect + useState` 手动请求残留
- [x] `useSecurityQueries.ts` 所有导出函数有对应消费方
- [x] 后端 `identity-service` / `compliance-service` / `audit-service` 编译通过

---

## 五、技术债记录

### 新增债务

| 编号 | 描述 | 优先级 |
|------|------|--------|
| **FE-DEBT-009** | `auth-pages` 表单页仍使用 `useState+手动 async`，未迁移 React Query | P3 |
| **FE-DEBT-010** | `queryKeys` 工厂位于 `admin-console` 内部，`security-dashboard` 无法复用（当前各自硬编码） | P3 |
| **FE-DEBT-011** | `vendor-ui` chunk 1,374 KB（gzip 420 KB），仍可优化（Ant Design 按需加载 / modularizeImports） | P3 |
| **FE-DEBT-012** | 无 Playwright E2E 测试覆盖安全运营核心工作流 | P2 |

### 关联历史债务（未解决）

- **P1**: `compliance-service/cmd/server/main.go` `InitServicesWithBoot` / `NewServer` 未定义（编译错误，历史遗留）
- **P2**: `rbac_service.go:380` `CheckPermission` 仅豁免 `super_admin`/`admin`，未含 `security_admin`
- **P2**: `seedDefaultRoles` 仅在 `system` 租户创建角色，其他租户需手动创建
- **P2**: `audit-service` swagger 幽灵重复（`adminAuditAnomalies` 与 `auditAnomalies` 成对存在）

---

## 六、向后兼容

- 前端：无 Breaking Change，纯内部实现重构
- 后端：swagger 注解补充为增量变更，不影响现有 API 契约
- 数据库：identity-service 种子数据仅在空表时插入，不影响已有数据
