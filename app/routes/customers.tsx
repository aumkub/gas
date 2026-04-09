import type { Route } from "./+types/customers";
import { useNavigation, Form } from "react-router";
import { requireAuth } from "~/lib/session";
import {
  getAllCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "~/lib/db";
import type { Customer } from "~/lib/db";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Heading } from "~/components/Heading";
import { Input } from "~/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faArrowLeft,
  faPlus,
  faPen,
  faTrash,
  faSearch,
  faCheck,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "จัดการลูกค้า" },
    { name: "description", content: "จัดการข้อมูลลูกค้า" },
  ];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env.DB);
  const customers = await getAllCustomers(context.cloudflare.env.DB);
  return { user, customers };
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
          return { error: "กรุณาระบุชื่อลูกค้า" };
        }
        await createCustomer(db, name.trim());
        return { success: "เพิ่มลูกค้าเรียบร้อย", intent: "create" };
      }

      case "update": {
        const id = parseInt(formData.get("id") as string);
        const name = formData.get("name") as string;
        if (!id || !name || !name.trim()) {
          return { error: "ข้อมูลไม่ถูกต้อง" };
        }
        await updateCustomer(db, id, name.trim());
        return { success: "แก้ไขลูกค้าเรียบร้อย", intent: "update", customerId: id };
      }

      case "delete": {
        const id = parseInt(formData.get("id") as string);
        if (!id) {
          return { error: "ข้อมูลไม่ถูกต้อง" };
        }
        await deleteCustomer(db, id);
        return { success: "ลบลูกค้าเรียบร้อย", intent: "delete", deletedCustomerId: id };
      }

      default:
        return { error: "ไม่พบการกระทำที่ต้องการ" };
    }
  } catch (error) {
    console.error("Customer action error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { error: `เกิดข้อผิดพลาด กรุณาลองอีกครั้ง (${message})` };
  }
}

