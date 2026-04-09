import type { Route } from "./+types/report-create";
import { redirect, useLoaderData, useNavigation, useSubmit } from "react-router";
import { requireAuth } from "~/lib/session";
import {
  getReportByDate,
  createReport,
  updateReportTimestamp,
  getSalesItemsByReport,
  getBillHoldItemsByReport,
  getCheckItemsByReport,
  deleteSalesItemsByReport,
  deleteBillHoldItemsByReport,
  deleteCheckItemsByReport,
  createSalesItem,
  createBillHoldItem,
  createCheckItem,
  getAllCustomers,
  getProductsPrices,
  getAllBanks,
  getOrCreateCustomer,
  getProductByName,
  createProduct,
  addProductPrice,
  createSharedLink,
  getAllChecks,
} from "~/lib/db";
import { useState, useEffect, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Heading } from "~/components/Heading";
import { Modal, SIZE } from "~/components/ui/modal";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { SalesGroup } from "~/components/SalesGroup";
import type { SalesCustomer } from "~/components/SalesGroup";
import { BillHoldGroup } from "~/components/BillHoldGroup";
import type { BillHoldItem } from "~/components/BillHoldGroup";
import { CheckGroup } from "~/components/CheckGroup";
import type { CheckItem } from "~/components/CheckGroup";
import { calculateGrandTotal, formatCurrency } from "~/lib/calculations";
import type { ProductPrice } from "~/lib/db";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "สร้างรายงาน" },
    { name: "description", content: "สร้างรายงานการขายประจำวัน" },
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

  // Load existing report or create new
  let report = await getReportByDate(db, reportDate);
  let isEditing = false;

  if (!report) {
    report = await createReport(db, reportDate, user.id);
  } else {
    isEditing = true;
  }

  // Load all related data
  const [salesItems, billHoldItems, checkItems, customers, products, banks, allChecks] =
    await Promise.all([
      getSalesItemsByReport(db, report.id),
      getBillHoldItemsByReport(db, report.id),
      getCheckItemsByReport(db, report.id),
      getAllCustomers(db),
      getProductsPrices(db),
      getAllBanks(db),
      getAllChecks(db),
    ]);

  return {
    user,
    report,
    isEditing,
    reportDate,
    salesItems,
    billHoldItems,
    checkItems,
    customers,
    products,
    banks,
    allChecks,
  };
}

