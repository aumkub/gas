import type { Route } from "./+types/products";
import { redirect, useLoaderData, useNavigation, Form } from "react-router";
import { requireAuth } from "~/lib/session";
import {
  getProductsPrices,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductPrice,
  updateProductPrice,
  deleteProductPrice,
} from "~/lib/db";
import type { Product, ProductPrice } from "~/lib/db";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/Card";
import { Heading } from "~/components/Heading";
import { Input } from "~/components/ui/input";
import { Modal, SIZE } from "~/components/ui/modal";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "จัดการสินค้า" },
    { name: "description", content: "จัดการสินค้าและราคา" },
  ];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env.DB);
  const products = await getProductsPrices(context.cloudflare.env.DB);
  return { user, products };
}

export async function action({ context, request }: Route.ActionArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env.DB);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const db = context.cloudflare.env.DB;

  try {
    switch (intent) {
      case "create": {
        const name = formData.get("name") as string;
        if (!name || !name.trim()) {
          return { error: "กรุณาระบุชื่อสินค้า" };
        }
        await createProduct(db, name.trim());
        return { success: "เพิ่มสินค้าเรียบร้อย" };
      }

      case "update": {
        const id = parseInt(formData.get("id") as string);
        const name = formData.get("name") as string;
        if (!id || !name || !name.trim()) {
          return { error: "ข้อมูลไม่ถูกต้อง" };
        }
        await updateProduct(db, id, name.trim());
        return { success: "แก้ไขสินค้าเรียบร้อย" };
      }

      case "delete": {
        const id = parseInt(formData.get("id") as string);
        if (!id) {
          return { error: "ข้อมูลไม่ถูกต้อง" };
        }
        await deleteProduct(db, id);
        return { success: "ลบสินค้าเรียบร้อย" };
      }

      case "add-price": {
        const productId = parseInt(formData.get("productId") as string);
        const price = parseFloat(formData.get("price") as string);
        const priceLabel = formData.get("priceLabel") as string;
        if (!productId || isNaN(price) || price <= 0) {
          return { error: "ข้อมูลไม่ถูกต้อง" };
        }
        await addProductPrice(db, productId, price, priceLabel || null);
        return { success: "เพิ่มราคาเรียบร้อย" };
      }

      case "update-price": {
        const id = parseInt(formData.get("id") as string);
        const price = parseFloat(formData.get("price") as string);
        const priceLabel = formData.get("priceLabel") as string;
        if (!id || isNaN(price) || price <= 0) {
          return { error: "ข้อมูลไม่ถูกต้อง" };
        }
        await updateProductPrice(db, id, price, priceLabel || null);
        return { success: "แก้ไขราคาเรียบร้อย" };
      }

      case "delete-price": {
        const id = parseInt(formData.get("id") as string);
        if (!id) {
          return { error: "ข้อมูลไม่ถูกต้อง" };
        }
        await deleteProductPrice(db, id);
        return { success: "ลบราคาเรียบร้อย" };
      }

      default:
        return { error: "ไม่พบการกระทำที่ต้องการ" };
    }
  } catch (error) {
    console.error("Product action error:", error);
    return { error: "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" };
  }
}

