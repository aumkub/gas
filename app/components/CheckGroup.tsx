import { Button } from "~/components/ui/button";
import { Card } from "~/components/Card";
import { Heading } from "~/components/Heading";
import { Input } from "~/components/ui/input";
import { AutoComplete } from "./AutoComplete";
import { calculateCheckTotal, formatCurrency } from "~/lib/calculations";

export interface CheckItem {
  id: string;
  bankName: string;
  accountNumber: string;
  customerId: number | null;
  customerName: string;
  checkDate: string;
  amount: number;
}

// Validation function to check if an item is complete
export const isCheckItemValid = (item: CheckItem): boolean => {
  return !!(
    item.customerName?.trim() &&
    item.bankName?.trim() &&
    item.accountNumber?.trim() &&
    item.checkDate &&
    item.amount > 0
  );
};

// Get validation errors for an item
export const getCheckItemErrors = (item: CheckItem): string[] => {
  const errors: string[] = [];
  if (!item.customerName?.trim()) errors.push("ชื่อลูกค้า");
  if (!item.bankName?.trim()) errors.push("ชื่อธนาคาร");
  if (!item.accountNumber?.trim()) errors.push("เลขบัญชี");
  if (!item.checkDate) errors.push("วันที่บนเช็ค");
  if (!item.amount || item.amount <= 0) errors.push("จำนวนเงิน");
  return errors;
};

interface CheckGroupProps {
  items: CheckItem[];
  onChange: (items: CheckItem[]) => void;
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

  // Comprehensive list of Thai banks
  const thaiBanks = [
    "ธนาคารแห่งประเทศไทย",
    "ธนาคารกรุงเทพ",
    "ธนาคารกสิกรไทย",
    "ธนาคารไทยพาณิชย์",
    "ธนาคารกรุงไทย",
    "ธนาคารทหารไทยธนชาต",
    "ธนาคารยูโอบี",
    "ธนาคารซีไอเอ็มบีไทย",
    "ธนาคารแลนด์ แอนด์ เฮาส์",
    "ธนาคารทิสโก้",
    "ธนาคารเกียรตินาคิน",
    "ธนาคารออมสิน",
    "ธนาคารอาคารสงเคราะห์",
    "ธนาคารอิสลามแห่งประเทศไทย",
    "ธนาคารไอซีบีซี (ไทย)",
    "ธนาคารพัฒนาวิสาหกิจขนาดกลาง",
    "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร",
    "ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย",
    "ธนาคารอาเซียน",
    "ธนาคารแห่งรัฐ",
  ];

  // Get unique bank names from availableBanks combined with Thai banks
  const getUniqueBankNames = () => {
    const dbBankNames = new Set(availableBanks.map(b => b.bank_name));
    const allBanks = new Set([...thaiBanks, ...Array.from(dbBankNames)]);
    return Array.from(allBanks).sort();
  };

  // Find bank record by customer name (case-insensitive, trimmed)
  const findBankByCustomerName = (customerName: string) => {
    if (!customerName || !customerName.trim()) return null;
    const search = customerName.trim().toLowerCase();
    return availableBanks.find(b =>
      b.owner_name && b.owner_name.trim().toLowerCase() === search
    ) || null;
  };

  const uniqueBankNames = getUniqueBankNames();

  const getCustomerBankUpdates = (customerName: string): Partial<CheckItem> => {
    const bankRecord = findBankByCustomerName(customerName);
    if (!bankRecord) {
      return {};
    }

    return {
      bankName: bankRecord.bank_name,
      accountNumber: bankRecord.account_number,
    };
  };

  // Check if any items have validation errors
  const getInvalidItems = () => {
    return items.filter(item => !isCheckItemValid(item));
  };

