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
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-3 py-4 pb-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="w-full sm:w-auto">
            <Heading styleLevel={1} className="text-xl sm:text-2xl break-words">
              รายงานการขายวันที่{" "}
              {format(new Date(reportDate), "d MMMM yyyy", { locale: th })}
            </Heading>
          </div>
          {!isReadOnly && (
            <div className="flex gap-2 w-full sm:w-auto">
              {onEdit && (
                <Button
                  onClick={onEdit}
                  overrides={{
                    Root: {
                      style: {
                        minHeight: "36px",
                        fontSize: "14px",
                        padding: "8px 16px",
                        flex: 1,
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
                        minHeight: "36px",
                        fontSize: "14px",
                        padding: "8px 16px",
                        flex: 1,
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

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Sales Group - 8 columns */}
        <div className="xl:col-span-8">
          <Card className="p-4">
            <Heading styleLevel={3} className="mb-3 text-lg">
              ขาย
            </Heading>

            {salesByCustomer.size === 0 ? (
              <div className="text-center text-gray-500 py-4 text-sm">ไม่มีรายการขาย</div>
            ) : (
              <div className="space-y-3">
                {Array.from(salesByCustomer.entries()).map(([customerId, items]) => {
                  const customerName = items[0]?.customer_name || "ไม่ระบุชื่อ";
                  const customerTotal = items.reduce((sum, item) => sum + item.total, 0);

                  return (
                    <div
                      key={customerId || "null"}
                      className="border border-gray-300 rounded-lg p-3"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">{customerName}</h3>
                        <div className="text-base font-medium text-blue-600">
                          ยอดรวม: {formatCurrency(customerTotal)}
                        </div>
                      </div>

                      {/* Product Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-2 py-2 text-left text-sm font-semibold">
                                ชื่อสินค้า
                              </th>
                              <th className="px-2 py-2 text-right text-sm font-semibold">
                                ราคา
                              </th>
                              <th className="px-2 py-2 text-right text-sm font-semibold">
                                จำนวน
                              </th>
                              <th className="px-2 py-2 text-right text-sm font-semibold">
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
                                <td className="px-2 py-2 text-sm font-medium">
                                  {item.product_name || "-"}
                                </td>
                                <td className="px-2 py-2 text-right text-sm font-medium">
                                  {formatCurrency(item.price)}
                                </td>
                                <td className="px-2 py-2 text-right text-sm font-medium">
                                  {item.quantity}
                                </td>
                                <td className="px-2 py-2 text-right text-sm font-medium font-medium">
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

            <div className="mt-3 bg-green-50 border border-green-500 rounded-lg px-3 py-2">
              <div className="text-base font-bold text-right">
                ยอดรวมขาย: {formatCurrency(salesTotal)}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - 4 columns */}
        <div className="xl:col-span-4 space-y-4">
          {/* Bill Hold Group */}
          <Card className="p-4">
            <Heading styleLevel={3} className="mb-3 text-lg">
              บิลฝากเก็บ
            </Heading>

            {billHoldItems.length === 0 ? (
              <div className="text-center text-gray-500 py-4 text-sm">
                ไม่มีรายการบิลฝากเก็บ
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-2 text-left text-xs font-semibold">
                        ชื่อลูกค้า
                      </th>
                      <th className="px-2 py-2 text-right text-xs font-semibold">
                        จำนวนเงิน
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {billHoldItems.map((item) => (
                      <tr key={item.id} className="border-t border-gray-200">
                        <td className="px-2 py-2 text-sm font-medium">
                          {item.customer_name || "-"}
                        </td>
                        <td className="px-2 py-2 text-right text-sm font-medium">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 bg-orange-50 border border-orange-500 rounded-lg px-3 py-2">
              <div className="text-base font-bold text-right">
                ยอดรวมบิลฝากเก็บ: {formatCurrency(billHoldTotal)}
              </div>
            </div>
          </Card>

          {/* Check Group */}
          <Card className="p-4">
            <Heading styleLevel={3} className="mb-3 text-lg">
              เช็ค
            </Heading>

            {checkItems.length === 0 ? (
              <div className="text-center text-gray-500 py-4 text-sm">ไม่มีรายการเช็ค</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-2 text-left text-xs font-semibold">
                        ธนาคาร
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold">
                        เลขบัญชี
                      </th>
                      <th className="px-2 py-2 text-right text-xs font-semibold">
                        จำนวนเงิน
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkItems.map((item) => (
                      <tr key={item.id} className="border-t border-gray-200">
                        <td className="px-2 py-2 text-sm font-medium">{item.bank_name}</td>
                        <td className="px-2 py-2 text-sm font-medium">{item.account_number}</td>
                        <td className="px-2 py-2 text-right text-xs font-medium">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 bg-purple-50 border border-purple-500 rounded-lg px-3 py-2">
              <div className="text-base font-bold text-right">
                ยอดรวมเช็ค: {formatCurrency(checkTotal)}
              </div>
            </div>
          </Card>

          {/* Summary Card */}
          <Card
            className="p-4 text-white"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            <Heading styleLevel={3} className="mb-3 text-white text-lg">
              สรุปยอดรวม
            </Heading>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>ขาย:</span>
                <span className="font-semibold">{formatCurrency(salesTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>บิลฝากเก็บ:</span>
                <span className="font-semibold">
                  {formatCurrency(billHoldTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>เช็ค:</span>
                <span className="font-semibold">{formatCurrency(checkTotal)}</span>
              </div>
              {/* <div className="border-t-2 border-white/30 pt-2 mt-2">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>ยอดรวมทั้งหมด:</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div> */}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
