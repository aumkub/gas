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

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<(Product & { prices: ProductPrice[] }) | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<ProductPrice | null>(null);

  const handleEditProduct = (product: Product & { prices: ProductPrice[] }) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleAddPrice = (product: Product & { prices: ProductPrice[] }) => {
    setSelectedProduct(product);
    setIsPriceModalOpen(true);
    setSelectedPrice(null);
  };

  const handleEditPrice = (product: Product & { prices: ProductPrice[] }, price: ProductPrice) => {
    setSelectedProduct(product);
    setSelectedPrice(price);
    setIsPriceModalOpen(true);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("คุณต้องการลบสินค้านี้ใช่หรือไม่?")) return;

    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("id", id.toString());

    await fetch("/products", {
      method: "POST",
      body: formData,
    });

    window.location.reload();
  };

  const handleDeletePrice = async (priceId: number) => {
    if (!confirm("คุณต้องการลบราคานี้ใช่หรือไม่?")) return;

    const formData = new FormData();
    formData.append("intent", "delete-price");
    formData.append("id", priceId.toString());

    await fetch("/products", {
      method: "POST",
      body: formData,
    });

    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg p-6 mb-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Heading styleLevel={1}>จัดการสินค้า</Heading>
              <p className="text-[#64748B] mt-2">ยินดีต้อนรับ, {user.username}</p>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              overrides={{
                Root: {
                  style: {
                  },
                },
              }}
            >
              + เพิ่มสินค้า
            </Button>
          </div>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-[#64748B] text-white rounded-lg hover:bg-[#475569] transition-colors"
          >
            ← กลับหน้าหลัก
          </a>
        </div>

        {/* Products List */}
        <div className="space-y-4">
          {products.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center text-[#64748B] border border-[#E2E8F0]">
              ยังไม่มีสินค้า คลิก "เพิ่มสินค้า" เพื่อเริ่มต้น
            </div>
          ) : (
            products.map((product) => (
              <Card
                key={product.id}
                overrides={{
                  Root: {
                    style: {
                      padding: "24px",
                    },
                  },
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold mb-2">{product.name}</h3>
                    <p className="text-[#64748B]">
                      {product.prices.length === 0
                        ? "ยังไม่มีราคา"
                        : `${product.prices.length} ราคา`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEditProduct(product)}
                      overrides={{
                        Root: {
                          style: {
                          },
                        },
                      }}
                    >
                      แก้ชื่อ
                    </Button>
                    <Button
                      onClick={() => handleAddPrice(product)}
                      overrides={{
                        Root: {
                          style: {
                          },
                        },
                      }}
                    >
                      + เพิ่มราคา
                    </Button>
                    <Button
                      onClick={() => handleDeleteProduct(product.id)}
                      kind="destructive"
                      overrides={{
                        Root: {
                          style: {
                          },
                        },
                      }}
                    >
                      ลบ
                    </Button>
                  </div>
                </div>

                {/* Prices */}
                {product.prices.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-lg font-medium">ราคา:</h4>
                    {product.prices.map((price) => (
                      <div
                        key={price.id}
                        className="flex items-center justify-between bg-[#F8FAFC] rounded-lg px-4 py-3"
                      >
                        <div className="flex-1">
                          <span className="text-xl font-medium">
                            {price.price.toLocaleString("th-TH")} บาท
                          </span>
                          {price.price_label && (
                            <span className="ml-3 text-[#64748B]">
                              ({price.price_label})
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEditPrice(product, price)}
                            size="sm"
                            overrides={{
                              Root: {
                                style: {
                                },
                              },
                            }}
                          >
                            แก้ไข
                          </Button>
                          <Button
                            onClick={() => handleDeletePrice(price.id)}
                            kind="ghost"
                            size="sm"
                            overrides={{
                              Root: {
                                style: {
                                },
                              },
                            }}
                          >
                            ลบ
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Create Product Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          size={SIZE.default}
          overrides={{
            Root: {
              style: {
                zIndex: 2000,
              },
            },
          }}
        >
          <div className="p-6">
            <Heading styleLevel={3} className="mb-4">
              เพิ่มสินค้าใหม่
            </Heading>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="create" />

              <div>
                <label htmlFor="name" className="block mb-2 font-medium text-lg">
                  ชื่อสินค้า
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="ระบุชื่อสินค้า"
                  overrides={{
                    Root: { style: { width: "100%" } },
                    Input: { style: { fontSize: "18px", minHeight: "48px" } },
                  }}
                />
              </div>

              {actionData?.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {actionData.error}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  overrides={{
                    Root: {
                      style: {
                        minHeight: "48px",
                        fontSize: "18px",
                      },
                    },
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  overrides={{
                    Root: {
                      style: {
                        minHeight: "48px",
                        fontSize: "18px",
                      },
                    },
                  }}
                >
                  เพิ่มสินค้า
                </Button>
              </div>
            </Form>
          </div>
        </Modal>

        {/* Edit Product Modal */}
        {selectedProduct && (
          <Modal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedProduct(null);
            }}
            size={SIZE.default}
            overrides={{
              Root: {
                style: {
                  zIndex: 2000,
                },
              },
            }}
          >
            <div className="p-6">
              <Heading styleLevel={3} className="mb-4">
                แก้ไขชื่อสินค้า
              </Heading>
              <Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="update" />
                <input type="hidden" name="id" value={selectedProduct.id.toString()} />

                <div>
                  <label htmlFor="edit-name" className="block mb-2 font-medium text-lg">
                    ชื่อสินค้า
                  </label>
                  <Input
                    id="edit-name"
                    name="name"
                    type="text"
                    required
                    defaultValue={selectedProduct.name}
                    placeholder="ระบุชื่อสินค้า"
                    overrides={{
                      Root: { style: { width: "100%" } },
                      Input: { style: { fontSize: "18px", minHeight: "48px" } },
                    }}
                  />
                </div>

                {actionData?.error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {actionData.error}
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setSelectedProduct(null);
                    }}
                    overrides={{
                      Root: {
                        style: {
                          minHeight: "48px",
                          fontSize: "18px",
                        },
                      },
                    }}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    overrides={{
                      Root: {
                        style: {
                          minHeight: "48px",
                          fontSize: "18px",
                        },
                      },
                    }}
                  >
                    บันทึก
                  </Button>
                </div>
              </Form>
            </div>
          </Modal>
        )}

        {/* Add/Edit Price Modal */}
        {selectedProduct && (
          <Modal
            isOpen={isPriceModalOpen}
            onClose={() => {
              setIsPriceModalOpen(false);
              setSelectedProduct(null);
              setSelectedPrice(null);
            }}
            size={SIZE.default}
            overrides={{
              Root: {
                style: {
                  zIndex: 2000,
                },
              },
            }}
          >
            <div className="p-6">
              <Heading styleLevel={3} className="mb-4">
                {selectedPrice ? "แก้ไขราคา" : "เพิ่มราคาใหม่"}
              </Heading>
              <p className="text-gray-600 mb-4">
                สินค้า: {selectedProduct.name}
              </p>
              <Form method="post" className="space-y-4">
                <input
                  type="hidden"
                  name="intent"
                  value={selectedPrice ? "update-price" : "add-price"}
                />
                {selectedPrice && (
                  <input type="hidden" name="id" value={selectedPrice.id.toString()} />
                )}
                <input type="hidden" name="productId" value={selectedProduct.id.toString()} />

                <div>
                  <label htmlFor="price" className="block mb-2 font-medium text-lg">
                    ราคา
                  </label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={selectedPrice?.price}
                    placeholder="ระบุราคา"
                    overrides={{
                      Root: { style: { width: "100%" } },
                      Input: { style: { fontSize: "18px", minHeight: "48px" } },
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="priceLabel" className="block mb-2 font-medium text-lg">
                    ป้ายกำกับ (ไม่ระบุก็ได้)
                  </label>
                  <Input
                    id="priceLabel"
                    name="priceLabel"
                    type="text"
                    defaultValue={selectedPrice?.price_label || ""}
                    placeholder="เช่น ราคาส่ง, ราคาปลีก"
                    overrides={{
                      Root: { style: { width: "100%" } },
                      Input: { style: { fontSize: "18px", minHeight: "48px" } },
                    }}
                  />
                </div>

                {actionData?.error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {actionData.error}
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      setIsPriceModalOpen(false);
                      setSelectedProduct(null);
                      setSelectedPrice(null);
                    }}
                    overrides={{
                      Root: {
                        style: {
                          minHeight: "48px",
                          fontSize: "18px",
                        },
                      },
                    }}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    overrides={{
                      Root: {
                        style: {
                          minHeight: "48px",
                          fontSize: "18px",
                        },
                      },
                    }}
                  >
                    {selectedPrice ? "บันทึก" : "เพิ่มราคา"}
                  </Button>
                </div>
              </Form>
            </div>
          </Modal>
        )}

        {/* Success/Error Messages */}
        {actionData?.success && (
          <div className="fixed bottom-4 right-4 bg-[#22C55E] text-white px-6 py-3 rounded-lg shadow-lg">
            {actionData.success}
          </div>
        )}
        {actionData?.error && !isCreateModalOpen && !isEditModalOpen && !isPriceModalOpen && (
          <div className="fixed bottom-4 right-4 bg-[#EF4444] text-white px-6 py-3 rounded-lg shadow-lg">
            {actionData.error}
          </div>
        )}
      </div>
    </div>
  );
}
