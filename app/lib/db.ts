import type { D1Database } from "@cloudflare/workers-types";

export interface User {
  id: number;
  username: string;
  password: string;
  created_at: string;
}

export interface Session {
  token: string;
  user_id: number;
  expires_at: string;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProductPrice {
  id: number;
  product_id: number;
  price: number;
  price_label: string | null;
}

export interface Bank {
  id: number;
  bank_name: string;
  account_number: string;
  owner_name: string;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: number;
  report_date: string;
  user_id: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface SalesItem {
  id: number;
  report_id: number;
  customer_id: number;
  product_id: number;
  price: number;
  quantity: number;
  total: number;
  customer_name?: string;
  product_name?: string;
}

export interface BillHoldItem {
  id: number;
  report_id: number;
  customer_id: number;
  amount: number;
  customer_name?: string;
}

export interface CheckItem {
  id: number;
  report_id: number;
  bank_name: string;
  account_number: string;
  customer_id: number;
  check_date: string;
  amount: number;
  customer_name?: string;
}

// User functions
export async function getUserByUsername(
  db: D1Database,
  username: string
): Promise<User | null> {
  const result = await db
    .prepare("SELECT * FROM users WHERE username = ?")
    .bind(username)
    .first<User>();
  return result || null;
}

export async function createUser(
  db: D1Database,
  username: string,
  hashedPassword: string
): Promise<User> {
  const result = await db
    .prepare("INSERT INTO users (username, password) VALUES (?, ?)")
    .bind(username, hashedPassword)
    .run();

  const user = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(result.meta.last_row_id)
    .first<User>();

  if (!user) throw new Error("Failed to create user");
  return user;
}

export async function updateUserPassword(
  db: D1Database,
  userId: number,
  hashedPassword: string
): Promise<void> {
  await db
    .prepare("UPDATE users SET password = ? WHERE id = ?")
    .bind(hashedPassword, userId)
    .run();
}

// Session functions
export async function getSession(
  db: D1Database,
  token: string
): Promise<Session | null> {
  const result = await db
    .prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')")
    .bind(token)
    .first<Session>();
  return result || null;
}

export async function createSession(
  db: D1Database,
  token: string,
  userId: number,
  expiresAt: Date
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
    )
    .bind(token, userId, expiresAt.toISOString())
    .run();
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
}

export async function deleteExpiredSessions(db: D1Database): Promise<void> {
  await db
    .prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')")
    .run();
}

export async function getUserBySession(
  db: D1Database,
  token: string
): Promise<User | null> {
  const session = await getSession(db, token);
  if (!session) return null;

  const user = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(session.user_id)
    .first<User>();

  return user || null;
}

// Customer functions
export async function getAllCustomers(
  db: D1Database
): Promise<Customer[]> {
  const result = await db
    .prepare("SELECT * FROM customers ORDER BY name ASC")
    .all<Customer>();
  return result.results;
}

export async function getCustomerByName(
  db: D1Database,
  name: string
): Promise<Customer | null> {
  const result = await db
    .prepare("SELECT * FROM customers WHERE name = ?")
    .bind(name)
    .first<Customer>();
  return result || null;
}

export async function createCustomer(
  db: D1Database,
  name: string
): Promise<Customer> {
  const result = await db
    .prepare("INSERT INTO customers (name) VALUES (?)")
    .bind(name)
    .run();

  const customer = await db
    .prepare("SELECT * FROM customers WHERE id = ?")
    .bind(result.meta.last_row_id)
    .first<Customer>();

  if (!customer) throw new Error("Failed to create customer");
  return customer;
}

export async function getOrCreateCustomer(
  db: D1Database,
  name: string
): Promise<Customer> {
  const existing = await getCustomerByName(db, name);
  if (existing) return existing;
  return createCustomer(db, name);
}

// Product functions
export async function getAllProducts(db: D1Database): Promise<Product[]> {
  const result = await db
    .prepare("SELECT * FROM products ORDER BY name ASC")
    .all<Product>();
  return result.results;
}

export async function getProductById(
  db: D1Database,
  id: number
): Promise<Product | null> {
  const result = await db
    .prepare("SELECT * FROM products WHERE id = ?")
    .bind(id)
    .first<Product>();
  return result || null;
}

export async function getProductByName(
  db: D1Database,
  name: string
): Promise<Product | null> {
  const result = await db
    .prepare("SELECT * FROM products WHERE name = ?")
    .bind(name)
    .first<Product>();
  return result || null;
}

export async function getProductPrices(
  db: D1Database,
  productId: number
): Promise<ProductPrice[]> {
  const result = await db
    .prepare("SELECT * FROM product_prices WHERE product_id = ?")
    .bind(productId)
    .all<ProductPrice>();
  return result.results;
}

export async function createProduct(
  db: D1Database,
  name: string
): Promise<Product> {
  const result = await db
    .prepare("INSERT INTO products (name) VALUES (?)")
    .bind(name)
    .run();

  const product = await db
    .prepare("SELECT * FROM products WHERE id = ?")
    .bind(result.meta.last_row_id)
    .first<Product>();

  if (!product) throw new Error("Failed to create product");
  return product;
}

export async function updateProduct(
  db: D1Database,
  id: number,
  name: string
): Promise<void> {
  await db
    .prepare("UPDATE products SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(name, id)
    .run();
}

export async function deleteProduct(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
}

export async function addProductPrice(
  db: D1Database,
  productId: number,
  price: number,
  priceLabel: string | null = null
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO product_prices (product_id, price, price_label) VALUES (?, ?, ?)"
    )
    .bind(productId, price, priceLabel)
    .run();
}

export async function updateProductPrice(
  db: D1Database,
  id: number,
  price: number,
  priceLabel: string | null = null
): Promise<void> {
  await db
    .prepare("UPDATE product_prices SET price = ?, price_label = ? WHERE id = ?")
    .bind(price, priceLabel, id)
    .run();
}

export async function deleteProductPrice(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM product_prices WHERE id = ?").bind(id).run();
}

export async function getProductsPrices(
  db: D1Database
): Promise<(Product & { prices: ProductPrice[] })[]> {
  const products = await getAllProducts(db);
  const result = [];

  for (const product of products) {
    const prices = await getProductPrices(db, product.id);
    result.push({ ...product, prices });
  }

  return result;
}

// Bank functions
export async function getAllBanks(db: D1Database): Promise<Bank[]> {
  const result = await db
    .prepare("SELECT * FROM banks ORDER BY bank_name ASC")
    .all<Bank>();
  return result.results;
}

export async function createBank(
  db: D1Database,
  bankName: string,
  accountNumber: string,
  ownerName: string
): Promise<Bank> {
  const result = await db
    .prepare(
      "INSERT INTO banks (bank_name, account_number, owner_name) VALUES (?, ?, ?)"
    )
    .bind(bankName, accountNumber, ownerName)
    .run();

  const bank = await db
    .prepare("SELECT * FROM banks WHERE id = ?")
    .bind(result.meta.last_row_id)
    .first<Bank>();

  if (!bank) throw new Error("Failed to create bank");
  return bank;
}

export async function updateBank(
  db: D1Database,
  id: number,
  bankName: string,
  accountNumber: string,
  ownerName: string
): Promise<void> {
  await db
    .prepare(
      "UPDATE banks SET bank_name = ?, account_number = ?, owner_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(bankName, accountNumber, ownerName, id)
    .run();
}

export async function deleteBank(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM banks WHERE id = ?").bind(id).run();
}

// Report functions
export async function getReportsByMonth(
  db: D1Database,
  year: number,
  month: number
): Promise<Report[]> {
  const result = await db
    .prepare(
      "SELECT * FROM reports WHERE strftime('%Y', report_date) = ? AND strftime('%m', report_date) = ? ORDER BY report_date ASC"
    )
    .bind(year.toString(), month.toString().padStart(2, "0"))
    .all<Report>();
  return result.results;
}

export async function getReportByDate(
  db: D1Database,
  date: string
): Promise<Report | null> {
  const result = await db
    .prepare("SELECT * FROM reports WHERE report_date = ?")
    .bind(date)
    .first<Report>();
  return result || null;
}

export async function createReport(
  db: D1Database,
  date: string,
  userId: number
): Promise<Report> {
  const result = await db
    .prepare("INSERT INTO reports (report_date, user_id) VALUES (?, ?)")
    .bind(date, userId)
    .run();

  const report = await db
    .prepare("SELECT * FROM reports WHERE id = ?")
    .bind(result.meta.last_row_id)
    .first<Report>();

  if (!report) throw new Error("Failed to create report");
  return report;
}

export async function updateReportTimestamp(
  db: D1Database,
  reportId: number
): Promise<void> {
  await db
    .prepare("UPDATE reports SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(reportId)
    .run();
}

export async function incrementReportVersion(
  db: D1Database,
  reportId: number
): Promise<void> {
  await db
    .prepare("UPDATE reports SET version = version + 1 WHERE id = ?")
    .bind(reportId)
    .run();
}

// Sales items
export async function getSalesItemsByReport(
  db: D1Database,
  reportId: number
): Promise<SalesItem[]> {
  const result = await db
    .prepare(`
      SELECT si.*, c.name as customer_name, p.name as product_name
      FROM sales_items si
      LEFT JOIN customers c ON si.customer_id = c.id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.report_id = ?
      ORDER BY si.id ASC
    `)
    .bind(reportId)
    .all<SalesItem>();
  return result.results;
}

export async function createSalesItem(
  db: D1Database,
  reportId: number,
  customerId: number,
  productId: number,
  price: number,
  quantity: number,
  total: number
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO sales_items (report_id, customer_id, product_id, price, quantity, total) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(reportId, customerId, productId, price, quantity, total)
    .run();
}

export async function deleteSalesItemsByReport(
  db: D1Database,
  reportId: number
): Promise<void> {
  await db
    .prepare("DELETE FROM sales_items WHERE report_id = ?")
    .bind(reportId)
    .run();
}

// Bill hold items
export async function getBillHoldItemsByReport(
  db: D1Database,
  reportId: number
): Promise<BillHoldItem[]> {
  const result = await db
    .prepare(`
      SELECT bhi.*, c.name as customer_name
      FROM bill_hold_items bhi
      LEFT JOIN customers c ON bhi.customer_id = c.id
      WHERE bhi.report_id = ?
      ORDER BY bhi.id ASC
    `)
    .bind(reportId)
    .all<BillHoldItem>();
  return result.results;
}

export async function createBillHoldItem(
  db: D1Database,
  reportId: number,
  customerId: number,
  amount: number
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO bill_hold_items (report_id, customer_id, amount) VALUES (?, ?, ?)"
    )
    .bind(reportId, customerId, amount)
    .run();
}

export async function deleteBillHoldItemsByReport(
  db: D1Database,
  reportId: number
): Promise<void> {
  await db
    .prepare("DELETE FROM bill_hold_items WHERE report_id = ?")
    .bind(reportId)
    .run();
}

// Check items
export async function getCheckItemsByReport(
  db: D1Database,
  reportId: number
): Promise<CheckItem[]> {
  const result = await db
    .prepare(`
      SELECT ci.*, c.name as customer_name
      FROM check_items ci
      LEFT JOIN customers c ON ci.customer_id = c.id
      WHERE ci.report_id = ?
      ORDER BY ci.id ASC
    `)
    .bind(reportId)
    .all<CheckItem>();
  return result.results;
}

export async function createCheckItem(
  db: D1Database,
  reportId: number,
  bankName: string,
  accountNumber: string,
  customerId: number,
  checkDate: string,
  amount: number
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO check_items (report_id, bank_name, account_number, customer_id, check_date, amount) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(reportId, bankName, accountNumber, customerId, checkDate, amount)
    .run();
}

export async function deleteCheckItemsByReport(
  db: D1Database,
  reportId: number
): Promise<void> {
  await db
    .prepare("DELETE FROM check_items WHERE report_id = ?")
    .bind(reportId)
    .run();
}

// Shared link functions
export async function createSharedLink(
  db: D1Database,
  reportId: number
): Promise<string> {
  const linkId = crypto.randomUUID();
  await db
    .prepare("INSERT INTO shared_links (report_id, link_id) VALUES (?, ?)")
    .bind(reportId, linkId)
    .run();
  return linkId;
}

export async function getSharedLink(
  db: D1Database,
  linkId: string
): Promise<{ report_id: number } | null> {
  const result = await db
    .prepare("SELECT report_id FROM shared_links WHERE link_id = ?")
    .bind(linkId)
    .first<{ report_id: number }>();
  return result || null;
}

// Version history
export async function saveReportVersion(
  db: D1Database,
  reportId: number,
  versionNumber: number,
  salesData: string,
  billHoldData: string,
  checkData: string
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO report_versions (report_id, version_number, sales_data, bill_hold_data, check_data) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(reportId, versionNumber, salesData, billHoldData, checkData)
    .run();
}

export async function getReportVersions(
  db: D1Database,
  reportId: number
): Promise<
  {
    id: number;
    report_id: number;
    version_number: number;
    sales_data: string;
    bill_hold_data: string;
    check_data: string;
    created_at: string;
  }[]
> {
  const result = await db
    .prepare(
      "SELECT * FROM report_versions WHERE report_id = ? ORDER BY version_number DESC LIMIT 15"
    )
    .bind(reportId)
    .all();
  return result.results;
}

export async function deleteOldVersions(db: D1Database, reportId: number): Promise<void> {
  await db
    .prepare(`
      DELETE FROM report_versions
      WHERE report_id = ?
      AND id NOT IN (
        SELECT id FROM report_versions
        WHERE report_id = ?
        ORDER BY version_number DESC
        LIMIT 15
      )
    `)
    .bind(reportId, reportId)
    .run();
}
