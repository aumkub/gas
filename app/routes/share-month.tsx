import type { Route } from "./+types/share-month";
import { Link, useParams } from "react-router";
import {
  getSharedMonthlyLink,
  getMonthlySummary,
  getReportGrandTotalsForMonth,
  getReportByDate,
  getSalesItemsByReport,
  getBillHoldItemsByReport,
  getCheckItemsByReport,
} from "~/lib/db";
import { ReportSummary } from "~/components/ReportSummary";
import { Heading } from "~/components/Heading";
import { Card } from "~/components/Card";
import { formatCurrency } from "~/lib/calculations";
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  parseISO,
  isWithinInterval,
  addDays,
  subDays,
} from "date-fns";
import { th } from "date-fns/locale";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartColumn,
  faChevronLeft,
  faChevronRight,
  faCalendarDay,
} from "@fortawesome/free-solid-svg-icons";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function meta({}: Route.MetaArgs) {
  return [
    { title: "รายงานการขายรายเดือน (สาธารณะ)" },
    { name: "description", content: "ดูสรุปการขายรายวันทั้งเดือน" },
  ];
}

export async function loader({ context, request, params }: Route.LoaderArgs) {
  const linkId = params.id;
  if (!linkId) {
    throw new Response("Not Found", { status: 404 });
  }

  const db = context.cloudflare.env.DB;
  const link = await getSharedMonthlyLink(db, linkId);
  if (!link) {
    throw new Response("Not Found", { status: 404 });
  }

  const { year, month } = link;
  const [monthlySummary, totalsByDate] = await Promise.all([
    getMonthlySummary(db, year, month),
    getReportGrandTotalsForMonth(db, year, month),
  ]);

  const billHoldPlusCashMonth =
    Number(monthlySummary.total_bill_hold) +
    Number(monthlySummary.total_cash_sales);

  const totalMap = new Map(
    totalsByDate.map((t) => [t.report_date, Number(t.grand_total)])
  );

  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const chartSeries = calendarDays.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return { date: key, grandTotal: totalMap.get(key) ?? 0 };
  });

  const url = new URL(request.url);
  let selectedDate = url.searchParams.get("date");
  const inMonth = (d: string) => {
    try {
      const dt = parseISO(d);
      return isWithinInterval(dt, { start: monthStart, end: monthEnd });
    } catch {
      return false;
    }
  };

  if (!selectedDate || !inMonth(selectedDate)) {
    selectedDate =
      totalsByDate[0]?.report_date ?? format(monthStart, "yyyy-MM-dd");
  }

  const report = await getReportByDate(db, selectedDate);
  const [salesItems, billHoldItems, checkItems] = report
    ? await Promise.all([
        getSalesItemsByReport(db, report.id),
        getBillHoldItemsByReport(db, report.id),
        getCheckItemsByReport(db, report.id),
      ])
    : [[], [], []];

  return {
    year,
    month,
    monthlySummary: {
      total_sales: Number(monthlySummary.total_sales),
      total_cash_sales: Number(monthlySummary.total_cash_sales),
      total_bill_hold: Number(monthlySummary.total_bill_hold),
      total_checks: Number(monthlySummary.total_checks),
      total_reports: Number(monthlySummary.total_reports),
    },
    billHoldPlusCashMonth,
    chartSeries,
    selectedDate,
    reportDates: totalsByDate.map((t) => t.report_date),
    salesItems,
    billHoldItems,
    checkItems,
    hasReportForSelectedDay: Boolean(report),
  };
}

