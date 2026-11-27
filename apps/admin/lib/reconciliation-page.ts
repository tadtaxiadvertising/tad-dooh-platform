export interface ReconciliationRow {
  id: string;
  period: string;
  deviceId: string | null;
  driver: { fullName: string } | null;
  totalPlaybacks: number;
  revenueContracted: number;
  revenueReceived: number;
  payrollDue: number;
  payrollPaid: number;
  hasDiscrepancy: boolean;
  discrepancyType: string;
  discrepancyAmount: number;
}

export interface ReconciliationPage {
  period: string;
  data: ReconciliationRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRow(value: unknown, period: string): value is ReconciliationRow {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.period === period &&
    (value.deviceId === null || typeof value.deviceId === "string") &&
    (value.driver === null ||
      (isRecord(value.driver) && typeof value.driver.fullName === "string")) &&
    isCount(value.totalPlaybacks) &&
    isAmount(value.revenueContracted) &&
    isAmount(value.revenueReceived) &&
    isAmount(value.payrollDue) &&
    isAmount(value.payrollPaid) &&
    typeof value.hasDiscrepancy === "boolean" &&
    typeof value.discrepancyType === "string" &&
    isAmount(value.discrepancyAmount)
  );
}

export function parseReconciliationPage(
  value: unknown,
  period: string,
  page: number,
  pageSize: number,
): ReconciliationPage | null {
  if (!isRecord(value)) return null;
  const { data, total, totalPages } = value;
  if (
    value.period !== period ||
    value.page !== page ||
    value.pageSize !== pageSize ||
    !isCount(page) ||
    page < 1 ||
    !isCount(pageSize) ||
    pageSize < 1 ||
    pageSize > 500 ||
    !isCount(total) ||
    !isCount(totalPages) ||
    totalPages !== Math.ceil(total / pageSize) ||
    !Array.isArray(data) ||
    data.length !==
      Math.max(0, Math.min(pageSize, total - (page - 1) * pageSize))
  ) {
    return null;
  }
  const rows: ReconciliationRow[] = [];
  const ids = new Set<string>();
  for (const row of data) {
    if (!isRow(row, period) || ids.has(row.id)) return null;
    ids.add(row.id);
    rows.push(row);
  }
  return { period, data: rows, total, page, pageSize, totalPages };
}
