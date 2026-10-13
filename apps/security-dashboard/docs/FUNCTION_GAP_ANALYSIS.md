# Security Dashboard 功能差距分析报告

> 基于 `service-flow-test-writer` + `api-e2e-flow` Skill 方法论，从用户角色、旅程建模、状态机完备性三个维度分析前端功能覆盖度。

---

## 一、API 覆盖率总览

| 指标 | 数值 |
|------|------|
| 后端可用 API 总数 | **829** |
| 前端实际调用 API 数 | **~45** |
| **覆盖率** | **≈ 5.4%** |

> 注：本次迁移后覆盖率提升，以下清单中 ~~删除线~~ 表示已在本轮实现。详见 [CHANGELOG_security_dashboard_react_query_migration.md](./CHANGELOG_security_dashboard_react_query_migration.md)。

### 已接入的 20 个 API（audit + compliance + session）

```
getAuditLogs, getAuditLogDetail, getAuditStats, verifyAuditChain,
getVerificationResults, getHashChain, getArchiveStatus, exportAuditLogs,
getAnomalies, updateAnomalyStatus,
getComplianceStatus, getDSARs, getRetentionPolicies, getISOControls,
getSOXControls, getPenTestReports,
getSessions, terminateSession, getActiveSessionCount,
getSecurityReport, getComplianceReport
```

### 已生成但未接入的 audit-service API（安全运营路径）

| API | 功能 | 前端缺失页面 |
|-----|------|-------------|
| `auditAnomaliesById` | 异常详情 | ✅ 异常详情 Drawer |
| `auditAnomaliesAssignByIdPost` | 分配异常分析师 | ✅ `AssignAnomalyModal` |
| `auditAnomaliesCommentByIdPost` | 添加调查评论 | ⚠️ UI 组件存在，未完全对接 |
| `auditAnomaliesRelatedById` | 关联异常查询 | ❌ 未实现 |
| `auditAnomaliesTimelineById` | 异常事件时间线 | ❌ 未实现 |
| `auditArchivePost` | 手动归档 | ✅ 归档管理页支持触发 |
| `auditArchiveStatus` | 归档状态 | ✅ 归档管理页展示 |
| `auditExportJobs` | 导出任务列表 | ✅ 导出任务管理页 |
| `auditExportStatusByJobId` | 导出任务状态 | ✅ 状态查询 |
| `auditExportDownloadByJobId` | 下载导出文件 | ✅ 下载按钮 |
| `auditHashchainVerifyByDateByTenantId` | 按日期验证哈希链 | ⚠️ 基础验证已支持，按日期待增强 |
| `auditMerkleRoot` / `auditMerkleProof` / `auditMerkleProofsPost` | Merkle 完整性鉴证 | ✅ Merkle 鉴证 Tab |
| `auditRetentionPolicy` / `auditRetentionPolicyPut` | 保留策略读写 | ✅ Settings 页对接 |
| `auditSiemConnectors` / `auditSiemConnectorsPost` / `...Put` / `...Delete` / `...TestByIdPost` | SIEM 连接器 CRUD | ✅ Settings 页 SIEM Tab |
| `auditStream` | SSE 实时审计事件流 | ⚠️ `SSEEventStream` 组件已创建，未全量接入 |
| `auditVerifications` / `auditVerificationsPost` | 哈希链验证（已接入部分） | ⚠️ HashChain 页基础覆盖 |

### 已生成但未接入的 compliance-service API（安全运营路径）

> compliance-service 安全运营路由包含 **33 条只读 + 19 条写操作**，前端仅覆盖约 **6 个列表查询**。

