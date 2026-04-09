import type { Route } from "./+types/banks";
import { useNavigation, Form } from "react-router";
import { requireAuth } from "~/lib/session";
import {
  getAllBanks,
  createBank,
  updateBank,
  deleteBank,
} from "~/lib/db";
import type { Bank } from "~/lib/db";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { THAI_BANKS } from "~/lib/thai-banks";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faPlus,
  faBuildingColumns,
  faCreditCard,
  faUser,
  faPen,
  faTrash,
  faCheck,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "จัดการธนาคาร" },
    { name: "description", content: "จัดการบัญชีธนาคาร" },
  ];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env.DB);
  const banks = await getAllBanks(context.cloudflare.env.DB);
  return { user, banks };
}

export async function action({ context, request }: Route.ActionArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env.DB);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const db = context.cloudflare.env.DB;

  try {
    switch (intent) {
      case "create": {
        const bankName = formData.get("bankName") as string;
        const accountNumber = formData.get("accountNumber") as string;
        const ownerName = formData.get("ownerName") as string;

        if (!bankName || !accountNumber || !ownerName) {
          return { error: "กรุณาระบุข้อมูลให้ครบถ้วน" };
        }

        await createBank(
          db,
          bankName.trim(),
          accountNumber.trim(),
          ownerName.trim()
        );
        return { success: "เพิ่มบัญชีธนาคารเรียบร้อย", intent: "create" };
      }

      case "update": {
        const id = parseInt(formData.get("id") as string);
        const bankName = formData.get("bankName") as string;
        const accountNumber = formData.get("accountNumber") as string;
        const ownerName = formData.get("ownerName") as string;

        if (!id || !bankName || !accountNumber || !ownerName) {
          return { error: "ข้อมูลไม่ถูกต้อง" };
        }

        await updateBank(
          db,
          id,
          bankName.trim(),
          accountNumber.trim(),
          ownerName.trim()
        );
        return { success: "แก้ไขบัญชีธนาคารเรียบร้อย", intent: "update", bankId: id };
      }

      case "delete": {
        const id = parseInt(formData.get("id") as string);
        if (!id) {
          return { error: "ข้อมูลไม่ถูกต้อง" };
        }
        await deleteBank(db, id);
        return { success: "ลบบัญชีธนาคารเรียบร้อย", intent: "delete", deletedBankId: id };
      }

      default:
        return { error: "ไม่พบการกระทำที่ต้องการ" };
    }
  } catch (error) {
    console.error("Bank action error:", error);
    return { error: "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" };
  }
}

