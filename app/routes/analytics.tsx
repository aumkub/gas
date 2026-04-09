import type { Route } from "./+types/analytics";
import { useState } from "react";
import { requireAuth } from "~/lib/session";
import {
  getDailySalesTotals,
  getProductSalesRanking,
  getCustomerSalesRanking,
  getMonthlySummary,
} from "~/lib/db";
import { format, subMonths } from "date-fns";
import { th } from "date-fns/locale";
import { Button } from "~/components/ui/button";
import { Heading } from "~/components/Heading";
import { Card } from "~/components/Card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faBox,
  faUsers,
  faCalendarDays,
  faArrowLeft,
  faFileLines,
} from "@fortawesome/free-solid-svg-icons";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function meta({}: Route.MetaArgs) {
  return [
    { title: "รายงานวิเคราะห์" },
    { name: "description", content: "รายงานวิเคราะห์การขาย" },
  ];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  await requireAuth(request, context.cloudflare.env.DB);
  const url = new URL(request.url);
  const startDate = url.searchParams.get("start") || format(subMonths(new Date(), 1), "yyyy-MM-dd");
  const endDate = url.searchParams.get("end") || format(new Date(), "yyyy-MM-dd");

  const db = context.cloudflare.env.DB;

  const [dailySales, productRanking, customerRanking, monthlySummary] = await Promise.all([
    getDailySalesTotals(db, startDate, endDate),
    getProductSalesRanking(db, startDate, endDate, 10),
    getCustomerSalesRanking(db, startDate, endDate, 10),
    getMonthlySummary(db, new Date().getFullYear(), new Date().getMonth() + 1),
  ]);

  return {
    dailySales,
    productRanking,
    customerRanking,
    monthlySummary,
    startDate,
    endDate,
  };
}

export default function Analytics({ loaderData }: Route.ComponentProps) {
  const {
    dailySales,
    productRanking,
    customerRanking,
    monthlySummary,
    startDate,
    endDate,
  } = loaderData;

  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  const handleDateFilter = () => {
    window.location.href = `/analytics?start=${customStart}&end=${customEnd}`;
  };

  const handleQuickFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    window.location.href = `/analytics?start=${format(start, "yyyy-MM-dd")}&end=${format(end, "yyyy-MM-dd")}`;
  };

  // Chart data preparation
  const dailySalesChartData = {
    labels: dailySales.map((d) => format(new Date(d.date), "d MMM", { locale: th })),
    datasets: [
      {
        label: "ยอดขาย",
        data: dailySales.map((d) => d.total_sales),
        borderColor: "rgb(147, 51, 234)",
        backgroundColor: "rgba(147, 51, 234, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const productRankingChartData = {
    labels: productRanking.map((p) => p.product_name || "ไม่ระบุ"),
    datasets: [
      {
        label: "ยอดขาย",
        data: productRanking.map((p) => p.total_amount),
        backgroundColor: [
          "rgba(147, 51, 234, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(236, 72, 153, 0.8)",
          "rgba(14, 165, 233, 0.8)",
          "rgba(168, 85, 247, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(251, 146, 60, 0.8)",
        ],
        borderWidth: 0,
      },
    ],
  };

  const customerRankingChartData = {
    labels: customerRanking.map((c) => c.customer_name || "ไม่ระบุ"),
    datasets: [
      {
        label: "ยอดซื้อ",
        data: customerRanking.map((c) => c.total_amount),
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `฿${context.raw.toLocaleString("th-TH")}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return "฿" + value.toLocaleString("th-TH");
          },
        },
      },
    },
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => (window.location.href = "/")}
            kind="tertiary"
            className="hover:bg-gray-200 mb-4"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2 h-4 w-4" />
            กลับหน้าหลัก
          </Button>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <FontAwesomeIcon icon={faChartLine} className="text-2xl text-white" />
                </div>
                <div>
                  <Heading styleLevel={1} className="text-2xl md:text-3xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    รายงานวิเคราะห์การขาย
                  </Heading>
                  <p className="text-gray-600 text-sm mt-1">
                    วันที่ {format(new Date(startDate), "d MMMM yyyy", { locale: th })} -{" "}
                    {format(new Date(endDate), "d MMMM yyyy", { locale: th })}
                  </p>
                </div>
              </div>
            </div>

            {/* Date Filters */}
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleQuickFilter(7)}
                  size="compact"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
                >
                  7 วันล่าสุด
                </Button>
                <Button
                  onClick={() => handleQuickFilter(30)}
                  size="compact"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
                >
                  30 วันล่าสุด
                </Button>
                <Button
                  onClick={() => handleQuickFilter(90)}
                  size="compact"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
                >
                  90 วันล่าสุด
                </Button>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    วันที่เริ่มต้น
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 !py-0 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    วันที่สิ้นสุด
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 !py-0 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleDateFilter}
                    className="!py-3 !min-h-[48px] !max-h-[48px] bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
                  >
                    <FontAwesomeIcon icon={faCalendarDays} className="mr-2 h-4 w-4" />
                    กรองข้อมูล
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">ยอดขายเดือนนี้</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(monthlySummary.total_sales)}</p>
              </div>
              <FontAwesomeIcon icon={faChartLine} className="text-3xl text-purple-200" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">บิลฝากเก็บ</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(monthlySummary.total_bill_hold)}</p>
              </div>
              <FontAwesomeIcon icon={faBox} className="text-3xl text-blue-200" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">เช็ค</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(monthlySummary.total_checks)}</p>
              </div>
              <FontAwesomeIcon icon={faUsers} className="text-3xl text-green-200" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">จำนวนรายงาน</p>
                <p className="text-2xl font-bold mt-1">{monthlySummary.total_reports}</p>
              </div>
              <FontAwesomeIcon icon={faFileLines} className="text-3xl text-orange-200" />
            </div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Sales Chart */}
          <Card className="p-6">
            <Heading styleLevel={3} className="mb-4 text-lg">
              ยอดขายรายวัน
            </Heading>
            <div className="h-80">
              <Line data={dailySalesChartData} options={chartOptions} />
            </div>
          </Card>

          {/* Product Ranking Chart */}
          <Card className="p-6">
            <Heading styleLevel={3} className="mb-4 text-lg">
              สินค้าขายดี ({productRanking.length} อันดับแรก)
            </Heading>
            <div className="h-80">
              <Bar data={productRankingChartData} options={chartOptions} />
            </div>
          </Card>

          {/* Customer Ranking Chart */}
          <Card className="p-6 lg:col-span-2">
            <Heading styleLevel={3} className="mb-4 text-lg">
              ลูกค้ายอดซื้อสูงสุด ({customerRanking.length} อันดับแรก)
            </Heading>
            <div className="h-80">
              <Bar data={customerRankingChartData} options={chartOptions} />
            </div>
          </Card>
        </div>

        {/* Product Ranking Table */}
        <Card className="mt-6 p-6">
          <Heading styleLevel={3} className="mb-4 text-lg">
            รายละเอียดสินค้าขายดี
          </Heading>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">อันดับ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">สินค้า</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">จำนวน</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">ยอดขาย</th>
                </tr>
              </thead>
              <tbody>
                {productRanking.map((product, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                        index === 0 ? "bg-yellow-100 text-yellow-700" :
                        index === 1 ? "bg-gray-100 text-gray-700" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-gray-50 text-gray-600"
                      } font-bold`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{product.product_name}</td>
                    <td className="px-4 py-3 text-sm text-right">{product.total_quantity}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-purple-600">
                      {formatCurrency(product.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