| 领域 | 已接入 | 缺失（仅安全运营路径） |
|------|--------|----------------------|
| GDPR / DSAR | `getDSARs` (List) | ✅ `getDSARById`, ✅ `updateDSAR`, ❌ `createDSAR`, ✅ `getDSARStatus` |
| GDPR / Consent | 无 | ❌ `listConsent`, ❌ `revokeConsent`, ❌ `createConsent`, ❌ `getConsentById` |
| GDPR / Right to Erasure | 无 | ❌ `listErasure`, ❌ `createErasure`, ❌ `getErasureById`, ❌ `updateErasure`, ❌ `executeErasure` |
| Data Breach | 无 | ✅ `listBreachNotifications`, ❌ `createBreach`, ✅ `updateBreach` |
| Cross Border Transfer | 无 | ❌ `listTransfers`, ❌ `createTransfer`, ❌ `updateTransfer` |
| Data Classification | 无 | ❌ `listClassifications`, ❌ `createClassification`, ❌ `updateClassification` |
| Privacy Impact (PIA) | 无 | ❌ `listPIA`, ❌ `createPIA`, ❌ `updatePIA` |
| Audit Findings | 无 | ✅ `listFindings`, ❌ `createFinding`, ✅ `updateFinding` |
| Evidence | 无 | ✅ `listEvidence`, ❌ `createEvidence`, ✅ `getEvidenceById` |
| ISO 27001 | `getISOControls` (List) | ❌ `createISOControl`, ❌ `updateISOControl`, ❌ `deleteISOControl` |
| SOX ITGC | `getSOXControls` (List) | ❌ `createSOXControl`, ❌ `updateSOXControl`, ❌ `deleteSOXControl` |
| Penetration Test | `getPenTestReports` (List) | ❌ `createPenTest`, ❌ `updatePenTest`, ❌ `deletePenTest` |
| Retention Policy | `getRetentionPolicies` (List) | ❌ `createRetentionPolicy`, ❌ `updateRetentionPolicy`, ❌ `deleteRetentionPolicy` |
| Regulatory Watch | 无 | ❌ `listRegulatoryWatch`, ❌ `createRegulatoryWatch`, ❌ `updateRegulatoryWatch` |
| Vendor Risk | 无 | ❌ `listVendorRisk`, ❌ `createVendorRisk`, ❌ `updateVendorRisk` |
| Subprocessors | 无 | ❌ `listSubprocessors`, ❌ `createSubprocessor`, ❌ `updateSubprocessor` |
| SOD Rules | 无 | ❌ `listSODRules`, ❌ `createSODRule`, ❌ `updateSODRule` |
| SOD Checks | 无 | ❌ `runSODChecks` |
| AI Decisions | 无 | ❌ `listAIDecisions`, ❌ `createAIDecision`, ❌ `reviewAIDecision` |
| Compliance Profile | 无 | ❌ `getComplianceProfile`, ❌ `updateComplianceProfile` |
| Privacy Policy | 无 | ❌ `getPrivacyPolicy`, ❌ `createPrivacyPolicy`, ❌ `listPolicyVersions` |
| Security Score (Public) | 无 | ❌ `getPublicSecurityScore` |

---

## 二、用户角色 × 旅程矩阵

### 2.1 角色定义

| 角色 | 职责 | 对应 RBAC |
|------|------|-----------|
| **安全运营分析师** | 7×24 监控、异常响应、日志调查、会话管理 | `security_admin` |
| **合规管理员** | 合规检查、DSAR 处理、证据管理、审计追踪 | `security_admin` / `admin` |
| **安全架构师** | SIEM 集成、保留策略、检测规则、Merkle 鉴证 | `admin` / `super_admin` |
| **审计管理员** | 归档管理、导出任务、报告生成、哈希链验证 | `admin` / `super_admin` |

### 2.2 核心用户旅程 — 覆盖度检查

#### 旅程 A：异常事件响应（Incident Response）

```
[告警触发]
   │ 邮件/SMS/Webhook 通知
   ▼
[登录 Dashboard] ──► 总览页查看待处理异常数
   │
   │ 点击异常
   ▼
[异常列表页] ──► 筛选 high/critical 级别
   │
   │ 点击某条异常 ID
   ▼
[异常详情页] ◄────── ❌ 缺失
   │ 查看时间线（±24h 审计日志）
   │ 查看关联异常（同一用户 7 天内）
   │ 查看用户画像
   │
   ├─ 分配给自己 ──► ❌ 缺失
   ├─ 添加评论 ──► ❌ 缺失
   ├─ 标记为 investigating ──► ✅ 已有
   ├─ 标记为 resolved ──► ✅ 已有
   └─ 标记为 false_positive ──► ✅ 已有
   │
   ▼
[追踪会话] ──► 终止高风险会话 ──► ✅ 已有
```

