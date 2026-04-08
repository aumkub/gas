// Calculation utilities for sales reports

// Sales calculations
export function calculateSalesItemTotal(price: number, quantity: number): number {
  return price * quantity;
}

export function calculateCustomerTotal(
  items: Array<{ price: number; quantity: number; total: number }>
): number {
  return items.reduce((sum, item) => sum + item.total, 0);
}

export function calculateSalesGroupTotal(
  customers: Array<{ items: Array<{ total: number }> }>
): number {
  return customers.reduce((sum, customer) => {
    const customerTotal = customer.items.reduce(
      (itemSum, item) => itemSum + item.total,
      0
    );
    return sum + customerTotal;
  }, 0);
}

// Bill hold calculations
export function calculateBillHoldTotal(items: Array<{ amount: number }>): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

// Check calculations
export function calculateCheckTotal(items: Array<{ amount: number }>): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

// Grand total
export function calculateGrandTotal(
  salesTotal: number,
  billHoldTotal: number,
  checkTotal: number
): number {
  return salesTotal + billHoldTotal + checkTotal;
}

// Product price merging logic
// Merge items with same product ID and same price
export function mergeSalesItemsByPrice<T extends { productId: number | null; price: number; quantity: number }>(
  items: T[]
): T[] {
  const merged = new Map<string, T>();

  items.forEach((item) => {
    const key = `${item.productId}_${item.price}`;
    const existing = merged.get(key);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.set(key, { ...item });
    }
  });

  return Array.from(merged.values());
}

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format number with comma separators
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("th-TH").format(num);
}
