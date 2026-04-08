import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/Card";
import { Heading } from "~/components/Heading";
import { Input } from "~/components/ui/input";
import { AutoComplete } from "./AutoComplete";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faCopy,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import {
  calculateSalesItemTotal,
  calculateCustomerTotal,
  calculateSalesGroupTotal,
  formatCurrency,
} from "~/lib/calculations";

// Types
export interface SalesItem {
  id: string;
  productId: number | null;
  productName: string;
  price: number;
  quantity: number;
  total: number;
}

export interface SalesCustomer {
  id: string;
  customerId: number | null;
  customerName: string;
  items: SalesItem[];
}

interface ProductWithPrices {
  id: number;
  name: string;
  prices: Array<{ id: number; price: number; price_label: string | null }>;
}

interface SalesGroupProps {
  customers: SalesCustomer[];
  onChange: (customers: SalesCustomer[]) => void;
  availableProducts: ProductWithPrices[];
  availableCustomers: Array<{ id: number; name: string }>;
  onGetOrCreateCustomer: (name: string) => Promise<number>;
}

export function SalesGroup({
  customers,
  onChange,
  availableProducts,
  availableCustomers,
  onGetOrCreateCustomer,
}: SalesGroupProps) {
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  // Update expanded customers when customers array changes
  useEffect(() => {
    if (customers.length > 0) {
      setExpandedCustomers(new Set(customers.map((c) => c.id)));
    }
  }, [customers]);

  const groupTotal = calculateSalesGroupTotal(customers);

  const addCustomer = () => {
    const newCustomer: SalesCustomer = {
      id: `customer-${Date.now()}`,
      customerId: null,
      customerName: "",
      items: [],
    };
    onChange([...customers, newCustomer]);
    setExpandedCustomers(new Set([...expandedCustomers, newCustomer.id]));
  };

  const removeCustomer = (customerId: string) => {
    onChange(customers.filter((c) => c.id !== customerId));
    setExpandedCustomers(
      new Set(Array.from(expandedCustomers).filter((id) => id !== customerId))
    );
  };

  const updateCustomer = (
    customerId: string,
    updates: Partial<SalesCustomer>
  ) => {
    onChange(
      customers.map((c) =>
        c.id === customerId ? { ...c, ...updates } : c
      )
    );
  };

  const addItem = (customerId: string) => {
    const newItem: SalesItem = {
      id: `item-${Date.now()}`,
      productId: null,
      productName: "",
      price: 0,
      quantity: 1,
      total: 0,
    };
    updateCustomer(customerId, {
      items: [...customers.find((c) => c.id === customerId)!.items, newItem],
    });
  };

  const removeItem = (customerId: string, itemId: string) => {
    const customer = customers.find((c) => c.id === customerId)!;
    updateCustomer(customerId, {
      items: customer.items.filter((i) => i.id !== itemId),
    });
  };

  const duplicateItem = (customerId: string, itemId: string) => {
    const customer = customers.find((c) => c.id === customerId)!;
    const item = customer.items.find((i) => i.id === itemId)!;
    const newItem: SalesItem = {
      ...item,
      id: `item-${Date.now()}`,
    };
    updateCustomer(customerId, {
      items: [...customer.items, newItem],
    });
  };

  const updateItem = (
    customerId: string,
    itemId: string,
    updates: Partial<SalesItem>
  ) => {
    const customer = customers.find((c) => c.id === customerId)!;
    const items = customer.items.map((i) => {
      if (i.id === itemId) {
        const updated = { ...i, ...updates };
        updated.total = calculateSalesItemTotal(updated.price, updated.quantity);
        return updated;
      }
      return i;
    });
    updateCustomer(customerId, { items });
  };

  const handleProductSelect = (
    customerId: string,
    itemId: string,
    product: ProductWithPrices,
    priceIndex?: number
  ) => {
    const prices = product.prices;
    let selectedPrice = prices[0]?.price || 0;

    if (prices.length > 1 && priceIndex !== undefined) {
      selectedPrice = prices[priceIndex]?.price || 0;
    }

    updateItem(customerId, itemId, {
      productId: product.id,
      productName: product.name,
      price: selectedPrice,
    });
  };

  const toggleExpanded = (customerId: string) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedCustomers(newExpanded);
  };

  return (
    <Card className="mb-4 p-4">
      <Heading styleLevel={3} className="mb-3 text-xl">
        กลุ่มขาย
      </Heading>

      <div className="space-y-3">
        {customers.map((customer) => {
          const customerTotal = calculateCustomerTotal(customer.items);
          const isExpanded = expandedCustomers.has(customer.id);

          return (
            <div
              key={customer.id}
              className="rounded-lg border border-gray-200 p-3"
            >
              {/* Customer Header */}
              <div className="mb-3 flex items-end justify-between">
                <div className="flex-1 mr-4">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    ชื่อลูกค้า
                  </label>
                  <AutoComplete
                    items={availableCustomers}
                    itemToString={(c) => c.name}
                    onInputValueChange={(value) => {
                      updateCustomer(customer.id, {
                        customerId: null,
                        customerName: value,
                      });
                    }}
                    onSelect={(c) => {
                      updateCustomer(customer.id, {
                        customerId: c.id,
                        customerName: c.name,
                      });
                    }}
                    placeholder="พิมพ์หรือเลือกชื่อลูกค้า"
                    allowCreate
                    onCreate={async (name) => {
                      const id = await onGetOrCreateCustomer(name);
                      updateCustomer(customer.id, {
                        customerId: id,
                        customerName: name,
                      });
                    }}
                    initialValue={customer.customerName}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => toggleExpanded(customer.id)} size="compact" kind="ghost">
                    <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronUp} />
                  </Button>
                  {customers.length > 1 && (
                    <Button onClick={() => removeCustomer(customer.id)} kind="negative" size="compact">
                      ลบลูกค้า
                    </Button>
                  )}
                </div>
              </div>

              {/* Customer Total */}
              {customer.items.length > 0 && (
                <div className="mb-3 rounded-lg bg-blue-50 px-3 py-1.5 text-right">
                  <span className="text-sm font-medium text-blue-800">
                    ยอดรวมลูกค้า: {formatCurrency(customerTotal)}
                  </span>
                </div>
              )}

              {/* Product Table */}
              {isExpanded && (
                <div className="space-y-2">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 px-2">
                    <div className="col-span-4 text-sm font-medium text-gray-700">ชื่อสินค้า</div>
                    <div className="col-span-2 text-sm font-medium text-gray-700">ราคา</div>
                    <div className="col-span-2 text-sm font-medium text-gray-700">จำนวน</div>
                    <div className="col-span-2 text-sm font-medium text-gray-700">รวม</div>
                    <div className="col-span-2"></div>
                  </div>

                  {customer.items.map((item) => (
                    <ProductRow
                      key={item.id}
                      item={item}
                      availableProducts={availableProducts}
                      onUpdate={(updates) =>
                        updateItem(customer.id, item.id, updates)
                      }
                      onProductSelect={(product, priceIndex) =>
                        handleProductSelect(customer.id, item.id, product, priceIndex)
                      }
                      onDuplicate={() => duplicateItem(customer.id, item.id)}
                      onRemove={() => removeItem(customer.id, item.id)}
                    />
                  ))}

                  <Button onClick={() => addItem(customer.id)} size="compact" className="w-full">
                    + เพิ่มรายการสินค้า
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Customer Button */}
        <Button onClick={addCustomer} size="compact" className="w-full">
          + เพิ่มลูกค้า
        </Button>
      </div>

      {/* Group Total */}
      <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2">
        <div className="text-right text-base font-semibold text-green-800">
          ยอดรวมกลุ่มขาย: {formatCurrency(groupTotal)}
        </div>
      </div>
    </Card>
  );
}

interface ProductRowProps {
  item: SalesItem;
  availableProducts: ProductWithPrices[];
  onUpdate: (updates: Partial<SalesItem>) => void;
  onProductSelect: (product: ProductWithPrices, priceIndex?: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function ProductRow({
  item,
  availableProducts,
  onUpdate,
  onProductSelect,
  onDuplicate,
  onRemove,
}: ProductRowProps) {
  const [selectedPriceIndex, setSelectedPriceIndex] = useState<number | undefined>(
    undefined
  );

  const selectedProduct = availableProducts.find((p) => p.id === item.productId);
  const hasMultiplePrices = (selectedProduct?.prices.length || 0) > 1;

  return (
    <div className="grid grid-cols-12 items-end gap-2 rounded-lg bg-gray-50 p-2.5">
      {/* Product Name */}
      <div className="col-span-4">
        <AutoComplete
          items={availableProducts}
          itemToString={(p) => p.name}
          onInputValueChange={(value) =>
            onUpdate({
              productId: null,
              productName: value,
              price: value.trim() ? item.price : 0,
            })
          }
          onSelect={(product) => {
            const prices = product.prices;
            if (prices.length === 1) {
              onProductSelect(product, 0);
            } else if (prices.length > 1) {
              // Let user select price from dropdown
              onProductSelect(product, undefined);
              setSelectedPriceIndex(undefined);
            } else {
              // No prices, just set product name
              onUpdate({
                productId: product.id,
                productName: product.name,
                price: 0,
              });
            }
          }}
          placeholder="พิมพ์หรือเลือกสินค้า"
          initialValue={item.productName}
        />
      </div>

      {/* Price */}
      <div className="col-span-2">
        {hasMultiplePrices ? (
          <select
            value={
              selectedPriceIndex !== undefined
                ? selectedProduct!.prices[selectedPriceIndex]?.price
                : item.price
            }
            onChange={(e) => {
              const index = selectedProduct!.prices.findIndex(
                (p) => p.price === parseFloat(e.target.value)
              );
              setSelectedPriceIndex(index);
              onProductSelect(selectedProduct!, index);
            }}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
          >
            <option value="">เลือกราคา</option>
            {selectedProduct!.prices.map((price, index) => (
              <option key={price.id} value={price.price}>
                {price.price_label
                  ? `${price.price} (${price.price_label})`
                  : `${price.price} บาท`}
              </option>
            ))}
          </select>
        ) : (
          <Input
            type="number"
            step="0.01"
            min="0"
            value={item.price || ""}
            onChange={(e) =>
              onUpdate({ price: parseFloat(e.target.value) || 0 })
            }
            placeholder="0"
            className="h-10 px-3 text-sm"
          />
        )}
      </div>

      {/* Quantity */}
      <div className="col-span-2">
        <Input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) =>
            onUpdate({ quantity: parseInt(e.target.value) || 1 })
          }
          className="h-10 px-3 text-sm"
        />
      </div>

      {/* Total */}
      <div className="col-span-2">
        <div className="flex h-10 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium">
          {formatCurrency(item.total)}
        </div>
      </div>

      {/* Actions */}
      <div className="col-span-2 flex gap-1 items-end">
        <Button
          onClick={onDuplicate}
          size="compact"
          className="h-8 w-8 p-0"
          aria-label="คัดลอกรายการ"
          title="คัดลอก"
        >
          <FontAwesomeIcon icon={faCopy} />
        </Button>
        <Button
          onClick={onRemove}
          kind="tertiary"
          size="compact"
          className="h-8 w-8 p-0"
          aria-label="ลบรายการ"
          title="ลบ"
        >
          <FontAwesomeIcon icon={faTrash} />
        </Button>
      </div>
    </div>
  );
}