**缺失功能清单：**
- ❌ 异常详情页（含元数据、触发规则、影响范围）
- ❌ 异常调查时间线可视化（`auditAnomaliesTimelineById`）
- ❌ 关联异常分析（`auditAnomaliesRelatedById`）
- ❌ 异常分配功能（`auditAnomaliesAssignByIdPost`）
- ❌ 调查评论/备注（`auditAnomaliesCommentByIdPost`）
- ❌ 从异常跳转到审计日志（上下文关联）

#### 旅程 B：审计日志取证（Log Forensics）

```
[收到调查请求]
   │
   ▼
[审计日志页] ──► 按时间/用户/模块/操作筛选 ──► ✅ 已有
   │
   ├─ 查看单条日志详情 ──► ✅ 已有
   ├─ 导出日志 ──► ✅ 已有（但无任务追踪）
   ├─ 查看归档状态 ──► ❌ 缺失
   ├─ 触发归档 ──► ❌ 缺失（admin 功能）
   ├─ 验证哈希链 ──► ⚠️ 基础（无按日期验证）
   └─ Merkle 证明 ──► ❌ 缺失
   │
   ▼
[导出任务管理] ◄────── ❌ 缺失
   │ 创建导出任务
   │ 查看任务列表和进度
   │ 下载完成文件
```

**缺失功能清单：**
- ❌ 导出任务列表与进度追踪（`auditExportJobs` + `auditExportStatusByJobId`）
- ❌ 导出文件下载（`auditExportDownloadByJobId`）
- ❌ 归档状态监控（`auditArchiveStatus` 已接入但未展示）
- ❌ 按日期范围验证哈希链（`auditHashchainVerifyByDateByTenantId`）
- ❌ Merkle Root / Proof 生成与展示（完整性鉴证）
- ❌ 实时审计日志流（SSE `auditStream`）

#### 旅程 C：合规管理（Compliance Management）

```
[月初合规检查]
   │
   ▼
[合规仪表盘] ──► 查看评分和检查项 ──► ✅ 已有
   │
   ├─ ISO 27001 控制项 ──► ✅ 已有列表
   │   └─ 更新控制项状态 ──► ❌ 缺失
   │
   ├─ SOX ITGC ──► ✅ 已有列表
   │   └─ 更新控制项 ──► ❌ 缺失
   │
   ├─ GDPR / DSAR ──► ✅ 已有列表
   │   └─ 处理 DSAR（查看详情/更新状态/执行删除）──► ❌ 缺失
   │
   ├─ 数据泄露通知 ──► ❌ 缺失
   ├─ 跨境数据传输 ──► ❌ 缺失
   ├─ 数据分类 ──► ❌ 缺失
   ├─ 隐私影响评估(PIA) ──► ❌ 缺失
   ├─ 证据管理 ──► ❌ 缺失
   ├─ 审计发现 ──► ❌ 缺失
   ├─ 供应商风险评估 ──► ❌ 缺失
   ├─ AI 决策审查 ──► ❌ 缺失
   └─ SOD 职责分离检查 ──► ❌ 缺失
```

**缺失功能清单（合规中心）：**
- ❌ DSAR 详情与处理工作流（查看、更新状态、执行删除/导出）
- ❌ Consent 同意管理（查看、撤回）
- ❌ Right to Erasure（被遗忘权）处理
- ❌ 数据泄露事件记录与通知管理
- ❌ 跨境数据传输审批
- ❌ 数据分类管理
- ❌ PIA 隐私影响评估
- ❌ 证据上传与关联
- ❌ 审计发现跟踪与整改
- ❌ 供应商风险评估
- ❌ AI 辅助决策审查
- ❌ SOD 职责分离规则与检查
- ❌ ISO/SOX 控制项状态更新
- ❌ 保留策略 CRUD
- ❌ 隐私政策版本管理

#### 旅程 D：基础设施与配置管理