  return (
    <Card className="mb-4 p-4">
      <Heading styleLevel={3} className="mb-3 text-xl">
        เช็ค
      </Heading>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-gray-200 p-3"
          >
            <div className="grid grid-cols-2 gap-3 mb-1">
              {/* Customer Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  ชื่อลูกค้า <span className="text-red-500">*</span>
                </label>
                <AutoComplete
                  items={availableBanks}
                  itemToString={(b) => b.owner_name || ""}
                  renderItem={(b) => {
                    return (
                      <div className="flex flex-col">
                        <span className="font-medium">{b.owner_name || "-"}</span>
                        <span className="text-sm text-gray-500">{b.account_number} - {b.bank_name}</span>
                      </div>
                    );
                  }}
                  onInputValueChange={(value) => {
                    const normalized = value.trim().toLowerCase();
                    const hasExactOwnerMatch = availableBanks.some(
                      (bank) =>
                        bank.owner_name &&
                        bank.owner_name.trim().toLowerCase() === normalized
                    );

                    updateItem(item.id, {
                      customerId: null,
                      customerName: value,
                      ...(hasExactOwnerMatch ? getCustomerBankUpdates(value) : {}),
                    });
                  }}
                  filterItem={(bank, query) => {
                    const search = query.toLowerCase();
                    return (
                      (!!bank.owner_name &&
                        bank.owner_name.toLowerCase().includes(search)) ||
                      bank.account_number.includes(query) ||
                      (!!bank.bank_name &&
                        bank.bank_name.toLowerCase().includes(search))
                    );
                  }}
                  onSelect={(bank) => {
                    updateItem(item.id, {
                      customerId: null,
                      customerName: bank.owner_name,
                      bankName: bank.bank_name,
                      accountNumber: bank.account_number,
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

              {/* Check Date */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  วันที่บนเช็ค <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={item.checkDate}
                  onChange={(e) =>
                    updateItem(item.id, { checkDate: e.target.value })
                  }
                  data-invalid={!item.checkDate ? "true" : undefined}
                  className={`h-10 px-3 text-sm ${!item.checkDate ? 'border-red-500 bg-red-50' : ''}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-1">
              {/* Bank Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  ชื่อธนาคาร <span className="text-red-500">*</span>
                </label>
                <AutoComplete
                  items={uniqueBankNames}
                  itemToString={(name) => name}
                  onInputValueChange={(value) => {
                    updateItem(item.id, {
                      bankName: value,
                    });
                  }}
                  onSelect={(name) => {
                    updateItem(item.id, {
                      bankName: name,
                    });
                  }}
                  placeholder=""
                  initialValue={item.bankName}
                  error={!item.bankName?.trim() ? "กรุณากรอกชื่อธนาคาร" : undefined}
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  เลขบัญชี <span className="text-red-500">*</span>
                </label>
                <AutoComplete
                  items={availableBanks}
                  itemToString={(b) => b.account_number}
                  renderItem={(b) => {
                    return (
                      <div className="flex flex-col">
                        <span className="font-medium">{b.account_number}</span>
                        <span className="text-xs text-gray-500">{b.bank_name}</span>
                        {b.owner_name && (
                          <span className="text-xs text-gray-500">{b.owner_name}</span>
                        )}
                      </div>
                    );
                  }}
                  onInputValueChange={(value) => {
                    updateItem(item.id, {
                      accountNumber: value,
                    });
                  }}
                  filterItem={(bank, query) =>
                    bank.account_number.includes(query) ||
                    bank.bank_name.toLowerCase().includes(query.toLowerCase()) ||
                    bank.owner_name.toLowerCase().includes(query.toLowerCase())
                  }
                  onSelect={(bank) => {
                    // Auto-fill all fields from selected bank record
                    updateItem(item.id, {
                      customerId: null,
                      bankName: bank.bank_name,
                      accountNumber: bank.account_number,
                      customerName: bank.owner_name,
                    });
                  }}
                  placeholder=""
                  initialValue={item.accountNumber}
                  error={!item.accountNumber?.trim() ? "กรุณากรอกเลขบัญชี" : undefined}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-1">
              {/* Amount */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  จำนวนเงิน <span className="text-red-500">*</span>
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
                  data-invalid={!item.amount || item.amount <= 0 ? "true" : undefined}
                  className={`h-10 px-3 text-sm ${(!item.amount || item.amount <= 0) ? 'border-red-500 bg-red-50' : ''}`}
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
        <Button onClick={addItem} size="compact" className="w-full mt-2">
          + เพิ่มรายการเช็ค
        </Button>
      </div>

      {/* Group Total */}
      <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2">
        <div className="text-right text-base font-semibold text-purple-800">
          ยอดรวมเช็ค: {formatCurrency(groupTotal)}
        </div>
      </div>
    </Card>
  );
}