export default function Customers({ loaderData, actionData }: Route.ComponentProps) {
  const { user, customers } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [customerList, setCustomerList] = useState<Customer[]>(customers);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const makeTempId = () => -Date.now();
  const nowIso = () => new Date().toISOString();

  useEffect(() => {
    setCustomerList(customers);
  }, [customers]);

  useEffect(() => {
    if (!actionData) return;

    if (actionData.success) {
      if (actionData.intent === "create") {
        setShowAddForm(false);
      }

      if (actionData.intent === "update") {
        setEditingCustomerId(null);
      }

      if (actionData.intent === "delete" && actionData.deletedCustomerId) {
        setCustomerList((prev) => prev.filter((customer) => customer.id !== actionData.deletedCustomerId));
        if (editingCustomerId === actionData.deletedCustomerId) {
          setEditingCustomerId(null);
        }
      }
    }
  }, [actionData, navigation.state]);

  const filteredCustomers = customerList.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full -mr-32 -mt-32 opacity-50"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FontAwesomeIcon icon={faUsers} className="text-3xl text-white" />
                </div>
                <div>
                  <Heading styleLevel={1} className="text-3xl md:text-4xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    จัดการลูกค้า
                  </Heading>
                  <p className="text-gray-600 text-sm mt-1">
                    จัดการข้อมูลลูกค้าทั้งหมด ({customerList.length} รายการ)
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <a
                  href="/"
                  className="inline-flex items-center justify-center gap-2 !min-h-[44px] !max-h-[44px] px-6 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="h-5 w-5" />
                  กลับหน้าหลัก
                </a>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center justify-center gap-2 !min-h-[44px] !max-h-[44px] px-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  <FontAwesomeIcon icon={faPlus} className="h-5 w-5" />
                  {showAddForm ? "ปิดฟอร์ม" : "เพิ่มลูกค้า"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Add Customer Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100 animate-slideDown"><h2 className="text-2xl font-bold text-gray-800 mb-4">เพิ่มลูกค้าใหม่</h2>
            <Form
              method="post"
              className="space-y-4 flex gap-4 items-end"
              onSubmit={(event) => {
                const formData = new FormData(event.currentTarget);
                const name = (formData.get("name") as string)?.trim();
                if (!name) return;

                setCustomerList((prev) => [
                  ...prev,
                  {
                    id: makeTempId(),
                    name,
                    created_at: nowIso(),
                    updated_at: nowIso(),
                  },
                ]);
                setShowAddForm(false);
              }}
            >
              <input type="hidden" name="intent" value="create" />
              <div className="flex-1 mb-0">
                <label htmlFor="name" className="block mb-2 font-medium text-gray-700">
                  ชื่อลูกค้า
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="ระบุชื่อลูกค้า"
                  className="w-full text-lg px-4 !py-4.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  className="inline-flex items-center justify-center flex-1 !min-h-[44px] !max-h-[44px] bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
                >
                  เพิ่มลูกค้า
                </Button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="inline-flex !text-sm items-center justify-center !min-h-[44px] !max-h-[44px] px-6 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  ยกเลิก
                </button>
              </div>
            </Form>
       
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border border-gray-100">
          <div className="relative">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5"
            />
            <input
              type="text"
              placeholder="ค้นหาลูกค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full !pl-12 !pr-4 !py-1 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent !text-sm"
            />
          </div>
        </div>

        {/* Customers List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {filteredCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchTerm ? "ไม่พบลูกค้าที่ค้นหา" : "ยังไม่มีลูกค้า"}
              </h3>
              <p className="text-gray-500">
                {searchTerm ? "ลองค้นหาด้วยคำสำคัญอื่น" : 'คลิก "เพิ่มลูกค้า" เพื่อเริ่มต้น'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                      ชื่อลูกค้า
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                      สร้างเมื่อ
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                      แก้ไขล่าสุด
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        {editingCustomerId === customer.id ? (
                          <Form
                            method="post"
                            className="flex gap-2 items-center"
                            onSubmit={(event) => {
                              const formData = new FormData(event.currentTarget);
                              const nextName = (formData.get("name") as string | null)?.trim();

                              setEditingCustomerId(null);
                              if (nextName) {
                                setCustomerList((prev) =>
                                  prev.map((item) =>
                                    item.id === customer.id
                                      ? { ...item, name: nextName, updated_at: nowIso() }
                                      : item
                                  )
                                );
                              }
                            }}
                          >
                            <input type="hidden" name="intent" value="update" />
                            <input type="hidden" name="id" value={customer.id.toString()} />
                            <Input
                              name="name"
                              type="text"
                              required
                              defaultValue={customer.name}
                              className="flex-1 px-3 py-2 border-2 border-purple-300 rounded-lg"
                              autoFocus
                            />
                            <Button
                              type="submit"
                              disabled={isSubmitting}
                              isLoading={isSubmitting}
                              className="inline-flex items-center justify-center !min-h-[36px] !max-h-[36px] bg-green-500 hover:bg-green-600 text-white px-3 rounded-lg"
                            >
                              <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
                            </Button>
                            <button
                              type="button"
                              onClick={() => setEditingCustomerId(null)}
                              className="inline-flex items-center justify-center !min-h-[36px] !max-h-[36px] px-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                            </button>
                          </Form>
                        ) : (
                          <span className="font-semibold text-gray-800 text-base">
                            {customer.name}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(customer.created_at).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(customer.updated_at).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {editingCustomerId !== customer.id && (
                            <>
                              <button
                                onClick={() => setEditingCustomerId(customer.id)}
                                className="inline-flex items-center justify-center !min-h-[36px] !max-h-[36px] px-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                title="แก้ไข"
                              >
                                <FontAwesomeIcon icon={faPen} className="h-4 w-4" />
                              </button>
                              <Form
                                method="post"
                                onSubmit={(event) => {
                                  if (!confirm(`คุณต้องการลบลูกค้า "${customer.name}" ใช่หรือไม่?`)) {
                                    event.preventDefault();
                                    return;
                                  }

                                  setCustomerList((prev) => prev.filter((item) => item.id !== customer.id));
                                  if (editingCustomerId === customer.id) {
                                    setEditingCustomerId(null);
                                  }
                                }}
                              >
                                <input type="hidden" name="intent" value="delete" />
                                <input type="hidden" name="id" value={customer.id.toString()} />
                                <button
                                  type="submit"
                                  className="inline-flex items-center justify-center !min-h-[36px] !max-h-[36px] px-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                  title="ลบ"
                                >
                                  <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                                </button>
                              </Form>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Toast Messages */}
        {actionData?.success && (
          <div className="fixed bottom-4 right-4 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl shadow-lg animate-slideUp flex items-center gap-2">
            <FontAwesomeIcon icon={faCheck} className="h-5 w-5" />
            {actionData.success}
          </div>
        )}
        {actionData?.error && (
          <div className="fixed bottom-4 right-4 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl shadow-lg animate-slideUp flex items-center gap-2">
            <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
            {actionData.error}
          </div>
        )}
      </div>
    </div>
  );
}