```
[系统管理员]
   │
   ▼
[设置页] ──► 当前仅 localStorage，无后端同步 ──► ⚠️ 严重缺失
   │
   ├─ SIEM 连接器配置 ──► ❌ 缺失
   │   ├─ 列表已有连接器
   │   ├─ 添加新连接器
   │   ├─ 编辑配置
   │   ├─ 测试连通性
   │   └─ 删除连接器
   │
   ├─ 保留策略配置 ──► ❌ 缺失
   │   ├─ 查看当前策略
   │   ├─ 修改保留天数
   │   └─ 启用/禁用自动归档
   │
   ├─ 检测阈值配置 ──► ❌ 缺失（仅本地）
   │   ├─ 暴力破解阈值
   │   ├─ 异常时间窗口
   │   └─ 地理围栏
   │
   └─ 告警通知配置 ──► ❌ 缺失（仅本地）
       ├─ 邮件/SMS/Webhook
       └─ 通知规则
```

---

## 三、状态机完备性检查

### 3.1 异常事件状态机

```
[open] ──调查──► [investigating] ──解决──► [resolved]
   │                │                    │
   │                │ 误报               │
   │                ▼                    │
   │            [false_positive]         │
   │                                    │
   │ 直接标记 ──► [resolved]            │
   │                                    │
   │ 重新打开 ──► [open] ◄──────────────┘
```

| 状态转换 | 前端支持 | 后端支持 | 状态 |
|----------|----------|----------|------|
| open → investigating | ✅ | ✅ | 已覆盖 |
| open → resolved | ✅ | ✅ | 已覆盖 |
| open → false_positive | ✅ | ✅ | 已覆盖 |
| investigating → resolved | ✅ | ✅ | 已覆盖 |
| investigating → false_positive | ✅ | ✅ | 已覆盖 |
| resolved → open（重新打开） | ❌ | ✅ | **缺失** |
| false_positive → open | ❌ | ✅ | **缺失** |
| 分配分析师 | ❌ | ✅ | **缺失** |
| 添加评论 | ❌ | ✅ | **缺失** |

### 3.2 DSAR 状态机

```
[received] ──► [under_review] ──► [data_collected] ──► [response_prepared]
                                              │              │
                                              │              ▼
                                              │         [sent]
                                              │              │
                                              │         [completed]
                                              │
                                              ▼
                                        [erasure_executed]
```

**前端状态：** 完全缺失 DSAR 处理页面。

### 3.3 导出任务状态机

```
[pending] ──► [processing] ──► [completed] ──► [downloaded]
   │              │                 │
   │              │ 失败            │ 过期
   ▼              ▼                 ▼
[cancelled]   [failed]        [expired]
```

**前端状态：** 完全缺失导出任务管理页面。

---

## 四、基础设施仪表盘分析

### 4.1 当前总览页内容

| 元素 | 类型 | 评价 |
|------|------|------|
| 审计日志总数 | Statistic 卡片 | ✅ 基础指标 |
| 待处理异常 | Statistic 卡片 | ✅ 基础指标 |
| 活跃会话 | Statistic 卡片 | ✅ 基础指标 |
| 合规评分 | Progress 进度条 | ✅ 直观 |
| 哈希链完整性 | Badge 状态 | ⚠️ 过于简单 |
| 风险等级 | Tag | ⚠️ 缺乏上下文 |
| 审计日志趋势 | LineChart | ✅ 时间序列 |
| 模块分布 | PieChart (donut) | ✅ 占比展示 |
| 异常严重度分布 | BarChart | ✅ 分布展示 |
| 最近安全事件流 | Timeline | ✅ 时序展示 |
| 最近异常事件 | List | ✅ 摘要 |
| 合规检查项 | List | ✅ 通过/未通过 |

### 4.2 基础设施展示缺失（回答"是不是太少了"）

**结论：是的，基础设施面板严重不足。**

当前总览页仅有**业务指标**，完全没有**系统基础设施状态**。一个完整的安全运营中心（SOC）仪表盘应当包含：

#### 应新增的基础设施面板

