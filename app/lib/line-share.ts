import { format } from "date-fns";
import { th } from "date-fns/locale";

export function generateLineShareLink(
  reportUrl: string,
  reportDate: string,
  totalAmount: number
): string {
  const formattedDate = formatThaiDate(reportDate);
  const formattedAmount = formatCurrency(totalAmount);

  const message = `รายงานการขายวันที่ ${formattedDate}
ยอดรวม: ${formattedAmount}
ดูรายงาน: ${reportUrl}`;

  return `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
}

export function openLineShare(link: string): void {
  window.open(link, "_blank");
}

function formatThaiDate(dateString: string): string {
  const date = new Date(dateString);
  return format(date, "d MMMM yyyy", { locale: th });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