export async function action({ context, request }: Route.ActionArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env.DB);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const db = context.cloudflare.env.DB;

  try {
    switch (intent) {
      case "save": {
        const FALLBACK_PRODUCT_NAME = "ไม่ระบุสินค้า";
        const reportId = parseInt(formData.get("reportId") as string);
        const salesData = JSON.parse(formData.get("salesData") as string);
        const billHoldData = JSON.parse(formData.get("billHoldData") as string);
        const checkData = JSON.parse(formData.get("checkData") as string);

        console.log("=== SAVE DEBUG ===");
        console.log("Report ID:", reportId);
        console.log("Sales Data:", salesData);
        console.log("Bill Hold Data:", billHoldData);
        console.log("Check Data:", checkData);

        if (!reportId) {
          return { error: "ไม่พบรายงาน" };
        }

        // Delete old items
        await Promise.all([
          deleteSalesItemsByReport(db, reportId),
          deleteBillHoldItemsByReport(db, reportId),
          deleteCheckItemsByReport(db, reportId),
        ]);

        let salesCount = 0;
        let billHoldCount = 0;
        let checkCount = 0;

        // Insert new items
        for (const customer of salesData) {
          let customerId = customer.customerId;
          if (!customerId && customer.customerName?.trim()) {
            const createdCustomer = await getOrCreateCustomer(
              db,
              customer.customerName.trim()
            );
            customerId = createdCustomer.id;
          }

          for (const item of customer.items) {
            let productId = item.productId;
            if (!productId && item.productName?.trim()) {
              const productName = item.productName.trim();
              const existingProduct = await getProductByName(db, productName);
              if (existingProduct) {
                productId = existingProduct.id;
              } else {
                const createdProduct = await createProduct(db, productName);
                productId = createdProduct.id;
                if (item.price > 0) {
                  await addProductPrice(db, createdProduct.id, item.price, null);
                }
              }
            }

            if (!productId) {
              const fallbackProduct = await getProductByName(db, FALLBACK_PRODUCT_NAME);
              if (fallbackProduct) {
                productId = fallbackProduct.id;
              } else {
                const createdFallback = await createProduct(db, FALLBACK_PRODUCT_NAME);
                productId = createdFallback.id;
                await addProductPrice(db, createdFallback.id, 0, "default");
              }
            }

            if (customerId && productId && item.price > 0) {
              await createSalesItem(
                db,
                reportId,
                customerId,
                productId,
                item.price,
                item.quantity || 1,
                item.total
              );
              salesCount++;
            } else {
              console.log("Skipped sales item:", { customerId, item });
            }
          }
        }

        for (const item of billHoldData) {
          if (item.amount > 0) {
            let customerId = item.customerId;
            if (!customerId && item.customerName?.trim()) {
              const customer = await getOrCreateCustomer(db, item.customerName.trim());
              customerId = customer.id;
            }

            if (customerId) {
              await createBillHoldItem(db, reportId, customerId, item.amount);
              billHoldCount++;
            } else {
              console.log("Skipped bill hold item (no customer):", item);
            }
          } else {
            console.log("Skipped bill hold item (amount 0):", item);
          }
        }

        for (const item of checkData) {
          if (item.amount > 0) {
            // Create or get customer
            let customerId = item.customerId;
            if (!customerId && item.customerName) {
              const customer = await getOrCreateCustomer(db, item.customerName);
              customerId = customer.id;
            }

            if (customerId) {
              await createCheckItem(
                db,
                reportId,
                item.bankName,
                item.accountNumber,
                customerId,
                item.checkDate,
                item.amount
              );
              checkCount++;
            } else {
              console.log("Skipped check item (no customer):", item);
            }
          } else {
            console.log("Skipped check item (amount 0):", item);
          }
        }

        // Update timestamp
        await updateReportTimestamp(db, reportId);

        console.log("Saved items:", { salesCount, billHoldCount, checkCount });
        console.log("=== END SAVE DEBUG ===");

        // Build detailed success message
        const details = [];
        if (salesCount > 0) details.push(`ขาย ${salesCount} รายการ`);
        if (billHoldCount > 0) details.push(`บิลฝากเก็บ ${billHoldCount} รายการ`);
        if (checkCount > 0) details.push(`เช็ค ${checkCount} รายการ`);

        const message = details.length > 0
          ? `บันทึกรายงานเรียบร้อย (${details.join(", ")})`
          : "บันทึกรายงานเรียบร้อย (แต่ไม่มีรายการที่บันทึก)";

        return { success: message, timestamp: new Date().toISOString(), counts: { salesCount, billHoldCount, checkCount } };
      }

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
    console.error("Report action error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { error: `เกิดข้อผิดพลาด กรุณาลองอีกครั้ง (${message})` };
  }
}

export default function ReportCreate({ loaderData, actionData }: Route.ComponentProps) {
  const {
    user,
    report,
    isEditing,
    reportDate,
    salesItems,
    billHoldItems,
    checkItems,
    customers,
    products,
    banks,
    allChecks,
  } = loaderData;

  const navigation = useNavigation();
  const submit = useSubmit();
  const isSubmitting = navigation.state === "submitting";

  // State for all three groups
  const [salesData, setSalesData] = useState<SalesCustomer[]>([]);
  const [billHoldData, setBillHoldData] = useState<BillHoldItem[]>([]);
  const [checkData, setCheckData] = useState<CheckItem[]>([]);

  // Auto-save state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Share link modal
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Initialize data from loader
  useEffect(() => {
    // Initialize sales data
    const salesMap = new Map<number, SalesCustomer>();
    salesItems.forEach((item) => {
      if (!item.customer_id) return;

      if (!salesMap.has(item.customer_id)) {
        salesMap.set(item.customer_id, {
          id: `customer-${item.customer_id}`,
          customerId: item.customer_id,
          customerName: item.customer_name || "",
          items: [],
        });
      }

      salesMap.get(item.customer_id)!.items.push({
        id: `item-${item.id}`,
        productId: item.product_id,
        productName: item.product_name || "",
        price: item.price,
        quantity: item.quantity,
        total: item.total,
      });
    });
    setSalesData(Array.from(salesMap.values()));

    // Initialize bill hold data
    setBillHoldData(
      billHoldItems.map((item) => ({
        id: `billhold-${item.id}`,
        customerId: item.customer_id,
        customerName: item.customer_name || "",
        amount: item.amount,
      }))
    );

    // Initialize check data
    setCheckData(
      checkItems.map((item) => ({
        id: `check-${item.id}`,
        bankName: item.bank_name,
        accountNumber: item.account_number,
        customerId: item.customer_id,
        customerName: item.customer_name || "",
        checkDate: item.check_date,
        amount: item.amount,
      }))
    );

    if (isEditing) {
      setLastSaved(new Date(report.updated_at));
    }
  }, [salesItems, billHoldItems, checkItems, isEditing, report.updated_at]);

  const saveReport = useCallback(() => {
    console.log("=== CLIENT SAVE DEBUG ===");
    console.log("Report ID:", report.id);
    console.log("Sales Data:", salesData);
    console.log("Bill Hold Data:", billHoldData);
    console.log("Check Data:", checkData);
    console.log("========================");

    setIsSaving(true);

    const formData = new FormData();
    formData.append("intent", "save");
    formData.append("reportId", report.id.toString());
    formData.append("salesData", JSON.stringify(salesData));
    formData.append("billHoldData", JSON.stringify(billHoldData));
    formData.append("checkData", JSON.stringify(checkData));

    submit(formData, {
      method: "post",
      action: `/report/create?date=${reportDate}`,
    });
  }, [billHoldData, checkData, report.id, reportDate, salesData, submit]);

  const handleShareReport = () => {
    const formData = new FormData();
    formData.append("intent", "create-share-link");
    formData.append("reportId", report.id.toString());

    submit(formData, {
      method: "post",
      action: `/report/create?date=${reportDate}`,
    });
  };

  const handleGetOrCreateCustomer = async (name: string): Promise<number> => {
    // Create customer via API
    const response = await fetch(`/api/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error("Failed to create customer");
    }

    const data = (await response.json()) as { id: number };
    return data.id;
  };

  // Calculate totals
  const salesTotal = salesData.reduce((sum, customer) => {
    return (
      sum +
      customer.items.reduce((itemSum, item) => itemSum + item.total, 0)
    );
  }, 0);

  const billHoldTotal = billHoldData.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const checkTotal = checkData.reduce((sum, item) => sum + item.amount, 0);

  const grandTotal = calculateGrandTotal(salesTotal, billHoldTotal, checkTotal);

  // Track changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [salesData, billHoldData, checkData]);

  // Handle action response
  useEffect(() => {
    if (actionData) {
      setIsSaving(false);
      if (actionData.success) {
        setToast({ type: "success", message: String(actionData.success) });
        if (actionData.shareUrl) {
          setShareUrl(actionData.shareUrl as string);
        } else if (actionData.timestamp) {
          setLastSaved(new Date(actionData.timestamp as string));
          setHasUnsavedChanges(false);
        }
      } else if (actionData.error) {
        setToast({ type: "error", message: String(actionData.error) });
      }
    }
  }, [actionData]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => {
    const handleEnterToSave = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat || event.isComposing) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (isSaving || isSubmitting || !!shareUrl) return;
      saveReport();
      event.preventDefault();
    };

    window.addEventListener("keydown", handleEnterToSave);
    return () => {
      window.removeEventListener("keydown", handleEnterToSave);
    };
  }, [isSaving, isSubmitting, saveReport, shareUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 px-3 py-4 md:px-4 md:py-5">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="relative mb-4 overflow-hidden rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 opacity-60" />
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="relative z-10">
              <Heading styleLevel={1} className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-2xl text-transparent md:text-3xl">
                รายงานการขายวันที่{" "}
                {format(new Date(reportDate), "d MMMM yyyy", { locale: th })}
              </Heading>
              <p className="mt-1 text-sm text-gray-600">
                {isEditing ? "แก้ไขรายงาน" : "สร้างรายงานใหม่"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => (window.location.href = `/report/view?date=${reportDate}`)}
                kind="secondary"
                size="compact"
                className="border-0 bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 hover:shadow-md relative z-10"
                overrides={{
                  Root: {
                    style: {
                      minHeight: "32px",
                      fontSize: "14px",
                    },
                  },
                }}
              >
                ดูรายงาน
              </Button>
            </div>
          </div>

          {/* Auto-save status */}
          <div className="relative z-10 flex flex-col gap-3 border-t border-gray-100 pt-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm">
              {isSaving && (
                <span className="text-blue-600">กำลังบันทึก...</span>
              )}
              {!isSaving && lastSaved && (
                <span className="text-purple-600">
                  บันทึกล่าสุด: {format(lastSaved, "HH:mm:ss น.", { locale: th })}
                </span>
              )}
              {!isSaving && hasUnsavedChanges && (
                <span className="ml-2 text-orange-600">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/"
                className="inline-flex h-[36px] min-h-[36px] items-center justify-center rounded-lg bg-gray-100 px-3 text-sm text-gray-700 transition-colors hover:bg-gray-200"
              >
                กลับหน้าหลัก
              </a>
              <Button
                onClick={saveReport}
                disabled={isSaving || isSubmitting}
                isLoading={isSaving || isSubmitting}
                size="compact"
                overrides={{
                  Root: {
                    style: {
                      minHeight: "32px",
                      fontSize: "14px",
                    },
                  },
                }}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 hover:shadow-md"
              >
                บันทึกทันที
              </Button>
            </div>
          </div>
        </div>

        {/* Three Groups */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <SalesGroup
              customers={salesData}
              onChange={setSalesData}
              availableProducts={products}
              availableCustomers={customers}
              onGetOrCreateCustomer={handleGetOrCreateCustomer}
            />
          </div>

          <div className="space-y-4 xl:col-span-4">
            <BillHoldGroup
              items={billHoldData}
              onChange={setBillHoldData}
              availableCustomers={customers}
              onGetOrCreateCustomer={handleGetOrCreateCustomer}
            />

            <CheckGroup
              items={checkData}
              onChange={setCheckData}
              availableBanks={banks}
              onGetOrCreateCustomer={handleGetOrCreateCustomer}
            />
          </div>
        </div>

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
              <Heading styleLevel={3} className="mb-4">
                แชร์รายงาน
              </Heading>

              <div className="mb-4">
                <label className="block mb-2 font-medium text-lg">
                  ลิงก์สาธารณะ:
                </label>
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="w-full h-12 px-3 text-base border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    alert("คัดลอกลิงก์แล้ว");
                  }}
                  overrides={{
                    Root: {
                      style: {
                        minHeight: "32px",
                        fontSize: "14px",
                      },
                    },
                  }}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
                >
                  คัดลอกลิงก์
                </Button>
                <Button
                  onClick={() => {
                    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(
                      `รายงานการขายวันที่ ${format(
                        new Date(reportDate),
                        "d MMMM yyyy",
                        { locale: th }
                      )}\nยอดรวม: ${formatCurrency(grandTotal)}\nดูรายงาน: ${shareUrl}`
                    )}`;
                    window.open(lineUrl, "_blank");
                  }}
                  overrides={{
                    Root: {
                      style: {
                        minHeight: "32px",
                        fontSize: "14px",
                      },
                    },
                  }}
                  className="bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600"
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
                        minHeight: "32px",
                        fontSize: "14px",
                      },
                    },
                  }}
                  kind="tertiary"
                  className="hover:bg-gray-200"
                >
                  ปิด
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Messages */}
        {toast && (
          <div
            className={`fixed bottom-4 right-4 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg ${
              toast.type === "success" ? "bg-[#16A34A]" : "bg-[#DC2626]"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
