import { useState, useEffect, useRef } from "react";
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
  isCash: boolean;
}

// Validation functions
export const isSalesItemValid = (item: SalesItem): boolean => {
  return !!(
    item.productName?.trim() &&
    item.price > 0 &&
    item.quantity > 0
  );
};

export const isSalesCustomerValid = (customer: SalesCustomer): boolean => {
  if (!customer.customerName?.trim()) return false;
  return customer.items.length > 0 && customer.items.every(isSalesItemValid);
};

export const getSalesItemErrors = (item: SalesItem): string[] => {
  const errors: string[] = [];
  if (!item.productName?.trim()) errors.push("ชื่อสินค้า");
  if (!item.price || item.price <= 0) errors.push("ราคา");
  if (!item.quantity || item.quantity <= 0) errors.push("จำนวน");
  return errors;
};

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
  focusTarget?: {
    type: 'customer' | 'product';
    customerId: string;
  } | null;
  onFocusComplete?: () => void;
}

export function SalesGroup({
  customers,
  onChange,
  availableProducts,
  availableCustomers,
  onGetOrCreateCustomer,
  focusTarget,
  onFocusComplete,
}: SalesGroupProps) {
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const customerInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const productInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Update expanded customers when customers array changes
  useEffect(() => {
    if (customers.length > 0) {
      setExpandedCustomers(new Set(customers.map((c) => c.id)));
    }
  }, [customers]);

  // Handle focus target
  useEffect(() => {
    if (!focusTarget) return;

    const { type, customerId } = focusTarget;

    // Longer delay to ensure DOM and refs are fully updated
    setTimeout(() => {
      if (type === 'customer') {
        const input = customerInputRefs.current.get(customerId);
        if (input) {
          input.focus();
          input.select();
        }
      } else if (type === 'product') {
        const input = productInputRefs.current.get(customerId);
        if (input) {
          input.focus();
          input.select();
        }
      }
      onFocusComplete?.();
    }, 150);
  }, [focusTarget, onFocusComplete]);

  const groupTotal = calculateSalesGroupTotal(customers);

  const addCustomer = () => {
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
      items: [newItem], // Automatically add one product line
      isCash: false,
    };
    const updatedCustomers = [...customers, newCustomer];
    onChange(updatedCustomers);
    setExpandedCustomers(new Set([...expandedCustomers, newCustomer.id]));

    // Focus on the new customer input
    setTimeout(() => {
      const input = customerInputRefs.current.get(newCustomer.id);
      if (input) {
        console.log('Focusing new customer input after addCustomer:', newCustomer.id);
        input.focus();
        input.select();
      }
    }, 150);
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
        ขาย
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
                    ชื่อลูกค้า <span className="text-red-500">*</span>
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
                    error={!customer.customerName?.trim() ? "invalid" : undefined}
                    inputRef={(el) => {
                      customerInputRefs.current.set(customer.id, el);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`cash-${customer.id}`}
                      checked={customer.isCash || false}
                      onChange={(e) => {
                        updateCustomer(customer.id, {
                          isCash: e.target.checked,
                        });
                      }}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`cash-${customer.id}`}
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      สด
                    </label>
                  </div>
                  <div className="flex gap-2">
                  <Button
                    onClick={() => toggleExpanded(customer.id)}
                    size="compact"
                    kind="ghost"
                    tabIndex={-1}
                  >
                    <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronUp} />
                  </Button>
                  <Button
                    onClick={() => removeCustomer(customer.id)}
                    kind="negative"
                    size="compact"
                    tabIndex={-1}
                  >
                    ลบลูกค้า
                  </Button>
                  </div>
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
                    <div className="col-span-4 text-sm font-medium text-gray-700">ชื่อสินค้า <span className="text-red-500">*</span></div>
                    <div className="col-span-2 text-sm font-medium text-gray-700">ราคา <span className="text-red-500">*</span></div>
                    <div className="col-span-2 text-sm font-medium text-gray-700">จำนวน <span className="text-red-500">*</span></div>
                    <div className="col-span-2 text-sm font-medium text-gray-700">รวม</div>
                    <div className="col-span-2"></div>
                  </div>

                  <div className="max-h-96 space-y-2 pr-1">
                    {customer.items.map((item, index) => (
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
                        productInputRef={(el) => {
                          if (el && index === customer.items.length - 1) {
                            productInputRefs.current.set(customer.id, el);
                          }
                        }}
                      />
                    ))}
                  </div>

                  <Button onClick={() => addItem(customer.id)} size="compact" className="w-full mt-2 sticky bottom-0 z-10 shadow-lg">
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
          ยอดรวมขาย: {formatCurrency(groupTotal)}
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
  productInputRef?: (el: HTMLInputElement | null) => void;
}