export default function Banks({ loaderData, actionData }: Route.ComponentProps) {
  const { user, banks } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [editingBankId, setEditingBankId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [banksState, setBanksState] = useState(banks);
  const makeTempId = () => -Date.now();
  const nowIso = () => new Date().toISOString();

  useEffect(() => {
    setBanksState(banks);
  }, [banks]);

  useEffect(() => {
    if (!actionData) return;

    if (actionData.success) {
      if (actionData.intent === "create") {
        setShowAddForm(false);
      }

      if (actionData.intent === "update") {
        setEditingBankId(null);
      }

      if (actionData.intent === "delete" && actionData.deletedBankId) {
        setBanksState((prev) => prev.filter((bank) => bank.id !== actionData.deletedBankId));
      }
    }
  }, [actionData, navigation.state]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-8 md:px-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-100 to-blue-100 rounded-full -mr-32 -mt-32 opacity-50"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-3">
                  จัดการธนาคาร
                </h1>
                <p className="text-gray-600 text-lg flex items-center gap-2">
                  <FontAwesomeIcon icon={faBuildingColumns} className="text-2xl text-green-600" />
                  ยินดีต้อนรับ, <span className="font-semibold text-green-600">{user.username}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
                  กลับหน้าหลัก
                </a>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:from-green-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg font-medium cursor-pointer"
                >
                  <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
                  {showAddForm ? "ปิดฟอร์ม" : "เพิ่มบัญชีธนาคาร"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Add Bank Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100 animate-slideDown">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">เพิ่มบัญชีธนาคารใหม่</h2>
            <Form
              method="post"
              className="space-y-3"
              onSubmit={(event) => {
                const formData = new FormData(event.currentTarget);
                const bankName = (formData.get("bankName") as string)?.trim();
                const accountNumber = (formData.get("accountNumber") as string)?.trim();
                const ownerName = (formData.get("ownerName") as string)?.trim();

                if (!bankName || !accountNumber || !ownerName) return;

                setBanksState((prev) => [
                  ...prev,
                  {
                    id: makeTempId(),
                    bank_name: bankName,
                    account_number: accountNumber,
                    owner_name: ownerName,
                    created_at: nowIso(),
                    updated_at: nowIso(),
                  },
                ]);
                setShowAddForm(false);
              }}
            >
              <input type="hidden" name="intent" value="create" />
              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  ชื่อธนาคาร
                </label>
                <input
                  type="hidden"
                  name="bankName"
                  id="addBankName"
                  required
                />
                <div id="addBankDisplay" className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-lg min-h-[48px] flex items-center">
                  เลือกธนาคารจากรายการด้านล่าง
                </div>
                <BankSelector
                  onSelect={(bank) => {
                    const input = document.getElementById("addBankName") as HTMLInputElement;
                    const display = document.getElementById("addBankDisplay");
                    if (input) input.value = bank.name;
                    if (display) display.textContent = bank.name;
                  }}
                  selectedBank=""
                />
              </div>

              <div>
                <label htmlFor="accountNumber" className="block mb-2 font-medium text-gray-700">
                  เลขบัญชี
                </label>
                <Input
                  id="accountNumber"
                  name="accountNumber"
                  type="text"
                  required
                  placeholder="ระบุเลขบัญชี"
                  className="w-full text-lg px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="ownerName" className="block mb-2 font-medium text-gray-700">
                  เจ้าของบัญชี / หมายเหตุ
                </label>
                <Input
                  id="ownerName"
                  name="ownerName"
                  type="text"
                  required
                  placeholder="ระบุชื่อเจ้าของบัญชี"
                  className="w-full text-lg px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  kind="primary"
                  size="sm"
                  className="flex-1 h-12 rounded-xl"
                >
                  เพิ่มบัญชีธนาคาร
                </Button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="inline-flex items-center justify-center h-[48px] min-h-[48px] px-6 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  ยกเลิก
                </button>
              </div>
            </Form>
          </div>
        )}

        {/* Banks List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banksState.length === 0 ? (
            <div className="md:col-span-2 bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-lg">
              <FontAwesomeIcon icon={faBuildingColumns} className="text-6xl text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">ยังไม่มีบัญชีธนาคาร</h3>
              <p className="text-gray-500">คลิก "เพิ่มบัญชีธนาคาร" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            banksState.map((bank) => (
              <div
                key={bank.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="p-6">
                  {editingBankId === bank.id ? (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">แก้ไขบัญชีธนาคาร</h3>
                      <Form
                        method="post"
                        className="space-y-3"
                        onSubmit={(event) => {
                          const formData = new FormData(event.currentTarget);
                          const bankName = (formData.get("bankName") as string)?.trim();
                          const accountNumber = (formData.get("accountNumber") as string)?.trim();
                          const ownerName = (formData.get("ownerName") as string)?.trim();

                          if (!bankName || !accountNumber || !ownerName) return;

                          setBanksState((prev) =>
                            prev.map((item) =>
                              item.id === bank.id
                                ? {
                                    ...item,
                                    bank_name: bankName,
                                    account_number: accountNumber,
                                    owner_name: ownerName,
                                    updated_at: nowIso(),
                                  }
                                : item
                            )
                          );
                          setEditingBankId(null);
                        }}
                      >
                        <input type="hidden" name="intent" value="update" />
                        <input type="hidden" name="id" value={bank.id.toString()} />
                        <div>
                          <label className="block mb-2 font-medium text-gray-700">
                            ชื่อธนาคาร
                          </label>
                          <input
                            type="hidden"
                            name="bankName"
                            id={`editBankName_${bank.id}`}
                            value={bank.bank_name}
                            required
                          />
                          <div id={`editBankDisplay_${bank.id}`} className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-lg min-h-[48px] flex items-center">
                            {bank.bank_name}
                          </div>
                          <BankSelector
                            onSelect={(selectedBank) => {
                              const input = document.getElementById(`editBankName_${bank.id}`) as HTMLInputElement;
                              const display = document.getElementById(`editBankDisplay_${bank.id}`);
                              if (input) input.value = selectedBank.name;
                              if (display) display.textContent = selectedBank.name;
                            }}
                            selectedBank={bank.bank_name}
                          />
                        </div>

                        <div>
                          <label htmlFor="accountNumber" className="block mb-2 font-medium text-gray-700">
                            เลขบัญชี
                          </label>
                          <Input
                            id="accountNumber"
                            name="accountNumber"
                            type="text"
                            required
                            defaultValue={bank.account_number}
                            className="w-full text-lg px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label htmlFor="ownerName" className="block mb-2 font-medium text-gray-700">
                            เจ้าของบัญชี / หมายเหตุ
                          </label>
                          <Input
                            id="ownerName"
                            name="ownerName"
                            type="text"
                            required
                            defaultValue={bank.owner_name}
                            className="w-full text-lg px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                            kind="primary"
                            size="sm"
                            className="flex-1 h-12 rounded-xl"
                          >
                            บันทึก
                          </Button>
                          <button
                            type="button"
                            onClick={() => setEditingBankId(null)}
                            className="inline-flex items-center justify-center h-[48px] min-h-[48px] px-6 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </Form>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                            <FontAwesomeIcon icon={faBuildingColumns} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">{bank.bank_name}</h3>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <FontAwesomeIcon icon={faCreditCard} className="h-5 w-5" />
                          <span className="font-mono font-semibold text-lg">{bank.account_number}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <FontAwesomeIcon icon={faUser} className="h-5 w-5" />
                          <span className="font-medium">{bank.owner_name}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingBankId(bank.id)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors font-medium cursor-pointer"
                        >
                          <FontAwesomeIcon icon={faPen} className="h-4 w-4" />
                          แก้ไข
                        </button>
                        <Form
                          method="post"
                          onSubmit={(event) => {
                            if (!confirm("คุณต้องการลบบัญชีธนาคารนี้ใช่หรือไม่?")) {
                              event.preventDefault();
                              return;
                            }

                            setBanksState((prev) => prev.filter((item) => item.id !== bank.id));
                          }}
                        >
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="id" value={bank.id.toString()} />
                          <button
                            type="submit"
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                            ลบ
                          </button>
                        </Form>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Toast Messages */}
        {actionData?.success && (
          <div className="fixed bottom-4 right-4 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl shadow-lg animate-slideUp flex items-center gap-2">
            <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
            {actionData.success}
          </div>
        )}
        {actionData?.error && (
          <div className="fixed bottom-4 right-4 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl shadow-lg animate-slideUp flex items-center gap-2">
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
            {actionData.error}
          </div>
        )}
      </div>
    </div>
  );
}