export default function Products({ loaderData, actionData }: Route.ComponentProps) {
  const { user, products } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [addingPriceProductId, setAddingPriceProductId] = useState<number | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-8 md:px-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full -mr-32 -mt-32 opacity-50"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
                  จัดการสินค้า
                </h1>
                <p className="text-gray-600 text-lg flex items-center gap-2">
                  <span className="text-2xl">📦</span>
                  ยินดีต้อนรับ, <span className="font-semibold text-purple-600">{user.username}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  กลับหน้าหลัก
                </a>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="!inline-flex !items-center !gap-2 !px-6 !py-3 !bg-gradient-to-r !from-purple-500 !to-blue-500 !text-white !rounded-xl hover:!from-purple-600 hover:!to-blue-600 !transition-all !shadow-md hover:!shadow-lg !font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {showAddForm ? "ปิดฟอร์ม" : "เพิ่มสินค้า"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Add Product Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100 animate-slideDown">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">เพิ่มสินค้าใหม่</h2>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="create" />
              <div>
                <label htmlFor="name" className="block mb-2 font-medium text-gray-700">
                  ชื่อสินค้า
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="ระบุชื่อสินค้า"
                  className="w-full text-lg px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  className="!flex-1 !px-6 !py-2 !bg-gradient-to-r !from-purple-500 !to-blue-500 hover:!from-purple-600 hover:!to-blue-600 !text-white !py-3 !px-6 !rounded-xl !font-medium !shadow-md hover:!shadow-lg !transition-all"
                >
                  เพิ่มสินค้า
                </Button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="!inline-flex !items-center !justify-center !px-6 !py-2 !bg-gray-100 !text-gray-700 !rounded-xl hover:!bg-gray-200 !transition-colors !font-medium"
                >
                  ยกเลิก
                </button>
              </div>
            </Form>
          </div>
        )}

        {/* Products List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.length === 0 ? (
            <div className="md:col-span-2 bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-lg">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">ยังไม่มีสินค้า</h3>
              <p className="text-gray-500">คลิก "เพิ่มสินค้า" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col"
              >
                <div className="p-4 h-full flex flex-col">
                  {/* Product Header */}
                  {editingProductId === product.id ? (
                    <Form method="post" className="mb-3">
                      <input type="hidden" name="intent" value="update" />
                      <input type="hidden" name="id" value={product.id.toString()} />
                      <div className="flex gap-2">
                        <Input
                          name="name"
                          type="text"
                          required
                          defaultValue={product.name}
                          className="flex-1 px-3 py-2 border-2 border-purple-300 rounded-lg text-base"
                          autoFocus
                        />
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          isLoading={isSubmitting}
                          className="!bg-green-500 hover:!bg-green-600 !text-white !px-3 !py-2 !rounded-lg"
                        >
                          บันทึก
                        </Button>
                        <button
                          type="button"
                          onClick={() => setEditingProductId(null)}
                          className="!min-h-auto !max-h-auto !inline-flex !items-center !justify-center !text-sm !font-medium !px-3 !py-2 !bg-gray-200 !text-gray-700 !rounded-lg hover:!bg-gray-300 !transition-colors"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </Form>
                  ) : (
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-800 flex-1">{product.name}</h3>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingProductId(product.id)}
                          className="!inline-flex !items-center !justify-center !min-h-auto !max-h-auto !text-sm !px-2 !py-0 !bg-blue-50 !text-blue-600 !rounded-lg hover:!bg-blue-100 !transition-colors"
                          title="แก้ไข"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("คุณต้องการลบสินค้านี้ใช่หรือไม่?")) {
                              const formData = new FormData();
                              formData.append("intent", "delete");
                              formData.append("id", product.id.toString());
                              fetch("/products", { method: "POST", body: formData })
                                .then(() => window.location.reload());
                            }
                          }}
                          className="!inline-flex !items-center !justify-center !min-h-auto !max-h-auto !text-sm !px-2 !py-2 !bg-red-50 !text-red-600 !rounded-lg hover:!bg-red-100 !transition-colors"
                          title="ลบ"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add Price Form */}
                  {addingPriceProductId === product.id && (
                    <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
                      <Form method="post">
                        <input type="hidden" name="intent" value="add-price" />
                        <input type="hidden" name="productId" value={product.id.toString()} />
                        <div className="flex gap-2 flex-wrap">
                          <Input
                            name="price"
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="ราคา"
                            className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <Input
                            name="priceLabel"
                            type="text"
                            placeholder="ป้ายกำกับ"
                            className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                            className="!bg-gradient-to-r !from-purple-500 !to-blue-500 hover:!from-purple-600 hover:!to-blue-600 !text-white !px-3 !py-2 !rounded-lg !text-sm !font-medium"
                          >
                            เพิ่ม
                          </Button>
                          <button
                            type="button"
                            onClick={() => setAddingPriceProductId(null)}
                            className="!min-h-auto !max-h-auto !inline-flex !items-center !justify-center !text-sm !font-medium !px-3 !py-2 !bg-gray-200 !text-gray-700 !rounded-lg hover:!bg-gray-300 !transition-colors"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </Form>
                    </div>
                  )}

                  {/* Prices - One Line */}
                  {product.prices.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        {product.prices.map((price) => (
                          <div
                            key={price.id}
                            className="inline-flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1 border border-gray-200"
                          >
                            {editingPriceId === price.id ? (
                              <Form method="post" className="flex items-center gap-1">
                                <input type="hidden" name="intent" value="update-price" />
                                <input type="hidden" name="id" value={price.id.toString()} />
                                <input type="hidden" name="productId" value={product.id.toString()} />
                                <Input
                                  name="price"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  required
                                  defaultValue={price.price}
                                  className="w-24 px-2 py-1 border-2 border-purple-300 rounded text-sm"
                                  autoFocus
                                />
                                <Input
                                  name="priceLabel"
                                  type="text"
                                  defaultValue={price.price_label || ""}
                                  placeholder="ป้ายกำกับ"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <Button
                                  type="submit"
                                  disabled={isSubmitting}
                                  isLoading={isSubmitting}
                                  className="!bg-green-500 hover:!bg-green-600 !text-white !px-2 !py-1 !rounded !text-xs"
                                >
                                  ✓
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPriceId(null)}
                                  className="!min-h-auto !max-h-auto !text-sm !px-4 !py-1.5 !bg-gray-200 !text-gray-700 !rounded hover:!bg-gray-300 !transition-colors"
                                >
                                  ✕
                                </button>
                              </Form>
                            ) : (
                              <>
                                <span className="font-bold text-gray-800">
                                  {price.price.toLocaleString("th-TH")}
                                </span>
                                {price.price_label && (
                                  <span className="!text-sm !px-2 !py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                    {price.price_label}
                                  </span>
                                )}
                                <button
                                  onClick={() => setEditingPriceId(price.id)}
                                  className="!min-h-auto !max-h-auto !text-sm !p-2 !flex !items-center !justify-center !bg-blue-50 !text-blue-600 !rounded hover:!bg-blue-100 !transition-colors"
                                  title="แก้ไข"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm("คุณต้องการลบราคานี้ใช่หรือไม่?")) {
                                      const formData = new FormData();
                                      formData.append("intent", "delete-price");
                                      formData.append("id", price.id.toString());
                                      fetch("/products", { method: "POST", body: formData })
                                        .then(() => window.location.reload());
                                    }
                                  }}
                                  className="!min-h-auto !max-h-auto !p-2 !flex !items-center !justify-center !bg-red-50 !text-red-600 !rounded hover:!bg-red-100 !transition-colors"
                                  title="ลบ"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Price Button */}
                  {addingPriceProductId !== product.id && (
                    <button
                      onClick={() => setAddingPriceProductId(product.id)}
                      className="!mt-auto !w-full !inline-flex !items-center !justify-center !gap-2 !px-3 !py-2 !bg-gradient-to-r !from-purple-50 !to-blue-50 !text-purple-700 !rounded-lg hover:!from-purple-100 hover:!to-blue-100 !transition-colors !text-sm !font-medium !border-2 !border-dashed !border-purple-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      เพิ่มราคา
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Toast Messages */}
        {actionData?.success && (
          <div className="fixed bottom-4 right-4 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl shadow-lg animate-slideUp flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {actionData.success}
          </div>
        )}
        {actionData?.error && (
          <div className="fixed bottom-4 right-4 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl shadow-lg animate-slideUp flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {actionData.error}
          </div>
        )}
      </div>
    </div>
  );
}
