import type { Route } from "./+types/report-view";
import {
  redirect,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSubmit,
} from "react-router";
import { requireAuth } from "~/lib/session";
import {
  getReportByDate,
  getSalesItemsByReport,
  getBillHoldItemsByReport,
  getCheckItemsByReport,
  createSharedLink,
} from "~/lib/db";
import { ReportSummary } from "~/components/ReportSummary";
import { Button } from "~/components/ui/button";
import { Modal, SIZE } from "~/components/ui/modal";
import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

export async function action({ context, request }: Route.ActionArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env.DB);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const db = context.cloudflare.env.DB;

  try {
    switch (intent) {
      case "create-share-link": {
        const reportId = parseInt(formData.get("reportId") as string);
        const linkId = await createSharedLink(db, reportId);
        const shareUrl = `${new URL(request.url).origin}/share/${linkId}`;
        return { success: "สร้างลิงก์แชร์เรียบร้อย", shareUrl };
      }

      default:
        return { error: "ไม่พบการกระทำที่ต้องการ" };
    }
  } catch (error) {
    console.error("Report view action error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { error: `เกิดข้อผิดพลาด กรุณาลองอีกครั้ง (${message})` };
  }
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ดูรายงาน" },
    { name: "description", content: "ดูรายงานการขายประจำวัน" },
  ];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env.DB);
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");

  if (!dateParam) {
    return redirect("/");
  }

  const db = context.cloudflare.env.DB;
  const reportDate = dateParam;

  const report = await getReportByDate(db, reportDate);

  if (!report) {
    return redirect(`/report/create?date=${reportDate}`);
  }

  // Load all related data
  const [salesItems, billHoldItems, checkItems] = await Promise.all([
    getSalesItemsByReport(db, report.id),
    getBillHoldItemsByReport(db, report.id),
    getCheckItemsByReport(db, report.id),
  ]);

  return {
    user,
    report,
    reportDate,
    salesItems,
    billHoldItems,
    checkItems,
  };
}

export default function ReportView({ loaderData, actionData }: Route.ComponentProps) {
  const { user, report, reportDate, salesItems, billHoldItems, checkItems } =
    loaderData;

  const navigation = useNavigation();
  const navigate = useNavigate();
  const submit = useSubmit();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const qrCodeRef = useRef<SVGSVGElement>(null);

  const handleShare = () => {
    const formData = new FormData();
    formData.append("intent", "create-share-link");
    formData.append("reportId", report.id.toString());

    submit(formData, {
      method: "post",
      action: `/report/view?date=${reportDate}`,
    });
  };

  const handleDownloadQRCode = () => {
    if (!qrCodeRef.current) return;

    const svg = qrCodeRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 200;
      canvas.height = 200;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngFile;
      downloadLink.download = `qrcode-${reportDate}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Handle action response
  useEffect(() => {
    if (actionData) {
      if (actionData.shareUrl) {
        setShareUrl(actionData.shareUrl as string);
      } else if (actionData.error) {
        alert(`เกิดข้อผิดพลาด: ${actionData.error}`);
      }
    }
  }, [actionData]);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Button onClick={handleGoBack}>กลับหน้าก่อนหน้า</Button>
        </div>

        <ReportSummary
          reportDate={reportDate}
          salesItems={salesItems}
          billHoldItems={billHoldItems}
          checkItems={checkItems}
          onEdit={() => {
            window.location.href = `/report/create?date=${reportDate}`;
          }}
          onShare={handleShare}
        />

        {/* Share Link Modal */}
        {shareUrl && (
          <Modal
            isOpen={!!shareUrl}
            onClose={() => setShareUrl(null)}
            size={SIZE.default}
            overrides={{
              Root: {
                style: {
                  zIndex: 2000,
                },
              },
            }}
          >
            <div className="p-6">
              <h3 className="text-2xl font-semibold mb-4">แชร์รายงาน</h3>

              <div className="mb-4">
                <label className="block mb-2 font-medium text-lg">
                  ลิงก์สาธารณะ:
                </label>
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="w-full h-[42px] px-[14px] text-sm border border-[#E2E8F0] rounded-lg bg-[#F8FAFC]"
                />
              </div>

              {shareUrl && (
                <div className="mb-4">
                  {/* <label className="block mb-2 font-medium text-lg">
                    QR Code:
                  </label> */}
                  <div className="flex justify-center mb-2">
                    <div className="border border-gray-300 p-0 mb-1 bg-white">
                      <QRCodeSVG
                        ref={qrCodeRef}
                        value={shareUrl}
                        size={200}
                        level={"M"}
                        includeMargin={true}
                      />
                    </div>
                  </div>
                  <div className="flex justify-center">
                    {/* <Button
                      onClick={handleDownloadQRCode}
                      overrides={{
                        Root: {
                          style: {
                          },
                        },
                      }}
                    >
                      ดาวน์โหลด QR Code
                    </Button> */}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    alert("คัดลอกลิงก์แล้ว");
                  }}
                  overrides={{
                    Root: {
                      style: {
                      },
                    },
                  }}
                >
                  คัดลอกลิงก์
                </Button>
                <Button
                  onClick={() => {
                    window.open(
                      `https://line.me/R/msg/text/?${encodeURIComponent(
                        `รายงานการขายวันที่ ${reportDate}\nดูรายงาน: ${shareUrl}`
                      )}`,
                      "_blank"
                    );
                  }}
                  overrides={{
                    Root: {
                      style: {
                      },
                    },
                  }}
                >
                  แชร์ผ่าน LINE
                </Button>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => setShareUrl(null)}
                  overrides={{
                    Root: {
                      style: {
                      },
                    },
                  }}
                >
                  ปิด
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
