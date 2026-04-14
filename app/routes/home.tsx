import type { Route } from "./+types/home";
import { Link, redirect, useNavigate, Form } from "react-router";
import { requireAuth } from "~/lib/session";
import { getReportsByMonth } from "~/lib/db";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday, getMonth, getYear } from "date-fns";
import { th } from "date-fns/locale";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faBuildingColumns,
  faChevronLeft,
  faChevronRight,
  faEye,
  faHand,
  faPenToSquare,
  faRightFromBracket,
  faChartLine,
  faFileLines,
  faUsers,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "หน้าหลัก" },
    { name: "description", content: "รายงานการขายประจำวัน" },
  ];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  try {
    const { user } = await requireAuth(request, context.cloudflare.env.DB);
    const url = new URL(request.url);
    const monthParam = url.searchParams.get("month");
    const yearParam = url.searchParams.get("year");

    const now = new Date();
    const currentMonth = monthParam ? parseInt(monthParam) : getMonth(now);
    const currentYear = yearParam ? parseInt(yearParam) : getYear(now);

    const reports = await getReportsByMonth(context.cloudflare.env.DB, currentYear, currentMonth + 1);

    return {
      user,
      reports,
      currentMonth,
      currentYear,
    };
  } catch (error) {
    if (error instanceof Response && error.status === 401) {
      return redirect("/login");
    }
    throw error;
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { user, reports, currentMonth, currentYear } = loaderData;
  const navigate = useNavigate();
  const monthStart = startOfMonth(new Date(currentYear, currentMonth));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const reportDates = new Set(reports.map((r) => r.report_date));

  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const goToPrevMonth = () => {
    const date = new Date(currentYear, currentMonth - 1);
    navigate(`/?month=${getMonth(date)}&year=${getYear(date)}`);
  };

  const goToNextMonth = () => {
    const date = new Date(currentYear, currentMonth + 1);
    navigate(`/?month=${getMonth(date)}&year=${getYear(date)}`);
  };

  const formatDate = (date: Date) => {
    return format(date, "yyyy-MM-dd");
  };

  const getDayName = (date: Date) => {
    return format(date, "EEEE", { locale: th });
  };

  const getDayNumber = (date: Date) => {
    return format(date, "d", { locale: th });
  };

  const getMonthYearName = () => {
    return format(monthStart, "MMMM yyyy", { locale: th });
  };

  const handleCreateReport = (date: Date) => {
    navigate(`/report/create?date=${formatDate(date)}`);
  };

  const handleViewReport = (date: string) => {
    navigate(`/report/view?date=${date}`);
  };

  // Get the first day of the week (0 = Sunday)
  const firstDayOfWeek = monthStart.getDay();

  // Calculate days from previous month to fill the first week
  const prevMonthDays = firstDayOfWeek;
  const prevMonthEnd = endOfMonth(new Date(currentYear, currentMonth - 1));
  const prevMonthPadding = Array.from({ length: prevMonthDays }, (_, i) => {
    const day = new Date(prevMonthEnd);
    day.setDate(day.getDate() - (prevMonthDays - 1 - i));
    return day;
  });

  // Calculate days from next month to complete the grid
  const totalCells = Math.ceil((days.length + firstDayOfWeek) / 7) * 7;
  const nextMonthDays = totalCells - days.length - firstDayOfWeek;
  const nextMonthPadding = Array.from({ length: nextMonthDays }, (_, i) => {
    const day = new Date(currentYear, currentMonth + 1, 1);
    day.setDate(day.getDate() + i);
    return day;
  });

  // Combine all days for the calendar grid
  const allDays = [...prevMonthPadding, ...days, ...nextMonthPadding];

  const weekDays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8 md:px-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full -mr-32 -mt-32 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-br from-green-100 to-blue-100 rounded-full -ml-24 -mb-24 opacity-50"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                  รายงานการขายประจำวัน
                </h1>
                <p className="text-gray-600 text-lg flex items-center gap-2">
                  <FontAwesomeIcon icon={faHand} className="text-xl text-amber-500" />
                  ยินดีต้อนรับ, <span className="font-semibold text-blue-600">{user.username}</span>
                </p>
              </div>
              <Link
                to="/logout"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                <FontAwesomeIcon icon={faRightFromBracket} className="h-5 w-5" />
                ออกจากระบบ
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/products"
            className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-14 h-14 min-w-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0">
                <FontAwesomeIcon icon={faBoxOpen} className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">จัดการสินค้า</h3>
                <p className="mt-1 text-sm text-gray-500">เพิ่ม แก้ไข หรือลบสินค้า</p>
              </div>
            </div>
          </Link>
          <Link
            to="/banks"
            className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-green-300 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-50 to-green-100 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-14 h-14 min-w-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0">
                <FontAwesomeIcon icon={faBuildingColumns} className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-green-600 transition-colors">จัดการธนาคาร</h3>
                <p className="mt-1 text-sm text-gray-500">เพิ่ม แก้ไข หรือลบธนาคาร</p>
              </div>
            </div>
          </Link>
          <Link
            to="/customers"
            className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-50 to-orange-100 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-14 h-14 min-w-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0">
                <FontAwesomeIcon icon={faUsers} className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-orange-600 transition-colors">จัดการลูกค้า</h3>
                <p className="mt-1 text-sm text-gray-500">เพิ่ม แก้ไข หรือลบลูกค้า</p>
              </div>
            </div>
          </Link>
          <Link
            to="/analytics"
            className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-50 to-purple-100 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-14 h-14 min-w-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <FontAwesomeIcon icon={faChartLine} className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors">รายงานวิเคราะห์</h3>
                <p className="mt-1 text-sm text-gray-500">ดูสถิติและวิเคราะห์การขาย</p>
              </div>
            </div>
          </Link>
        </div>
   

        {/* Month Navigator */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-8 border border-gray-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={goToPrevMonth}
              className="w-full sm:w-auto inline-flex items-center justify-center cursor-pointer gap-2 px-4 py-2 md:px-6 md:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-medium text-base md:text-lg"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="h-5 w-5" />
              <span className="hidden xs:inline">เดือนก่อนหน้า</span>
              <span className="xs:hidden">ก่อนหน้า</span>
            </button>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center flex-1">
              {getMonthYearName()}
            </h2>
            <button
              onClick={goToNextMonth}
              className="w-full sm:w-auto inline-flex items-center justify-center cursor-pointer gap-2 px-4 py-2 md:px-6 md:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-medium text-base md:text-lg"
            >
              <span className="hidden xs:inline">เดือนถัดไป</span>
              <span className="xs:hidden">ถัดไป</span>
              <FontAwesomeIcon icon={faChevronRight} className="h-5 w-5" />
            </button>
          </div>
        </div>
   

        {/* Calendar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDays.map((day) => (
              <div key={day} className="text-center">
                <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                  <span className="font-bold text-blue-700 text-sm">{day}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 md:gap-3" id="calendar-days">
            {allDays.map((day) => {
              const dateStr = formatDate(day);
              const hasReport = reportDates.has(dateStr);
              const isCurrentDay = isToday(day);
              const isCurrentMonth = day.getMonth() === currentMonth;

              return (
                <div
                  key={dateStr}
                  id={`day-${dateStr}`}
                  className={`aspect-square md:aspect-auto md:h-28 p-2 md:p-3 rounded-xl border-2 transition-all duration-300 cursor-pointer relative overflow-hidden group ${
                    !isCurrentMonth
                      ? "opacity-40 bg-gray-50 border-gray-200"
                      : isCurrentDay
                      ? "border-blue-400 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg shadow-blue-200"
                      : hasReport
                      ? "border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-400 hover:shadow-lg hover:shadow-green-200"
                      : "border-gray-200 hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 hover:shadow-md"
                  }`}
                  onClick={() => isCurrentMonth && handleCreateReport(day)}
                >
                  <div className="flex flex-col h-full justify-between">
                    <div className="text-center">
                      <div className={`text-xl md:text-2xl font-bold ${isCurrentDay ? "text-blue-600" : hasReport ? "text-green-600" : "text-gray-700"}`}>
                        {format(day, "d", { locale: th })}
                      </div>
                      <div className="mt-1 flex justify-center min-h-[8px]">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${hasReport ? "bg-green-500 animate-pulse" : "invisible"}`}
                        ></span>
                      </div>
                    </div>
                    {isCurrentMonth && (
                      <div className="flex justify-center gap-1 md:gap-2 mt-2">
                        {hasReport ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewReport(dateStr);
                              }}
                              className="inline-flex items-center justify-center cursor-pointer h-[30px] min-h-[30px] px-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg text-[14px] font-medium"
                              title="ดู"
                            >
                              <FontAwesomeIcon icon={faEye} className="align-middle text-[16px]" />
                              <span className="sr-only">ดู</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCreateReport(day);
                              }}
                              className="inline-flex items-center justify-center cursor-pointer h-[30px] min-h-[30px] px-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg text-[14px] font-medium"
                              title="แก้ไขรายงาน"
                            >
                              <FontAwesomeIcon icon={faPenToSquare} className="align-middle text-[16px]" />
                              <span className="sr-only">แก้ไข</span>
                            </button>
                       
                          </>
                        ) : (
                          <div className="inline-flex items-center justify-center h-[30px] min-h-[30px] px-3 bg-gray-100 rounded-lg group-hover:bg-gradient-to-r group-hover:from-blue-100 group-hover:to-purple-100 transition-all text-[14px] font-medium text-gray-500 group-hover:text-blue-500">
                            ว่าง
                          </div>
                     
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-400"></div>
              <span className="text-gray-600">วันนี้</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300"></div>
              <span className="text-gray-600">มีรายงาน</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-lg bg-gray-50 border-2 border-gray-200"></div>
              <span className="text-gray-600">ว่าง</span>
            </div>
          </div>
        </div>

        {/* CSV Export Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 min-w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <FontAwesomeIcon icon={faDownload} className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">ส่งออกข้อมูลรายงาน</h3>
                <p className="text-sm text-gray-500">ดาวน์โหลดข้อมูลรายงานทั้งหมดของเดือนนี้เป็นไฟล์ CSV</p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (reports.length === 0) return;

                try {
                  console.log('Starting export for month:', currentMonth, 'year:', currentYear);
                  const response = await fetch(`/export-csv?month=${currentMonth}&year=${currentYear}`, {
                    method: 'GET',
                    credentials: 'same-origin',
                    headers: {
                      'Accept': 'text/csv',
                    },
                  });

                  console.log('Response status:', response.status);
                  console.log('Response ok:', response.ok);

                  if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Error response:', errorText);
                    throw new Error(`Failed to export data: ${response.status} ${errorText}`);
                  }

                  const csvContent = await response.text();
                  console.log('CSV content length:', csvContent.length);

                  const blob = new Blob([csvContent], { type: 'text/csv; charset=utf-8' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `รายงานการขาย_${monthNames[currentMonth]}_${currentYear}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);

                  console.log('Download completed successfully');
                } catch (error) {
                  console.error('Export error:', error);
                  alert(`เกิดข้อผิดพลาดในการส่งออกข้อมูล: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              disabled={reports.length === 0}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faDownload} className="h-5 w-5" />
              ดาวน์โหลด CSV
            </button>
          </div>
          {reports.length === 0 && (
            <p className="mt-4 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
              ไม่มีรายงานในเดือนนี้ที่จะส่งออก
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

