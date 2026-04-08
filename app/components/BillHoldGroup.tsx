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
        กลุ่มบิลฝากเก็บ
      </Heading>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-gray-200 p-3"
          >
            <div className="grid grid-cols-12 gap-3 items-end">
              {/* Customer Name */}
              <div className="col-span-6">
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

              {/* Amount */}
              <div className="col-span-4">
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
        <Button onClick={addItem} size="compact" className="w-full">
          + เพิ่มรายการบิลฝากเก็บ
        </Button>
      </div>

      {/* Group Total */}
      <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2">
        <div className="text-right text-base font-semibold text-orange-800">
          ยอดรวมกลุ่มบิลฝากเก็บ: {formatCurrency(groupTotal)}
        </div>
      </div>
    </Card>
  );
}
