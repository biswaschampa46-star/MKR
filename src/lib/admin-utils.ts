export { formatDateTime, formatTaka, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, formatDate } from "@/lib/utils";

export function stripUndefined(value: string | null | undefined): string {
  return value ?? "";
}
