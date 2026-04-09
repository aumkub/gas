import { Button } from "~/components/ui/button";
import { Card } from "~/components/Card";
import { Heading } from "~/components/Heading";
import { Input } from "~/components/ui/input";
import { AutoComplete } from "./AutoComplete";
import { calculateBillHoldTotal, formatCurrency } from "~/lib/calculations";

export interface BillHoldItem {
  id: string;
  customerId: number | null;
  customerName: string;
  amount: number;
}

// Validation function
export const isBillHoldItemValid = (item: BillHoldItem): boolean => {
  return !!(
    item.customerName?.trim() &&
    item.amount > 0
  );
};

// Get validation errors
export const getBillHoldItemErrors = (item: BillHoldItem): string[] => {
  const errors: string[] = [];
  if (!item.customerName?.trim()) errors.push("ชื่อลูกค้า");
  if (!item.amount || item.amount <= 0) errors.push("จำนวนเงิน");
  return errors;
};

interface BillHoldGroupProps {
  items: BillHoldItem[];
  onChange: (items: BillHoldItem[]) => void;
  availableCustomers: Array<{ id: number; name: string }>;
  onGetOrCreateCustomer: (name: string) => Promise<number>;
}

export function BillHoldGroup({
  items,
  onChange,
  availableCustomers,
  onGetOrCreateCustomer,
}: BillHoldGroupProps) {
  const groupTotal = calculateBillHoldTotal(items);

  const addItem = () => {
    const newItem: BillHoldItem = {
      id: `billhold-${Date.now()}`,
      customerId: null,
      customerName: "",
      amount: 0,
    };
    onChange([...items, newItem]);
  };

  const removeItem = (itemId: string) => {
    onChange(items.filter((i) => i.id !== itemId));
  };

  const updateItem = (itemId: string, updates: Partial<BillHoldItem>) => {
    onChange(
      items.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
    );
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
        บิลฝากเก็บ
      </Heading>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="rounded-lg border border-gray-200 p-2"
          >
            <div className="grid grid-cols-12 gap-2 items-end">
              {/* Customer Name */}
              <div className="col-span-6">
                {index === 0 && (
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    ชื่อลูกค้า <span className="text-red-500">*</span>
                  </label>
                )}
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
                  placeholder=""
                  allowCreate
                  onCreate={async (name) => {
                    const id = await onGetOrCreateCustomer(name);
                    updateItem(item.id, {
                      customerId: id,
                      customerName: name,
                    });
                  }}
                  initialValue={item.customerName}
                  error={!item.customerName?.trim() ? "กรุณากรอกชื่อลูกค้า" : undefined}
                />
              </div>

              {/* Amount */}
              <div className="col-span-4">
                {index === 0 && (
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    จำนวนเงิน <span className="text-red-500">*</span>
                  </label>
                )}
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
                  data-invalid={!item.amount || item.amount <= 0 ? "true" : undefined}
                  className={`h-9 px-3 text-sm ${(!item.amount || item.amount <= 0) ? 'border-red-500 bg-red-50' : ''}`}
                />
              </div>

              {/* Actions */}
              <div className="col-span-2 flex items-end">
                <Button onClick={() => removeItem(item.id)} kind="negative" size="compact" className="w-full">
                  ลบ
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Add Item Button */}
        <Button onClick={addItem} size="compact" className="w-full mt-2">
          + เพิ่มรายการบิลฝากเก็บ
        </Button>
      </div>

      {/* Group Total */}
      <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2">
        <div className="text-right text-base font-semibold text-orange-800">
          ยอดรวมบิลฝากเก็บ: {formatCurrency(groupTotal)}
        </div>
      </div>
    </Card>
  );
}