interface BankFormProps {
  intent: "create" | "update";
  isSubmitting: boolean;
  actionData?: { success?: string; error?: string; intent?: string };
  initialData?: Bank;
  onCancel?: () => void;
}

function BankForm({ intent, isSubmitting, actionData, initialData, onCancel }: BankFormProps) {
  const [selectedBank, setSelectedBank] = useState<string>(
    initialData?.bank_name || ""
  );

  return (
    <Form method="post" className="space-y-4">
      <input type="hidden" name="intent" value={intent} />
      {initialData && (
        <input type="hidden" name="id" value={initialData.id.toString()} />
      )}

      <input
        type="hidden"
        name="bankName"
        value={selectedBank}
        onChange={(e) => setSelectedBank(e.target.value)}
      />

      <div>
        <label className="block mb-2 font-medium text-gray-700">
          ชื่อธนาคาร
        </label>
        <div className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-lg min-h-[48px] flex items-center">
          {selectedBank || "เลือกธนาคารจากรายการด้านล่าง"}
        </div>
        <BankSelector
          onSelect={(bank) => setSelectedBank(bank.name)}
          selectedBank={selectedBank}
        />
      </div>

      <div>
        <label htmlFor="accountNumber" className="block mb-2 font-medium text-gray-700">
          เลขบัญชี
        </label>
        <Input
          id="accountNumber"
          name="accountNumber"
          type="text"
          required
          defaultValue={initialData?.account_number}
          placeholder="ระบุเลขบัญชี"
          className="w-full text-lg px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="ownerName" className="block mb-2 font-medium text-gray-700">
          เจ้าของบัญชี / หมายเหตุ
        </label>
        <Input
          id="ownerName"
          name="ownerName"
          type="text"
          required
          defaultValue={initialData?.owner_name}
          placeholder="ระบุชื่อเจ้าของบัญชี"
          className="w-full text-lg px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {actionData?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {actionData.error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting || !selectedBank}
          isLoading={isSubmitting}
          kind="primary"
          size="sm"
          className="flex-1 h-12 rounded-xl"
        >
          {intent === "create" ? "เพิ่มบัญชีธนาคาร" : "บันทึก"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            kind="tertiary"
            size="sm"
            className="h-12 px-6 rounded-xl"
          >
            ยกเลิก
          </Button>
        )}
      </div>
    </Form>
  );
}

interface BankSelectorProps {
  onSelect: (bank: { name: string }) => void;
  selectedBank: string;
}

function BankSelector({ onSelect, selectedBank }: BankSelectorProps) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm text-gray-600 mb-2">คลิกเลือกจากรายการ:</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
        {THAI_BANKS.map((bank) => (
          <button
            key={bank.code}
            type="button"
            onClick={() => onSelect(bank)}
            className={`text-left px-3 py-2.5 rounded-lg border text-base transition-all font-medium cursor-pointer ${
              selectedBank === bank.name
                ? "bg-gradient-to-r from-green-500 to-blue-500 text-white border-transparent shadow-md"
                : "bg-white hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 border-gray-300 hover:border-green-400"
            }`}
            style={{ minHeight: "44px" }}
          >
            {bank.name}
          </button>
        ))}
      </div>
    </div>
  );
}
