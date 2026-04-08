import type { Route } from "./+types/banks";
import { redirect, useLoaderData, useNavigation, Form } from "react-router";
import { requireAuth } from "~/lib/session";
import {
  getAllBanks,
  createBank,
  updateBank,
  deleteBank,
} from "~/lib/db";
import type { Bank } from "~/lib/db";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/Card";
import { Heading } from "~/components/Heading";
import { Input } from "~/components/ui/input";
import { Modal, SIZE } from "~/components/ui/modal";
import { THAI_BANKS } from "~/lib/thai-banks";
import { AutoComplete } from "~/components/AutoComplete";

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
        return { success: "เพิ่มบัญชีธนาคารเรียบร้อย" };
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
        return { success: "แก้ไขบัญชีธนาคารเรียบร้อย" };
      }

      case "delete": {
        const id = parseInt(formData.get("id") as string);
        if (!id) {
          return { error: "ข้อมูลไม่ถูกต้อง" };
        }
        await deleteBank(db, id);
        return { success: "ลบบัญชีธนาคารเรียบร้อย" };
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

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);

  const handleEditBank = (bank: Bank) => {
    setSelectedBank(bank);
    setIsEditModalOpen(true);
  };

  const handleDeleteBank = async (id: number) => {
    if (!confirm("คุณต้องการลบบัญชีธนาคารนี้ใช่หรือไม่?")) return;

    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("id", id.toString());

    await fetch("/banks", {
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
              <Heading styleLevel={1}>จัดการธนาคาร</Heading>
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
              + เพิ่มบัญชีธนาคาร
            </Button>
          </div>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-[#64748B] text-white rounded-lg hover:bg-[#475569] transition-colors"
          >
            ← กลับหน้าหลัก
          </a>
        </div>

        {/* Banks List */}
        <div className="space-y-4">
          {banks.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center text-[#64748B] border border-[#E2E8F0]">
              ยังไม่มีบัญชีธนาคาร คลิก "เพิ่มบัญชีธนาคาร" เพื่อเริ่มต้น
            </div>
          ) : (
            banks.map((bank) => (
              <Card
                key={bank.id}
                overrides={{
                  Root: {
                    style: {
                      padding: "24px",
                    },
                  },
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold mb-2">{bank.bank_name}</h3>
                    <p className="text-lg text-[#0F172A] mb-1">
                      เลขบัญชี: {bank.account_number}
                    </p>
                    <p className="text-lg text-[#0F172A]">
                      เจ้าของบัญชี: {bank.owner_name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEditBank(bank)}
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
                      onClick={() => handleDeleteBank(bank.id)}
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
              </Card>
            ))
          )}
        </div>

        {/* Create Bank Modal */}
        <BankFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="เพิ่มบัญชีธนาคารใหม่"
          intent="create"
          isSubmitting={isSubmitting}
          actionData={actionData}
        />

        {/* Edit Bank Modal */}
        {selectedBank && (
          <BankFormModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedBank(null);
            }}
            title="แก้ไขบัญชีธนาคาร"
            intent="update"
            isSubmitting={isSubmitting}
            actionData={actionData}
            initialData={selectedBank}
          />
        )}

        {/* Success/Error Messages */}
        {actionData?.success && (
          <div className="fixed bottom-4 right-4 bg-[#22C55E] text-white px-6 py-3 rounded-lg shadow-lg">
            {actionData.success}
          </div>
        )}
        {actionData?.error && !isCreateModalOpen && !isEditModalOpen && (
          <div className="fixed bottom-4 right-4 bg-[#EF4444] text-white px-6 py-3 rounded-lg shadow-lg">
            {actionData.error}
          </div>
        )}
      </div>
    </div>
  );
}

interface BankFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  intent: "create" | "update";
  isSubmitting: boolean;
  actionData?: { success?: string; error?: string };
  initialData?: Bank;
}

function BankFormModal({
  isOpen,
  onClose,
  title,
  intent,
  isSubmitting,
  actionData,
  initialData,
}: BankFormModalProps) {
  const [selectedBank, setSelectedBank] = useState<string>(
    initialData?.bank_name || ""
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
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
          {title}
        </Heading>
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
            <label className="block mb-2 font-medium text-lg">
              ชื่อธนาคาร
            </label>
            <div className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-lg min-h-[48px] flex items-center">
              {selectedBank || "เลือกธนาคารจากรายการด้านล่าง"}
            </div>
            <BankSelector
              onSelect={(bank) => setSelectedBank(bank.name)}
              selectedBank={selectedBank}
            />
          </div>

          <div>
            <label htmlFor="accountNumber" className="block mb-2 font-medium text-lg">
              เลขบัญชี
            </label>
            <Input
              id="accountNumber"
              name="accountNumber"
              type="text"
              required
              defaultValue={initialData?.account_number}
              placeholder="ระบุเลขบัญชี"
              overrides={{
                Root: { style: { width: "100%" } },
                Input: { style: { fontSize: "18px", minHeight: "48px" } },
              }}
            />
          </div>

          <div>
            <label htmlFor="ownerName" className="block mb-2 font-medium text-lg">
              เจ้าของบัญชี / หมายเหตุ
            </label>
            <Input
              id="ownerName"
              name="ownerName"
              type="text"
              required
              defaultValue={initialData?.owner_name}
              placeholder="ระบุชื่อเจ้าของบัญชี"
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
              onClick={onClose}
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
              disabled={isSubmitting || !selectedBank}
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
              {intent === "create" ? "เพิ่มบัญชีธนาคาร" : "บันทึก"}
            </Button>
          </div>
        </Form>
      </div>
    </Modal>
  );
}

interface BankSelectorProps {
  onSelect: (bank: { name: string }) => void;
  selectedBank: string;
}

function BankSelector({ onSelect, selectedBank }: BankSelectorProps) {
  return (
    <div className="mt-2 space-y-1">
      <p className="text-sm text-gray-600 mb-2">คลิกเลือกจากรายการ:</p>
      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
        {THAI_BANKS.map((bank) => (
          <button
            key={bank.code}
            type="button"
            onClick={() => onSelect(bank)}
            className={`text-left px-3 py-2 rounded border text-base transition-colors ${
              selectedBank === bank.name
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white hover:bg-gray-50 border-gray-300"
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
