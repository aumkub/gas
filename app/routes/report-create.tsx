import type { Route } from "./+types/report-create";
import { redirect, useLoaderData, useNavigation, useSubmit } from "react-router";
import type { ShouldRevalidateFunctionArgs } from "react-router";
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
  hardDeleteReportById,
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileLines,
  faEye,
  faFloppyDisk,
  faHouse,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";

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

export function shouldRevalidate({
  formMethod,
  formData,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  const isPost = formMethod?.toLowerCase() === "post";
  const intent = formData?.get("intent");

  // Keep local editing state intact after save for smoother UX.
  if (isPost && intent === "save") {
    return false;
  }

  return defaultShouldRevalidate;
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

      case "hard-delete-report": {
        const reportId = Number(formData.get("reportId"));
        const confirmText = String(formData.get("confirmText") || "").trim();

        if (!reportId) {
          return { error: "ไม่พบรายงานที่ต้องการลบ" };
        }

        if (confirmText !== "ตกลง") {
          return { error: "กรุณาพิมพ์คำว่า 'ตกลง' เพื่อยืนยันการลบถาวร" };
        }

        await hardDeleteReportById(db, reportId);
        return redirect("/");
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
  const [availableCustomers, setAvailableCustomers] = useState<Array<{ id: number; name: string }>>(
    customers.map((customer) => ({ id: customer.id, name: customer.name }))
  );

  // Auto-save state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Share link modal
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Focus targets for keyboard shortcuts
  const [focusTarget, setFocusTarget] = useState<{
    type: 'customer' | 'product' | 'billhold' | 'check';
    id: string;
  } | null>(null);

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

  useEffect(() => {
    setAvailableCustomers(
      customers.map((customer) => ({ id: customer.id, name: customer.name }))
    );
  }, [customers]);

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

  const isDeleting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "hard-delete-report";

  const canDelete = deleteConfirmText.trim() === "ตกลง";

  const handleDeleteReport = () => {
    const formData = new FormData();
    formData.append("intent", "hard-delete-report");
    formData.append("reportId", report.id.toString());
    formData.append("confirmText", deleteConfirmText.trim());

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
    const normalizedName = name.trim();

    setAvailableCustomers((prev) => {
      const exists = prev.some(
        (customer) =>
          customer.id === data.id ||
          customer.name.trim().toLowerCase() === normalizedName.toLowerCase()
      );

      if (exists) return prev;
      return [...prev, { id: data.id, name: normalizedName }];
    });

    return data.id;
  };

  const addCustomerWithProduct = () => {
    const newItem: SalesItem = {
      id: `item-${Date.now()}`,
      productId: null,
      productName: "",
      price: 0,
      quantity: 1,
      total: 0,
    };
    const newCustomer: SalesCustomer = {
      id: `customer-${Date.now()}`,
      customerId: null,
      customerName: "",
      items: [newItem], // Add one product line by default
    };
    const updatedCustomers = [...salesData, newCustomer];
    setSalesData(updatedCustomers);
    setFocusTarget({ type: 'customer', customerId: newCustomer.id });
  };

  const addProductToLastCustomer = () => {
    if (salesData.length === 0) {
      addCustomerWithProduct();
      return;
    }

    const lastCustomer = salesData[salesData.length - 1];
    const newItem: SalesItem = {
      id: `item-${Date.now()}`,
      productId: null,
      productName: "",
      price: 0,
      quantity: 1,
      total: 0,
    };

    const updatedCustomers = salesData.map((c) =>
      c.id === lastCustomer.id
        ? { ...c, items: [...c.items, newItem] }
        : c
    );

    setSalesData(updatedCustomers);
    setFocusTarget({ type: 'product', customerId: lastCustomer.id });
  };

  const deleteLatestProduct = () => {
    if (salesData.length === 0) return;

    const lastCustomer = salesData[salesData.length - 1];

    // Don't delete if it's the only product line in the only customer
    if (salesData.length === 1 && lastCustomer.items.length <= 1) {
      return;
    }

    // If last customer has products, delete the last one
    if (lastCustomer.items.length > 0) {
      const updatedCustomer = {
        ...lastCustomer,
        items: lastCustomer.items.slice(0, -1)
      };

      // If customer has no products left and it's not the only customer, remove the customer
      if (updatedCustomer.items.length === 0 && salesData.length > 1) {
        setSalesData(salesData.filter(c => c.id !== lastCustomer.id));
      } else {
        setSalesData(salesData.map(c => c.id === lastCustomer.id ? updatedCustomer : c));
      }

      // Focus on the new last product if there is one
      if (updatedCustomer.items.length > 0) {
        setFocusTarget({ type: 'product', customerId: lastCustomer.id });
      }
    }
  };

  const addBillHoldItem = () => {
    const newItem: BillHoldItem = {
      id: `billhold-${Date.now()}`,
      customerId: null,
      customerName: "",
      amount: 0,
    };
    setBillHoldData([...billHoldData, newItem]);
    setFocusTarget({ type: 'billhold', id: newItem.id });
  };

  const deleteLatestBillHoldItem = () => {
    if (billHoldData.length === 0) return;
    setBillHoldData(billHoldData.slice(0, -1));
  };

  const addCheckItem = () => {
    const newItem: CheckItem = {
      id: `check-${Date.now()}`,
      bankName: "",
      accountNumber: "",
      customerId: null,
      customerName: "",
      checkDate: "",
      amount: 0,
    };
    setCheckData([...checkData, newItem]);
    setFocusTarget({ type: 'check', id: newItem.id });
  };

  const deleteLatestCheckItem = () => {
    if (checkData.length === 0) return;
    setCheckData(checkData.slice(0, -1));
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

    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      // Check if user is typing in an input field (exclude these shortcuts)
      const target = event.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' ||
                             target.tagName === 'TEXTAREA' ||
                             target.contentEditable === 'true';

      // Only handle shortcuts when not in input, or allow specific keys
      if (isInputFocused && !['+', '=', '-', '_', 'b', 'c'].includes(event.key.toLowerCase())) {
        return;
      }

      // Ctrl + + (or Ctrl + =) - Add product line (Sales)
      if ((event.key === '+' || event.key === '=') && (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        addProductToLastCustomer();
        return;
      }

      // Ctrl + Shift + + (or Ctrl + Shift + =) - Add customer with product (Sales)
      if ((event.key === '+' || event.key === '=') && (event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey) {
        event.preventDefault();
        addCustomerWithProduct();
        return;
      }

      // Ctrl + - (or Ctrl + _) - Delete latest product line (Sales)
      if ((event.key === '-' || event.key === '_') && (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        deleteLatestProduct();
        return;
      }

      // Alt + + (or Alt + =) - Add bill hold item
      if ((event.key === '+' || event.key === '=') && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        addBillHoldItem();
        return;
      }

      // Alt + - (or Alt + _) - Delete latest bill hold item
      if ((event.key === '-' || event.key === '_') && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        deleteLatestBillHoldItem();
        return;
      }

      // Alt + Shift + + (or Alt + Shift + =) - Add check item
      if ((event.key === '+' || event.key === '=') && event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        addCheckItem();
        return;
      }

      // Alt + Shift + - (or Alt + Shift + _) - Delete latest check item
      if ((event.key === '-' || event.key === '_') && event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        deleteLatestCheckItem();
        return;
      }
    };

    window.addEventListener("keydown", handleEnterToSave);
    window.addEventListener("keydown", handleKeyboardShortcuts);

    return () => {
      window.removeEventListener("keydown", handleEnterToSave);
      window.removeEventListener("keydown", handleKeyboardShortcuts);
    };
  }, [isSaving, isSubmitting, saveReport, shareUrl, salesData, billHoldData, checkData]);

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50 px-3 py-4 md:px-4 md:py-5">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="relative mb-4 overflow-hidden rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-linear-to-br from-purple-100 to-blue-100 opacity-60" />
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="relative z-10">
              <Heading styleLevel={1} className="bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={faFileLines}
                    className="h-8! w-8! shrink-0 text-purple-600"
                  />
                  <span className="text-2xl!">
                    รายงานการขายวันที่{" "}
                    {format(new Date(reportDate), "d MMMM yyyy", { locale: th })}
                  </span>
                </span>
              </Heading>
              {/* <p className="mt-1 text-sm text-gray-600">
                {isEditing ? "แก้ไขรายงาน" : "สร้างรายงานใหม่"}
              </p> */}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => (window.location.href = `/report/view?date=${reportDate}`)}
                kind="secondary"
                size="compact"
                className="relative z-10 border-0 bg-linear-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 hover:shadow-md"
              >
                <FontAwesomeIcon icon={faEye} className="mr-2 h-4 w-4" />
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
                  className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                <FontAwesomeIcon icon={faHouse} className="mr-2 h-4 w-4" />
                กลับหน้าหลัก
              </a>
              <Button
                onClick={saveReport}
                disabled={isSaving || isSubmitting}
                isLoading={isSaving || isSubmitting}
                size="compact"
                className="bg-linear-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 hover:shadow-md"
              >
                <FontAwesomeIcon icon={faFloppyDisk} className="mr-2 h-4 w-4" />
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
              availableCustomers={availableCustomers}
              onGetOrCreateCustomer={handleGetOrCreateCustomer}
              focusTarget={focusTarget}
              onFocusComplete={() => setFocusTarget(null)}
            />
          </div>

          <div className="space-y-4 xl:col-span-4">
            <BillHoldGroup
              items={billHoldData}
              onChange={setBillHoldData}
              availableCustomers={availableCustomers}
              onGetOrCreateCustomer={handleGetOrCreateCustomer}
              focusTarget={focusTarget}
              onFocusComplete={() => setFocusTarget(null)}
            />

            <CheckGroup
              items={checkData}
              onChange={setCheckData}
              availableBanks={banks}
              onGetOrCreateCustomer={handleGetOrCreateCustomer}
              focusTarget={focusTarget}
              onFocusComplete={() => setFocusTarget(null)}
            />
          </div>
        </div>

        {/* Keyboard Shortcuts Guide */}
        <div className="mt-6 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-md">
                <span className="text-2xl">⌨️</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 class="text-xl font-bold text-gray-800 mb-3">🎯 แป้นพิมพ์ลัด ช่วยให้ทำงานเร็วยขึ้น!</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                {/* Sales Shortcuts */}
                <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                  <h4 className="font-bold text-purple-700 mb-2 flex items-center gap-2">
                    <span>📦</span> ส่วนขายสินค้า
                  </h4>
                  <ul className="space-y-1.5 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-mono text-xs font-bold whitespace-nowrap">Ctrl + +</span>
                      <span>เพิ่มรายการสินค้า</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-mono text-xs font-bold whitespace-nowrap">Ctrl + Shift + +</span>
                      <span>เพิ่มลูกค้าใหม่</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded font-mono text-xs font-bold whitespace-nowrap">Ctrl + -</span>
                      <span>ลบรายการล่าสุด</span>
                    </li>
                  </ul>
                </div>

                {/* Bill Hold Shortcuts */}
                <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                  <h4 className="font-bold text-orange-700 mb-2 flex items-center gap-2">
                    <span>📋</span> ส่วนบิลฝากเก็บ
                  </h4>
                  <ul className="space-y-1.5 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-mono text-xs font-bold whitespace-nowrap">Alt + +</span>
                      <span>เพิ่มรายการบิลฝากเก็บ</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded font-mono text-xs font-bold whitespace-nowrap">Alt + -</span>
                      <span>ลบรายการล่าสุด</span>
                    </li>
                  </ul>
                </div>

                {/* Check Shortcuts */}
                <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                  <h4 className="font-bold text-green-700 mb-2 flex items-center gap-2">
                    <span>✅</span> ส่วนเช็ค
                  </h4>
                  <ul className="space-y-1.5 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded font-mono text-xs font-bold whitespace-nowrap">Alt + Shift + +</span>
                      <span>เพิ่มรายการเช็ค</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded font-mono text-xs font-bold whitespace-nowrap">Alt + Shift + -</span>
                      <span>ลบรายการล่าสุด</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  <strong>เคล็ดลับ:</strong> กด <span className="font-bold text-blue-600">Enter</span> เพื่อบันทึกข้อมูลทันที • เคอร์เซอร์จะไปที่ช่องกรอกข้อมูลให้คุณโดยอัตโนมัติ
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
          <h3 className="text-lg font-semibold text-red-700">โซนอันตราย</h3>
          <p className="mt-1 text-sm text-red-600">
            การลบแบบถาวรจะลบข้อมูลรายงานและรายการทั้งหมดของวันที่นี้ทันที และไม่สามารถกู้คืนได้
          </p>
          <Button
            onClick={() => {
              setDeleteConfirmText("");
              setIsDeleteModalOpen(true);
            }}
            kind="destructive"
            size="compact"
            className="mt-4 bg-linear-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:shadow-md"
          >
            <FontAwesomeIcon icon={faTrashCan} className="mr-2 h-4 w-4" />
            ลบรายงาน
          </Button>
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
                  className="bg-linear-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
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
                  className="bg-linear-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600"
                >
                  แชร์ผ่าน LINE
                </Button>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => setShareUrl(null)}
                  kind="tertiary"
                  className="hover:bg-gray-200"
                >
                  ปิด
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {isDeleteModalOpen && (
          <Modal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            size={SIZE.default}
            overrides={{
              Root: {
                style: {
                  zIndex: 2100,
                },
              },
            }}
          >
            <div className="p-6">
              <Heading styleLevel={3} className="mb-2 text-red-700">
                ยืนยันการลบรายงานถาวร
              </Heading>
              <p className="mb-4 text-sm text-gray-700">
                พิมพ์คำว่า <span className="font-semibold text-red-700">ตกลง</span> เพื่อยืนยันการลบรายงานวันที่{" "}
                <span className="font-semibold">{reportDate}</span>
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                placeholder="พิมพ์คำว่า ตกลง"
                className="h-12 w-full rounded-lg border border-red-300 px-3 text-base focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  kind="tertiary"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="hover:bg-gray-200"
                >
                  ยกเลิก
                </Button>
                <Button
                  kind="destructive"
                  onClick={handleDeleteReport}
                  disabled={!canDelete || isDeleting}
                  className="bg-linear-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
                >
                  {isDeleting ? "กำลังลบ..." : "ยืนยันลบถาวร"}
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
