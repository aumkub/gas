import type { Route } from "./+types/share";
import { useLoaderData } from "react-router";
import { getSharedLink, getSalesItemsByReport, getBillHoldItemsByReport, getCheckItemsByReport } from "~/lib/db";
import { ReportSummary } from "~/components/ReportSummary";
import { Heading } from "~/components/Heading";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ดูรายงาน" },
    { name: "description", content: "ดูรายงานการขายประจำวัน" },
  ];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const linkId = pathParts[pathParts.length - 1];

  if (!linkId) {
    throw new Response("Not Found", { status: 404 });
  }

  const db = context.cloudflare.env.DB;
  const sharedLink = await getSharedLink(db, linkId);

  if (!sharedLink) {
    throw new Response("Not Found", { status: 404 });
  }

  const reportId = sharedLink.report_id;

  // Load all related data
  const [salesItems, billHoldItems, checkItems] = await Promise.all([
    getSalesItemsByReport(db, reportId),
    getBillHoldItemsByReport(db, reportId),
    getCheckItemsByReport(db, reportId),
  ]);

  // Get report date from first item or use current date
  const reportDate =
    salesItems[0]?.report_date ||
    billHoldItems[0]?.report_date ||
    checkItems[0]?.report_date ||
    new Date().toISOString().split("T")[0];

  return {
    reportDate,
    salesItems,
    billHoldItems,
    checkItems,
  };
}

export default function ShareReport({ loaderData }: Route.ComponentProps) {
  const { reportDate, salesItems, billHoldItems, checkItems } = loaderData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative mb-6 overflow-hidden rounded-lg border border-gray-100 bg-white p-6 text-center shadow-md">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 opacity-60" />
          <Heading
            styleLevel={2}
            className="relative z-10 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
          >
            รายงานการขายประจำวัน (สาธารณะ)
          </Heading>
          <p className="text-gray-600 mt-2">
            รายงานนี้เปิดเผยต่อสาธารณะ สามารถแชร์ลิงก์นี้เพื่อให้ผู้อื่นดูได้
          </p>
        </div>

        <ReportSummary
          reportDate={reportDate}
          salesItems={salesItems}
          billHoldItems={billHoldItems}
          checkItems={checkItems}
          isReadOnly={true}
        />
      </div>
    </div>
  );
}
