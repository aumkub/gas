import type { Route } from "./+types/home";
import { redirect, useLoaderData } from "react-router";
import { requireAuth } from "~/lib/session";
import { getReportsByMonth } from "~/lib/db";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday, getMonth, getYear } from "date-fns";
import { th } from "date-fns/locale";

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
    window.location.href = `/?month=${getMonth(date)}&year=${getYear(date)}`;
  };

  const goToNextMonth = () => {
    const date = new Date(currentYear, currentMonth + 1);
    window.location.href = `/?month=${getMonth(date)}&year=${getYear(date)}`;
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
    window.location.href = `/report/create?date=${formatDate(date)}`;
  };

  const handleViewReport = (date: string) => {
    window.location.href = `/report/view?date=${date}`;
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
    <div className="min-h-screen bg-[#F9FAFB] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg p-6 mb-6 border border-[#E5E7EB]">
          <h1 className="text-4xl font-bold text-center mb-2">รายงานการขายประจำวัน</h1>
          <p className="text-[#4B5563] text-center">
            ยินดีต้อนรับ, {user.username}
          </p>
        </div>

        {/* Month Navigator */}
        <div className="bg-white rounded-lg p-6 mb-6 border border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPrevMonth}
              className="inline-flex h-8 items-center px-4 bg-[#2563EB] text-white text-sm rounded-lg hover:bg-[#1D4ED8] transition-colors font-medium"
            >
              ◀ เดือนก่อนหน้า
            </button>
            <h2 className="text-2xl font-semibold">{getMonthYearName()}</h2>
            <button
              onClick={goToNextMonth}
              className="inline-flex h-8 items-center px-4 bg-[#2563EB] text-white text-sm rounded-lg hover:bg-[#1D4ED8] transition-colors font-medium"
            >
              เดือนถัดไป ▶
            </button>
          </div>
        </div>

        {/* Calendar Days */}
        <div className="bg-white rounded-lg p-6 border border-[#E5E7EB]">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDays.map((day) => (
              <div key={day} className="text-center font-semibold text-lg text-[#4B5563] py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2" id="calendar-days">
            {allDays.map((day) => {
              const dateStr = formatDate(day);
              const hasReport = reportDates.has(dateStr);
              const isCurrentDay = isToday(day);
              const isCurrentMonth = day.getMonth() === currentMonth;

              return (
                <div
                  key={dateStr}
                  id={`day-${dateStr}`}
                  className={`aspect-square p-2 rounded-lg border-2 transition-all cursor-pointer ${
                    !isCurrentMonth
                      ? "opacity-30 bg-gray-50 border-gray-200"
                      : isCurrentDay
                      ? "border-[#2563EB] bg-[#2563EB]/10"
                      : hasReport
                      ? "border-[#16A34A] bg-[#16A34A]/10 hover:border-[#15803D] hover:bg-[#16A34A]/20"
                      : "border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F3F4F6]"
                  }`}
                  onClick={() => isCurrentMonth && handleCreateReport(day)}
                >
                  <div className="flex flex-col h-full justify-between">
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${isCurrentDay ? "text-[#2563EB]" : ""}`}>
                        {format(day, "d", { locale: th })}
                      </div>
                      {hasReport && (
                        <div className="mt-1 text-center">
                          <span className="inline-block w-2 h-2 bg-[#16A34A] rounded-full"></span>
                        </div>
                      )}
                    </div>
                    {isCurrentMonth && (
                      <div className="flex justify-center gap-1">
                        {hasReport ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewReport(dateStr);
                              }}
                              className="inline-flex h-8 items-center justify-center px-2 bg-[#16A34A] text-white text-sm rounded hover:bg-[#15803D] transition-colors"
                              title="ดูรายงาน"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCreateReport(day);
                              }}
                              className="inline-flex h-8 items-center justify-center px-2 bg-[#2563EB] text-white text-sm rounded hover:bg-[#1D4ED8] transition-colors"
                              title="แก้ไขรายงาน"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-[#9CA3AF]">+</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <a
            href="/products"
            className="inline-flex h-8 items-center justify-center px-4 bg-white text-sm rounded-lg border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors font-medium"
          >
            📦 จัดการสินค้า
          </a>
          <a
            href="/banks"
            className="inline-flex h-8 items-center justify-center px-4 bg-white text-sm rounded-lg border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors font-medium"
          >
            🏦 จัดการธนาคาร
          </a>
        </div>

        {/* Logout Button */}
        <div className="mt-6 text-center">
          <a
            href="/logout"
            className="inline-flex h-8 items-center px-4 bg-[#DC2626] text-white text-sm rounded-lg hover:bg-[#B91C1C] transition-colors font-medium"
          >
            ออกจากระบบ
          </a>
        </div>
      </div>
    </div>
  );
}

// Auto-scroll to current day
if (typeof window !== "undefined") {
  setTimeout(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const todayElement = document.getElementById(`day-${todayStr}`);
    if (todayElement) {
      todayElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 100);
}

