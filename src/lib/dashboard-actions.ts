export const DASHBOARD_USER_SEARCH_ID = "dashboard-user-search";

export type DashboardActionResult =
  | { ok: true; filename?: string }
  | { ok: false; error: string };

export async function refreshDashboardData(
  username: string,
): Promise<DashboardActionResult> {
  const login = username.trim();
  if (!login) {
    return { ok: false, error: "Username is required" };
  }

  const response = await fetch("/api/cache/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: login }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: body?.error ?? "Could not refresh data" };
  }

  return { ok: true };
}

export async function exportDashboardData(
  username: string,
): Promise<DashboardActionResult> {
  const login = username.trim();
  if (!login) {
    return { ok: false, error: "Username is required" };
  }

  const response = await fetch(`/api/export/${encodeURIComponent(login)}`);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: body?.error ?? "Export failed" };
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const filenameMatch = disposition?.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] ?? `gitinsight-${login}.json`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  return { ok: true, filename };
}
