import { Button } from "~/components/ui/button";
import { Card } from "~/components/Card";
import { Heading } from "~/components/Heading";
import { Input } from "~/components/ui/input";
import { AutoComplete } from "./AutoComplete";
import { calculateCheckTotal, formatCurrency } from "~/lib/calculations";
import { THAI_BANKS } from "~/lib/thai-banks";

export interface CheckItem {
  id: string;
  bankName: string;
  accountNumber: string;
  customerId: number | null;
  customerName: string;
  checkDate: string;
  amount: number;
}

interface CheckGroupProps {
  items: CheckItem[];
  onChange: (items: CheckItem[]) => void;
  availableCustomers: Array<{ id: number; name: string }>;
  availableBanks: Array<{
    id: number;
    bank_name: string;
    account_number: string;
    owner_name: string;
  }>;
  onGetOrCreateCustomer: (name: string) => Promise<number>;
}

export function CheckGroup({
  items,
  onChange,
  availableCustomers,
  availableBanks,
  onGetOrCreateCustomer,
}: CheckGroupProps) {
  const groupTotal = calculateCheckTotal(items);

  const addItem = () => {
    const newItem: CheckItem = {
      id: `check-${Date.now()}`,
      bankName: "",
      accountNumber: "",
      customerId: null,
      customerName: "",
      checkDate: new Date().toISOString().split("T")[0],
      amount: 0,
    };
    onChange([...items, newItem]);
  };

  const removeItem = (itemId: string) => {
    onChange(items.filter((i) => i.id !== itemId));
  };

  const updateItem = (itemId: string, updates: Partial<CheckItem>) => {
    onChange(
      items.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
    );
  };

  // Filter banks by selected bank name
  const getBanksByName = (bankName: string) => {
    if (!bankName) return [];
    return availableBanks.filter((b) => b.bank_name === bankName);
  };

  return (
    <Card
      overrides={{
        Root: {
          style: {
            padding: "16px",
            marginBottom: "16px",
          },
        },
      }}
    >
      <Heading styleLevel={3} className="mb-3 text-xl">
        กลุ่มเช็ค
      </Heading>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-gray-200 p-3"
          >
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Bank Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  ชื่อธนาคาร
                </label>
                <select
                  value={item.bankName}
                  onChange={(e) => {
                    updateItem(item.id, {
                      bankName: e.target.value,
                      accountNumber: "", // Reset account number when bank changes
                    });
                  }}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                >
                  <option value="">เลือกธนาคาร</option>
                  {THAI_BANKS.map((bank) => (
                    <option key={bank.code} value={bank.name}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  เลขบัญชี
                </label>
                <AutoComplete
                  items={getBanksByName(item.bankName)}
                  itemToString={(b) => b.account_number}
                  onInputValueChange={(value) => {
                    updateItem(item.id, {
                      accountNumber: value,
                    });
                  }}
                  filterItem={(bank, query) =>
                    bank.account_number.includes(query) ||
                    bank.owner_name.toLowerCase().includes(query.toLowerCase())
                  }
                  onSelect={(bank) => {
                    updateItem(item.id, {
                      accountNumber: bank.account_number,
                    });
                  }}
                  placeholder={
                    item.bankName
                      ? "พิมพ์เลขบัญชีหรือชื่อเจ้าของ"
                      : "เลือกธนาคารก่อน"
                  }
                  disabled={!item.bankName}
                  initialValue={item.accountNumber}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Customer Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  ชื่อลูกค้า
                </label>
                <AutoComplete
                  items={availableCustomers}
                  itemToString={(c) => c.name}
                  onInputValueChange={(value) => {
                    updateItem(item.id, {
                      customerId: null,
                      customerName: value,
                    });
                  }}
                  onSelect={(c) => {
                    updateItem(item.id, {
                      customerId: c.id,
                      customerName: c.name,
                    });
                  }}
                  placeholder="พิมพ์หรือเลือกชื่อลูกค้า"
                  allowCreate
                  onCreate={async (name) => {
                    const id = await onGetOrCreateCustomer(name);
                    updateItem(item.id, {
                      customerId: id,
                      customerName: name,
                    });
                  }}
                  initialValue={item.customerName}
                />
              </div>

              {/* Check Date */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  วันที่บนเช็ค
                </label>
                <Input
                  type="date"
                  value={item.checkDate}
                  onChange={(e) =>
                    updateItem(item.id, { checkDate: e.target.value })
                  }
                  className="h-10 px-3 text-sm"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  จำนวนเงิน
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.amount || ""}
                  onChange={(e) =>
                    updateItem(item.id, {
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                  className="h-10 px-3 text-sm"
                />
              </div>
            </div>

            {/* Delete Button */}
            <div className="flex justify-end">
              <Button onClick={() => removeItem(item.id)} kind="negative" size="compact">
                ลบรายการ
              </Button>
            </div>
          </div>
        ))}

        {/* Add Item Button */}
        <Button onClick={addItem} size="compact" className="w-full">
          + เพิ่มรายการเช็ค
        </Button>
      </div>

      {/* Group Total */}
      <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2">
        <div className="text-right text-base font-semibold text-purple-800">
          ยอดรวมกลุ่มเช็ค: {formatCurrency(groupTotal)}
        </div>
      </div>
    </Card>
  );
}
