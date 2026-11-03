/**
 * 响应形状归一（页面级防御层）。
 *
 * 契约定界：后端「无数据」应返回 `[]`，但历史/异常路径仍可能出现 `null`
 * （Go 的 nil 切片会序列化成 `null`）。页面若直接对 `null` 调 `find/map/length`
 * 会抛 TypeError，被 ErrorBoundary 吞成「发生了未知错误，请刷新页面重试。」白屏
 * （2026-11-02 风险看板事故的直接成因）。
 *
 * 读取数组字段一律经 `asArray`：非数组（null/undefined/对象）一律归一为空数组，
 * 让页面走「无数据」渲染，而不是崩溃。
 *
 * 注：顶层列表请优先用 `@autional/shared` 的 `extractList` / `extractListResult`；
 * 本函数用于**嵌套在对象里的数组字段**（如仪表盘的多组统计）。
 */
export function asArray<T>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : [];
}