export default function ShareMonth({ loaderData }: Route.ComponentProps) {
  const {
    year,
    month,
    monthlySummary,
    billHoldPlusCashMonth,
    chartSeries,
    selectedDate,
    reportDates,
    salesItems,
    billHoldItems,
    checkItems,
    hasReportForSelectedDay,
  } = loaderData;

  const params = useParams();
  const linkId = params.id ?? "";
  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: th });
  const selected = parseISO(selectedDate);
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(monthStart);
  const dayRange = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const reportSet = new Set(reportDates);

  const prevDate = format(
    isWithinInterval(subDays(selected, 1), { start: monthStart, end: monthEnd })
      ? subDays(selected, 1)
      : selected,
    "yyyy-MM-dd"
  );
  const nextDate = format(
    isWithinInterval(addDays(selected, 1), { start: monthStart, end: monthEnd })
      ? addDays(selected, 1)
      : selected,
    "yyyy-MM-dd"
  );

  const barData = {
    labels: chartSeries.map((d) => format(parseISO(d.date), "d", { locale: th })),
    datasets: [
      {
        label: "ยอดรวมวันนั้น",
        data: chartSeries.map((d) => d.grandTotal),
        backgroundColor: chartSeries.map((d) =>
          d.date === selectedDate
            ? "rgba(59, 130, 246, 0.85)"
            : "rgba(147, 51, 234, 0.45)"
        ),
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "ยอดรวมรายวัน (ขาย + บิลฝากเก็บ + เช็ค)",
        font: { size: 14 },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { raw: unknown }) => {
            const v = typeof ctx.raw === "number" ? ctx.raw : Number(ctx.raw);
            return formatCurrency(v);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: string | number) =>
            "฿" + Number(value).toLocaleString("th-TH"),
        },
      },
    },
  };

  const dayLink = (dateStr: string) => `/share/month/${linkId}?date=${dateStr}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 opacity-70" />
          <div className="relative z-10 text-center">
            <Heading
              styleLevel={2}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent"
            >
              รายงานการขายรายเดือน (สาธารณะ)
            </Heading>
            <p className="mt-2 text-lg font-semibold text-gray-800">{monthLabel}</p>
            <p className="mt-1 text-sm text-gray-600">
              เลือกวันเพื่อดูรายละเอียดรายงานประจำวัน กราฟแสดงยอดรวมของแต่ละวันที่มีข้อมูล
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
            <p className="text-sm font-medium text-emerald-800">ยอดขายรวมเดือน</p>
            <p className="mt-1 text-xl font-bold text-emerald-900">
              {formatCurrency(monthlySummary.total_sales)}
            </p>
          </Card>
          <Card className="border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-4">
            <p className="text-sm font-medium text-teal-800">เงินสด</p>
            <p className="mt-1 text-xl font-bold text-teal-900">
              {formatCurrency(monthlySummary.total_cash_sales)}
            </p>
          </Card>
          <Card className="border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
            <p className="text-sm font-medium text-amber-900">บิลฝากเก็บ</p>
            <p className="mt-1 text-xl font-bold text-amber-950">
              {formatCurrency(monthlySummary.total_bill_hold)}
            </p>
          </Card>
          <Card
            className="border border-indigo-200 p-4 text-white bg-gradient-to-br from-indigo-50 to-white"
          >
            <p className="text-sm font-medium text-indigo-900">
              บิลฝากเก็บ + เงินสด
            </p>
            <p className="mt-1 text-2xl font-bold text-indigo-900">
              {formatCurrency(billHoldPlusCashMonth)}
            </p>
            {/* <p className="mt-2 text-xs text-indigo-800">
              {monthlySummary.total_reports} วันที่มีรายงาน
            </p> */}
          </Card>
          <Card className="border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4">
            <p className="text-sm font-medium text-violet-900">เช็ค</p>
            <p className="mt-1 text-xl font-bold text-violet-950">
              {formatCurrency(monthlySummary.total_checks)}
            </p>
          </Card>
        </div>

        <Card className="border border-gray-100 p-4 shadow-md">
          <div className="mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faChartColumn} className="text-indigo-600" />
            <Heading styleLevel={3} className="text-lg">
              สรุปรายวันในเดือน
            </Heading>
          </div>
          <div className="h-72 w-full">
            <Bar data={barData} options={chartOptions} />
          </div>
        </Card>

        <Card className="border border-gray-100 p-4 shadow-md">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCalendarDay} className="text-indigo-600" />
              <Heading styleLevel={3} className="text-lg">
                เลือกวัน
              </Heading>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={dayLink(prevDate)}
                prefetch="intent"
                className="inline-flex h-9 min-h-9 items-center justify-center rounded-lg border border-[#111827] bg-transparent px-3 text-sm font-medium text-[#111827] hover:bg-[#1118270A]"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="mr-1 h-3 w-3" />
                วันก่อน
              </Link>
              <Link
                to={dayLink(nextDate)}
                prefetch="intent"
                className="inline-flex h-9 min-h-9 items-center justify-center rounded-lg border border-[#111827] bg-transparent px-3 text-sm font-medium text-[#111827] hover:bg-[#1118270A]"
              >
                วันถัดไป
                <FontAwesomeIcon icon={faChevronRight} className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 pt-1 [-webkit-overflow-scrolling:touch]">
            {dayRange.map((d) => {
              const dateStr = format(d, "yyyy-MM-dd");
              const active = dateStr === selectedDate;
              const has = reportSet.has(dateStr);
              return (
                <Link
                  key={dateStr}
                  to={dayLink(dateStr)}
                  prefetch="intent"
                  className={`shrink-0 rounded-xl border-2 px-3 py-2 text-center text-sm font-semibold transition-all ${
                    active
                      ? "border-indigo-500 bg-indigo-600 text-white shadow-md"
                      : has
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:border-emerald-400"
                        : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <div className="text-xs font-normal opacity-80">
                    {format(d, "EEE", { locale: th })}
                  </div>
                  <div>{format(d, "d", { locale: th })}</div>
                </Link>
              );
            })}
          </div>
          <p className="mt-2 text-center text-sm text-gray-600">
            กำลังดู:{" "}
            <span className="font-semibold text-gray-900">
              {format(selected, "d MMMM yyyy", { locale: th })}
            </span>
          </p>
        </Card>

        {hasReportForSelectedDay ? (
          <ReportSummary
            reportDate={selectedDate}
            salesItems={salesItems}
            billHoldItems={billHoldItems}
            checkItems={checkItems}
            isReadOnly
          />
        ) : (
          <Card className="border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">
              ไม่มีรายงานในวันที่ {format(selected, "d MMMM yyyy", { locale: th })}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              เลือกวันอื่นที่มีจุดสีเขียวในแถบด้านบน หรือใช้ปุ่มวันก่อน / วันถัดไป
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
