import { Button } from "~/components/ui/button";
import { Card } from "~/components/Card";
import { Heading } from "~/components/Heading";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { formatCurrency } from "~/lib/calculations";
import type { SalesItem, BillHoldItem, CheckItem } from "~/lib/db";

interface ReportSummaryProps {
  reportDate: string;
  salesItems: SalesItem[];
  billHoldItems: BillHoldItem[];
  checkItems: CheckItem[];
  onEdit?: () => void;
  onShare?: () => void;
  isReadOnly?: boolean;
}

export function ReportSummary({
  reportDate,
  salesItems,
  billHoldItems,
  checkItems,
  onEdit,
  onShare,
  isReadOnly = false,
}: ReportSummaryProps) {
  // Calculate totals
  const salesTotal = salesItems.reduce((sum, item) => sum + item.total, 0);

  const billHoldTotal = billHoldItems.reduce((sum, item) => sum + item.amount, 0);

  const checkTotal = checkItems.reduce((sum, item) => sum + item.amount, 0);

  const grandTotal = salesTotal + billHoldTotal + checkTotal;

  // Group sales by customer
  const salesByCustomer = new Map<number | null, SalesItem[]>();
  salesItems.forEach((item) => {
    const key = item.customer_id;
    if (!salesByCustomer.has(key)) {
      salesByCustomer.set(key, []);
    }
    salesByCustomer.get(key)!.push(item);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <Heading styleLevel={1}>
              รายงานการขายวันที่{" "}
              {format(new Date(reportDate), "d MMMM yyyy", { locale: th })}
            </Heading>
          </div>
          {!isReadOnly && (
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  onClick={onEdit}
                  overrides={{
                    Root: {
                      style: {
                        minHeight: "48px",
                        fontSize: "18px",
                        padding: "12px 24px",
                      },
                    },
                  }}
                >
                  แก้ไขรายงาน
                </Button>
              )}
              {onShare && (
                <Button
                  onClick={onShare}
                  overrides={{
                    Root: {
                      style: {
                        minHeight: "48px",
                        fontSize: "18px",
                        padding: "12px 24px",
                      },
                    },
                  }}
                >
                  แชร์รายงาน
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grand Total */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-6">
        <div className="text-3xl font-bold text-center">
          ยอดรวมทั้งหมด: {formatCurrency(grandTotal)}
        </div>
      </div>

      {/* Sales Group */}
      <Card
        overrides={{
          Root: {
            style: {
              padding: "24px",
            },
          },
        }}
      >
        <Heading styleLevel={3} className="mb-4">
          กลุ่มขาย
        </Heading>

        {salesByCustomer.size === 0 ? (
          <div className="text-center text-gray-500 py-8">ไม่มีรายการขาย</div>
        ) : (
          <div className="space-y-6">
            {Array.from(salesByCustomer.entries()).map(([customerId, items]) => {
              const customerName = items[0]?.customer_name || "ไม่ระบุชื่อ";
              const customerTotal = items.reduce((sum, item) => sum + item.total, 0);

              return (
                <div
                  key={customerId || "null"}
                  className="border border-gray-300 rounded-lg p-4"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-semibold">{customerName}</h3>
                    <div className="text-xl font-medium text-blue-600">
                      ยอดรวม: {formatCurrency(customerTotal)}
                    </div>
                  </div>

                  {/* Product Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-lg font-semibold">
                            ชื่อสินค้า
                          </th>
                          <th className="px-4 py-3 text-right text-lg font-semibold">
                            ราคา
                          </th>
                          <th className="px-4 py-3 text-right text-lg font-semibold">
                            จำนวน
                          </th>
                          <th className="px-4 py-3 text-right text-lg font-semibold">
                            รวม
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t border-gray-200"
                          >
                            <td className="px-4 py-3 text-base">
                              {item.product_name || "-"}
                            </td>
                            <td className="px-4 py-3 text-right text-base">
                              {formatCurrency(item.price)}
                            </td>
                            <td className="px-4 py-3 text-right text-base">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-right text-base font-medium">
                              {formatCurrency(item.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 bg-green-50 border-2 border-green-500 rounded-lg px-6 py-4">
          <div className="text-2xl font-bold text-right">
            ยอดรวมกลุ่มขาย: {formatCurrency(salesTotal)}
          </div>
        </div>
      </Card>

      {/* Bill Hold Group */}
      <Card
        overrides={{
          Root: {
            style: {
              padding: "24px",
            },
          },
        }}
      >
        <Heading styleLevel={3} className="mb-4">
          กลุ่มบิลฝากเก็บ
        </Heading>

        {billHoldItems.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            ไม่มีรายการบิลฝากเก็บ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-lg font-semibold">
                    ชื่อลูกค้า
                  </th>
                  <th className="px-4 py-3 text-right text-lg font-semibold">
                    จำนวนเงิน
                  </th>
                </tr>
              </thead>
              <tbody>
                {billHoldItems.map((item) => (
                  <tr key={item.id} className="border-t border-gray-200">
                    <td className="px-4 py-3 text-base">
                      {item.customer_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-base font-medium">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 bg-orange-50 border-2 border-orange-500 rounded-lg px-6 py-4">
          <div className="text-2xl font-bold text-right">
            ยอดรวมกลุ่มบิลฝากเก็บ: {formatCurrency(billHoldTotal)}
          </div>
        </div>
      </Card>

      {/* Check Group */}
      <Card
        overrides={{
          Root: {
            style: {
              padding: "24px",
            },
          },
        }}
      >
        <Heading styleLevel={3} className="mb-4">
          กลุ่มเช็ค
        </Heading>

        {checkItems.length === 0 ? (
          <div className="text-center text-gray-500 py-8">ไม่มีรายการเช็ค</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-lg font-semibold">
                    ชื่อธนาคาร
                  </th>
                  <th className="px-4 py-3 text-left text-lg font-semibold">
                    เลขบัญชี
                  </th>
                  <th className="px-4 py-3 text-left text-lg font-semibold">
                    ชื่อลูกค้า
                  </th>
                  <th className="px-4 py-3 text-left text-lg font-semibold">
                    วันที่บนเช็ค
                  </th>
                  <th className="px-4 py-3 text-right text-lg font-semibold">
                    จำนวนเงิน
                  </th>
                </tr>
              </thead>
              <tbody>
                {checkItems.map((item) => (
                  <tr key={item.id} className="border-t border-gray-200">
                    <td className="px-4 py-3 text-base">{item.bank_name}</td>
                    <td className="px-4 py-3 text-base">{item.account_number}</td>
                    <td className="px-4 py-3 text-base">
                      {item.customer_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-base">
                      {format(new Date(item.check_date), "d/M/yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right text-base font-medium">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 bg-purple-50 border-2 border-purple-500 rounded-lg px-6 py-4">
          <div className="text-2xl font-bold text-right">
            ยอดรวมกลุ่มเช็ค: {formatCurrency(checkTotal)}
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card
        overrides={{
          Root: {
            style: {
              padding: "24px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
            },
          },
        }}
      >
        <Heading styleLevel={3} className="mb-4 text-white">
          สรุปยอดรวม
        </Heading>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-xl">
            <span>กลุ่มขาย:</span>
            <span className="font-semibold">{formatCurrency(salesTotal)}</span>
          </div>
          <div className="flex justify-between items-center text-xl">
            <span>กลุ่มบิลฝากเก็บ:</span>
            <span className="font-semibold">
              {formatCurrency(billHoldTotal)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xl">
            <span>กลุ่มเช็ค:</span>
            <span className="font-semibold">{formatCurrency(checkTotal)}</span>
          </div>
          <div className="border-t-2 border-white/30 pt-3 mt-3">
            <div className="flex justify-between items-center text-3xl font-bold">
              <span>ยอดรวมทั้งหมด:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
