/** Unknown observations are blocking. Only explicitly harmless codes are allowed. */
const informational = new Set([
  "media_export_marker_present",
  "roundup_promotional_context",
]);
export function issueSeverity(code: string): "blocking" | "informational" {
  return informational.has(code) ? "informational" : "blocking";
}
export function blockingIssues(issues: string[]) {
  return issues.filter((code) => issueSeverity(code) === "blocking");
}
export function issueAudit(issues: string[]) {
  return [...new Set(issues)].map((code) => ({
    code,
    severity: issueSeverity(code),
  }));
}