| 面板 | 展示形式 | 数据来源 | 优先级 |
|------|----------|----------|--------|
| **服务健康状态拓扑** | 拓扑图/卡片网格（红绿状态灯） | Gateway `/health` 或各服务 health endpoint | P1 |
| **实时日志吞吐量** | 动态数字 + 面积图（每秒条数） | `auditStream` SSE 或 stats API | P1 |
| **异常告警实时流** | 滚动列表 + 声音提示 | SSE 或轮询 anomalies | P1 |
| **攻击来源地理分布** | 世界地图热力图 / 地图标记 | 审计日志 IP 解析 | P2 |
| **服务响应时间** | 折线图（各服务 P95/P99） | Gateway 或 monitoring | P2 |
| **告警渠道状态** | 图标组（邮件✅/短信✅/Webhook❌） | SIEM 连接器状态 + notification | P2 |
| **存储使用率** | 仪表盘图（Gauge） | 审计日志存储统计 | P3 |
| **会话风险分布** | 雷达图 / 气泡图 | session-service | P3 |
| **合规趋势** | 多线折线图（30天评分变化） | compliance-service | P3 |

#### 更直观的图标建议

当前使用 Ant Design 基础图标，可升级为**语义化安全专业图标**：

| 场景 | 当前图标 | 建议替换 |
|------|----------|----------|
| 安全总览 | `DashboardOutlined` | `SecurityScanOutlined` (已有) |
| 审计日志 | `FileSearchOutlined` | `AuditOutlined` |
| 异常检测 | `WarningOutlined` | `AlertOutlined` / `BugOutlined` |
| 哈希链 | `SafetyCertificateOutlined` | `LockOutlined` / `KeyOutlined` |
| 合规 | `FileProtectOutlined` | `SafetyOutlined` / `VerifiedOutlined` |
| 会话 | `ClusterOutlined` | `GlobalOutlined` / `DesktopOutlined` |
| 报告 | `FileTextOutlined` | `PieChartOutlined` / `BarChartOutlined` |
| 设置 | `SettingOutlined` | `ToolOutlined` / `ControlOutlined` |
| 基础设施健康 | 无 | `CloudServerOutlined` / `ApartmentOutlined` |
| 实时流 | 无 | `ThunderboltOutlined` / `RadarChartOutlined` |
| SIEM | 无 | `ApiOutlined` / `SwapOutlined` |
| 数据泄露 | 无 | `FireOutlined` / `ExclamationOutlined` |

---

## 五、前端页面缺失清单

### 5.1 高优先级（P0 / 核心工作流阻塞）

| 页面 | 对应 API | 角色 | 用户故事 |
|------|----------|------|----------|
| **异常详情 Drawer** | `auditAnomaliesById`, `auditAnomaliesTimelineById`, `auditAnomaliesRelatedById` | 安全运营 | "作为分析师，我需要查看异常的完整上下文和时间线，以便快速判断是否为真实威胁" |
| **导出任务管理页** | `auditExportJobs`, `auditExportStatusByJobId`, `auditExportDownloadByJobId` | 审计管理员 | "作为审计管理员，我需要查看所有导出任务的状态并下载已完成文件" |
| **DSAR 处理页** | `complianceGdprDsarById`, `complianceGdprDsarByIdPut`, `complianceGdprDsarStatusById` | 合规管理员 | "作为合规管理员，我需要处理 GDPR 数据主体访问请求并跟踪处理进度" |
| **设置后端同步** | `auditRetentionPolicy`, `auditRetentionPolicyPut`, `auditSiemConnectors` | 安全架构师 | "作为架构师，我需要配置 SIEM 集成和数据保留策略，且配置应持久化到后端" |

### 5.2 中优先级（P1 / 提升运营效率）