function ProductRow({
  item,
  availableProducts,
  onUpdate,
  onProductSelect,
  onDuplicate,
  onRemove,
  productInputRef,
}: ProductRowProps) {
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const productInputRefInternal = useRef<HTMLInputElement>(null);
  const selectedProduct = availableProducts.find((p) => p.id === item.productId);
  const availablePrices = selectedProduct?.prices || [];

  // Call the productInputRef callback when the input is available
  useEffect(() => {
    if (productInputRef && productInputRefInternal.current) {
      productInputRef(productInputRefInternal.current);
    }
  }, [productInputRef]);

  return (
    <div className="grid grid-cols-12 items-end gap-2 rounded-lg py-0 p-2.5">
      {/* Product Name */}
      <div className="col-span-4">
        <AutoComplete
          items={availableProducts}
          itemToString={(p) => p.name}
          renderItem={(p) => {
            const priceList = p.prices.map(pr => {
              if (pr.price_label) {
                return `${pr.price} บาท (${pr.price_label})`;
              }
              return `${pr.price} บาท`;
            }).join(", ");
            return (
              <div className="flex flex-col">
                <span className="font-medium">{p.name}</span>
                {p.prices.length > 0 && (
                  <span className="text-xs text-gray-500">{priceList}</span>
                )}
              </div>
            );
          }}
          onInputValueChange={(value) =>
            onUpdate({
              productId: null,
              productName: value,
              price: value.trim() ? item.price : 0,
            })
          }
          onSelect={(product) => {
            // Just set the product, price selection will be handled by price autocomplete
            onUpdate({
              productId: product.id,
              productName: product.name,
            });
          }}
          placeholder="ชื่อสินค้า"
          allowCreate
          error={!item.productName?.trim() ? "กรุณากรอกชื่อสินค้า" : undefined}
          initialValue={item.productName}
          inputRef={productInputRefInternal}
        />
      </div>

      {/* Price */}
      <div className="col-span-2">
        {selectedProduct && availablePrices.length > 0 ? (
          <AutoComplete
            items={availablePrices}
            itemToString={(price) => {
              // For display in input, show just the number without "บาท"
              return price.price.toString();
            }}
            renderItem={(price) => {
              // In dropdown, show price with label if available
              if (price.price_label) {
                return `${price.price} (${price.price_label})`;
              }
              return `${price.price}`;
            }}
            onInputValueChange={(value) => {
              const price = parseFloat(value) || 0;
              onUpdate({ price });
            }}
            onSelect={(price) => {
              onUpdate({ price: price.price });
              onProductSelect(selectedProduct, availablePrices.indexOf(price));
              // Focus quantity input after selecting price
              setTimeout(() => {
                quantityInputRef.current?.focus();
                quantityInputRef.current?.select();
              }, 50);
            }}
            placeholder="เลือกราคา"
            initialValue={item.price > 0 ? item.price.toString() : ""}
            preventEnter={true}
            error={!item.price || item.price <= 0 ? "กรุณาเลือกราคา" : undefined}
          />
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
            data-invalid={!item.price || item.price <= 0 ? "true" : undefined}
            className={`h-10 px-3 text-sm ${(!item.price || item.price <= 0) ? "border-red-500 bg-red-50" : ""}`}
          />
        )}
      </div>

      {/* Quantity */}
      <div className="col-span-2">
        <Input
          ref={quantityInputRef}
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) =>
            onUpdate({ quantity: parseInt(e.target.value) || 1 })
          }
          data-invalid={!item.quantity || item.quantity <= 0 ? "true" : undefined}
          className={`h-10 px-3 text-sm ${(!item.quantity || item.quantity <= 0) ? 'border-red-500 bg-red-50' : ''}`}
        />
      </div>

      {/* Total */}
      <div className="col-span-2">
        <div className="flex h-[48px] items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium">
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
          tabIndex={-1}
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
          tabIndex={-1}
        >
          <FontAwesomeIcon icon={faTrash} />
        </Button>
      </div>
    </div>
  );
}
