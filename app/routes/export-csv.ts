import type { Route } from "./+types/export-csv";
import { redirect } from "react-router";
import { requireAuth } from "~/lib/session";
import { getDetailedReportsByMonth } from "~/lib/db";

export async function loader({ context, request }: Route.LoaderArgs) {
  try {
    await requireAuth(request, context.cloudflare.env.DB);

    const url = new URL(request.url);
    const monthParam = url.searchParams.get("month");
    const yearParam = url.searchParams.get("year");

    if (!monthParam || !yearParam) {
      throw new Error("Missing month or year parameter");
    }

    const month = parseInt(monthParam);
    const year = parseInt(yearParam);

    const detailedReports = await getDetailedReportsByMonth(context.cloudflare.env.DB, year, month + 1);

    const monthNames = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

    const csvHeaders = [
      "วันที่",
      "ประเภท",
      "ลูกค้า",
      "สินค้า",
      "ราคาต่อหน่วย",
      "จำนวน",
      "ยอดรวม",
      "ธนาคาร",
      "หมายเลขบัญชี",
      "วันที่เช็ค"
    ];

    let csvContent = "\uFEFF" + csvHeaders.join(",") + "\n";

    const typeLabels: { [key: string]: string } = {
      sales: "ขาย",
      bill_hold: "บิลฝากเก็บ",
      check: "เช็ค"
    };

    for (const report of detailedReports) {
      const row = [
        report.report_date,
        typeLabels[report.item_type] || report.item_type,
        `"${report.customer_name || ''}"`,
        `"${report.product_name || ''}"`,
        report.price?.toString() || '',
        report.quantity?.toString() || '',
        report.total?.toString() || '0',
        `"${report.bank_name || ''}"`,
        `"${report.account_number || ''}"`,
        report.check_date || ''
      ];
      csvContent += row.join(",") + "\n";
    }

    const totalSales = detailedReports
      .filter(r => r.item_type === 'sales')
      .reduce((sum, r) => sum + r.total, 0);

    const totalBillHold = detailedReports
      .filter(r => r.item_type === 'bill_hold')
      .reduce((sum, r) => sum + r.total, 0);

    const totalChecks = detailedReports
      .filter(r => r.item_type === 'check')
      .reduce((sum, r) => sum + r.total, 0);

    csvContent += "\nยอดรวม,,," + totalSales.toFixed(2) + ",,,,บิลฝากเก็บ,,," + totalBillHold.toFixed(2) + "\n";
    csvContent += ",,,,,,เช็ค,,," + totalChecks.toFixed(2) + "\n";
    csvContent += ",,,,,,รวมทั้งหมด,,," + (totalSales + totalBillHold + totalChecks).toFixed(2) + "\n";

    const filename = `รายงานการขาย_${monthNames[month]}_${year}.csv`;

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    if (error instanceof Response && error.status === 401) {
      return redirect("/login");
    }
    throw error;
  }
}