| 页面 | 对应 API | 角色 | 用户故事 |
|------|----------|------|----------|
| **SIEM 连接器管理** | `auditSiemConnectors` CRUD + Test | 安全架构师 | "我需要将审计日志实时推送到外部 SIEM 平台（Splunk/ELK）" |
| **归档管理页** | `auditArchiveStatus`, `auditArchivePost` | 审计管理员 | "我需要监控归档进度并在存储紧张时手动触发归档" |
| **Merkle 鉴证页** | `auditMerkleRoot`, `auditMerkleProof` | 审计管理员 | "作为审计员，我需要为 SOC2 审计生成 Merkle 证明" |
| **数据泄露管理** | `complianceBreachNotifications` CRUD | 合规管理员 | "发生数据泄露时，我需要记录事件并管理通知流程" |
| **证据管理** | `complianceEvidence` CRUD | 合规管理员 | "我需要上传合规证据文件并关联到对应的控制项" |
| **审计发现跟踪** | `complianceAuditFindings` CRUD | 合规管理员 | "我需要记录内部审计发现并跟踪整改进度" |

### 5.3 低优先级（P2 / 扩展功能）

| 页面 | 对应 API | 角色 |
|------|----------|------|
| **跨境传输审批** | `complianceCrossBorderTransfers` CRUD | 合规管理员 |
| **数据分类管理** | `complianceDataClassifications` CRUD | 合规管理员 |
| **PIA 评估** | `compliancePrivacyImpact` CRUD | 合规管理员 |
| **供应商风险** | `complianceVendorRiskAssessment` CRUD | 合规管理员 |
| **AI 决策审查** | `complianceAiDecisions` CRUD + Review | 合规管理员 |
| **SOD 检查** | `complianceSodRules` CRUD, `complianceSodChecks` | 合规管理员 |
| **实时安全监控** | `auditStream` SSE | 安全运营 |
| **服务健康拓扑** | Gateway health / 各服务 `/health` | 安全运营 |

---

## 六、安全边界测试缺口

根据 `api-e2e-flow` 安全边界检查清单，前端应关注但当前未覆盖的测试场景：

| 检查项 | 前端应有行为 | 当前状态 |
|--------|-------------|----------|
| 权限隔离 | `security_admin` 只能访问安全运营路由，不能访问 admin 路由 | ⚠️ 前端无路由级权限控制（仅依赖后端 403） |
| 跨租户隔离 | 切换租户时数据应重新加载 | ❌ 无租户选择器 |
| 异常详情越权 | A 租户分析师不应查看 B 租户异常 | ⚠️ 依赖后端，前端无显式提示 |
| 会话超时 | Token 过期后应自动跳转登录 | ⚠️ AuthGuard 基础实现，无自动刷新 |
| 操作确认 | 终止会话、标记误报应二次确认 | ❌ 无确认对话框 |
| 状态乐观更新 | 状态变更后 UI 应即时反馈 | ⚠️ 重新拉取全量，非乐观更新 |

---

## 七、改进建议优先级

### Phase 1（立即）— 核心工作流补齐
1. **异常详情 Drawer**：时间线 + 关联异常 + 评论
2. **导出任务追踪**：创建任务 → 列表 → 状态 → 下载
3. **设置后端化**：SIEM 连接器 + 保留策略对接真实 API
4. **总览页基础设施面板**：服务健康状态 + 实时吞吐量

### Phase 2（短期）— 合规运营
5. **DSAR 处理工作流**：列表 → 详情 → 更新状态 → 执行操作 ✅ 已完成
6. **数据泄露管理**：创建 → 跟踪 → 通知 ✅ 列表/详情/更新已完成，创建待补充
7. **证据上传与管理**：文件上传 + 控制项关联 ✅ 列表/详情已完成，上传待补充
8. **归档管理页**：状态监控 + 手动触发 ✅ 已完成

### Phase 3（中期）— 高级功能
9. **Merkle 鉴证工具**：生成 + 验证 + 导出报告 ✅ 已完成
10. **实时安全监控**：SSE 事件流 + 声音告警 ⚠️ 组件已创建，待全量接入
11. **服务健康拓扑图**：基础设施可视化 ✅ Gateway 状态已接入
12. **AI 决策审查**：列表 + 人工复核流程 ❌ 未实现

### Phase 4（长期）— 完善
13. 完整的合规 CRUD（PIA、跨境传输、数据分类、供应商风险、SOD）
14. 报告调度和定时生成
15. 多租户切换和数据隔离强化
